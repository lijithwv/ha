from homeassistant.components.diagnostics import async_redact_data

from .const import CONF_PHOTO_CONTACT


async def async_get_config_entry_diagnostics(hass, entry):
    data = entry.runtime_data.data
    return {
        "entry": async_redact_data(
            entry.as_dict(), {CONF_PHOTO_CONTACT, "latitude", "longitude"}
        ),
        "feed": {
            "ok": data["ok"],
            "http_status": data["http_status"],
            "aircraft_count": len(data["ac"]),
        },
    }
