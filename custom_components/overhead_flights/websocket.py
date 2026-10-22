import re

import probatio

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.helpers import config_validation as cv

from .api import PhotoLookupError
from .const import DOMAIN


def async_register_commands(hass):
    websocket_api.async_register_command(hass, websocket_photo)
    websocket_api.async_register_command(hass, websocket_refresh)


def get_coordinator(hass, connection, message):
    entry = hass.config_entries.async_get_entry(message["entry_id"])
    if entry is None or entry.domain != DOMAIN or entry.state != ConfigEntryState.LOADED:
        connection.send_error(message["id"], "not_loaded", "Overhead Flights is not loaded")
        return None
    return entry.runtime_data


@websocket_api.websocket_command(
    {
        "type": "overhead_flights/refresh",
        probatio.Required("entry_id"): cv.string,
    }
)
@websocket_api.async_response
async def websocket_refresh(hass, connection, message):
    coordinator = get_coordinator(hass, connection, message)
    if coordinator is None:
        return
    await coordinator.async_refresh()
    connection.send_result(message["id"], {"ok": coordinator.data["ok"]})


@websocket_api.websocket_command(
    {
        "type": "overhead_flights/photo",
        probatio.Required("entry_id"): cv.string,
        probatio.Optional("hex", default=""): cv.string,
        probatio.Optional("registration", default=""): cv.string,
    }
)
@websocket_api.async_response
async def websocket_photo(hass, connection, message):
    coordinator = get_coordinator(hass, connection, message)
    if coordinator is None:
        return
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
        result = await coordinator.photos.photos(aircraft_hex, registration)
    except PhotoLookupError as error:
        connection.send_error(message["id"], "photo_lookup_failed", str(error))
        return
    connection.send_result(message["id"], result)
