import logging

from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .api import ADSBClient, PlanespottersClient
from .const import CONF_PHOTO_CONTACT, DOMAIN

_LOGGER = logging.getLogger(__name__)


class OverheadFlightsCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, entry):
        session = async_get_clientsession(hass)
        self.feed = ADSBClient(session, entry.data["latitude"], entry.data["longitude"])
        self.photos = PlanespottersClient(session, entry.data[CONF_PHOTO_CONTACT])
        super().__init__(
            hass,
            _LOGGER,
            config_entry=entry,
            name=DOMAIN,
            update_interval=None,
            update_method=self.feed.refresh,
        )
        self.async_set_updated_data(self.feed.snapshot)
