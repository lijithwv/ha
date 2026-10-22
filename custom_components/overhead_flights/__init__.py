from pathlib import Path

import probatio

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import SOURCE_IMPORT
from homeassistant.const import Platform

from .const import CARD_URL, DOMAIN
from .coordinator import OverheadFlightsCoordinator
from .validation import settings_schema
from .websocket import async_register_commands

CONFIG_SCHEMA = probatio.Schema(
    {probatio.Optional(DOMAIN): settings_schema()}, extra=probatio.ALLOW_EXTRA
)
PLATFORMS = [Platform.SENSOR]


async def async_setup(hass, config):
    await hass.http.async_register_static_paths(
        [StaticPathConfig("/overhead_flights", str(Path(__file__).parent / "frontend"), False)]
    )
    frontend.add_extra_js_url(hass, CARD_URL)
    async_register_commands(hass)
    if DOMAIN in config and not hass.config_entries.async_entries(DOMAIN):
        hass.async_create_task(
            hass.config_entries.flow.async_init(
                DOMAIN, context={"source": SOURCE_IMPORT}, data=config[DOMAIN]
            )
        )
    return True


async def async_setup_entry(hass, entry):
    entry.runtime_data = OverheadFlightsCoordinator(hass, entry)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass, entry):
    if await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        await entry.runtime_data.async_shutdown()
        return True
    return False
