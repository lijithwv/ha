import asyncio
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import math
from time import monotonic

import aiohttp

from .const import FEED_RADIUS_NM, REFRESH_INTERVAL_SECONDS


def retry_delay(value, minimum):
    try:
        seconds = float(value)
    except (TypeError, ValueError):
        try:
            seconds = (parsedate_to_datetime(value) - datetime.now(timezone.utc)).total_seconds()
        except (TypeError, ValueError, OverflowError):
            return minimum
    return max(minimum, seconds) if math.isfinite(seconds) else minimum


class ADSBClient:
    def __init__(self, session, latitude, longitude, clock=monotonic):
        self.session = session
        self.url = f"https://api.adsb.lol/v2/point/{latitude}/{longitude}/{FEED_RADIUS_NM}"
        self.clock = clock
        self.lock = asyncio.Lock()
        self.next_request = 0
        self.snapshot = {"ok": False, "ac": [], "now": 0, "http_status": 0}

    async def refresh(self):
        async with self.lock:
            if self.clock() < self.next_request:
                return self.snapshot
            self.next_request = self.clock() + REFRESH_INTERVAL_SECONDS
            status = 0
            try:
                async with self.session.get(
                    self.url, timeout=aiohttp.ClientTimeout(total=20)
                ) as response:
                    status = response.status
                    if status == 429:
                        self.next_request = self.clock() + retry_delay(
                            response.headers.get("Retry-After"), 300
                        )
                    if status == 200:
                        payload = await response.json(content_type=None)
                        timestamp = payload.get("now") if isinstance(payload, dict) else None
                        if (
                            isinstance(payload, dict)
                            and isinstance(payload.get("ac"), list)
                            and isinstance(timestamp, (int, float))
                            and not isinstance(timestamp, bool)
                            and math.isfinite(timestamp)
                            and timestamp > 0
                        ):
                            self.snapshot = {
                                "ok": True,
                                "ac": [aircraft for aircraft in payload["ac"] if isinstance(aircraft, dict)],
                                "now": timestamp,
                                "http_status": status,
                            }
                            return self.snapshot
            except (aiohttp.ClientError, TimeoutError, ValueError):
                pass
            self.snapshot = {**self.snapshot, "ok": False, "ac": [], "http_status": status}
            return self.snapshot


class PhotoLookupError(Exception):
    pass


class PlanespottersClient:
    def __init__(self, session, contact):
        self.session = session
        self.user_agent = f"OverheadFlightsHomeAssistant/2.0 (+{contact})"
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

