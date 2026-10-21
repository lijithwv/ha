import asyncio
import re
from time import monotonic

import aiohttp
import probatio

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.aiohttp_client import async_get_clientsession

DOMAIN = "overhead_flights"
CONFIG_SCHEMA = probatio.Schema(
    {
        DOMAIN: probatio.Schema(
            {probatio.Required("photo_contact"): cv.string}
        )
    },
    extra=probatio.ALLOW_EXTRA,
)


class PhotoLookupError(Exception):
    pass


class PlanespottersClient:
    def __init__(self, session, contact):
        self.session = session
        self.user_agent = f"OverheadFlightsHomeAssistant/1.0 (+{contact})"
        self.cache = {}
        self.lock = asyncio.Lock()
        self.retry_after = 0

    async def photos(self, aircraft_hex, registration):
        paths = []
        if aircraft_hex:
            paths.append(f"hex/{aircraft_hex.lower()}")
        if registration:
            paths.append(f"reg/{registration.upper()}")

        for path in paths:
            async with self.lock:
                cached = self.cache.get(path)
                if cached and cached[0] > monotonic():
                    photos = cached[1]
                else:
                    if monotonic() < self.retry_after:
                        raise PhotoLookupError("Planespotters is temporarily unavailable; retry shortly")
                    photos = await self._request(path)
                    lifetime = 3600 if photos else 300
                    self.cache[path] = (monotonic() + lifetime, photos)
                    if len(self.cache) > 500:
                        self.cache.pop(next(iter(self.cache)))
            if photos:
                return {"photos": photos, "hex": aircraft_hex, "registration": registration}
        return {"photos": [], "hex": aircraft_hex, "registration": registration}

    async def _request(self, path):
        try:
            async with self.session.get(
                f"https://api.planespotters.net/pub/photos/{path}",
                headers={"User-Agent": self.user_agent},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as response:
                if response.status == 404:
                    return []
                if response.status != 200:
                    self.retry_after = monotonic() + 60
                    if response.status == 429:
                        retry = response.headers.get("Retry-After", "60")
                        if retry.isdigit():
                            self.retry_after = monotonic() + max(60, int(retry))
                    raise PhotoLookupError(f"Planespotters returned HTTP {response.status}")
                payload = await response.json(content_type=None)
                photos = payload.get("photos") if isinstance(payload, dict) else None
                if not isinstance(photos, list):
                    raise PhotoLookupError("Planespotters returned an invalid photo response")
                return [photo for photo in photos[:6] if isinstance(photo, dict)]
        except (aiohttp.ClientError, TimeoutError, ValueError) as error:
            self.retry_after = monotonic() + 60
            raise PhotoLookupError("Could not connect to Planespotters") from error


async def async_setup(hass: HomeAssistant, config):
    contact = config[DOMAIN]["photo_contact"].strip()
    valid_contact = re.fullmatch(r"[^\s@()]+@[^\s@()]+\.[^\s@()]+", contact) or re.fullmatch(
        r"https://[^\s()]+", contact
    )
    if not valid_contact:
        return False
    hass.data[DOMAIN] = PlanespottersClient(async_get_clientsession(hass), contact)
    websocket_api.async_register_command(hass, websocket_photo)
    return True


@websocket_api.websocket_command(
    {
        "type": "overhead_flights/photo",
        probatio.Optional("hex", default=""): cv.string,
        probatio.Optional("registration", default=""): cv.string,
    }
)
@websocket_api.async_response
async def websocket_photo(hass, connection, message):
    aircraft_hex = message["hex"].strip().upper()
    registration = message["registration"].strip().upper()
    if aircraft_hex and not re.fullmatch(r"[0-9A-F]{6}", aircraft_hex):
        connection.send_error(message["id"], "invalid_aircraft", "Invalid aircraft hex code")
        return
    if registration and not re.fullmatch(r"[A-Z0-9-]{2,12}", registration):
        connection.send_error(message["id"], "invalid_aircraft", "Invalid registration")
        return
    if not aircraft_hex and not registration:
        connection.send_error(message["id"], "invalid_aircraft", "An aircraft identifier is required")
        return
    try:
        result = await hass.data[DOMAIN].photos(aircraft_hex, registration)
    except PhotoLookupError as error:
        connection.send_error(message["id"], "photo_lookup_failed", str(error))
        return
    connection.send_result(message["id"], result)
