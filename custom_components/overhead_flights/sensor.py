from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, NAME, REFRESH_INTERVAL_SECONDS, VERSION


async def async_setup_entry(hass, entry, async_add_entities):
    registry = er.async_get(hass)
    legacy = registry.async_get_entity_id("sensor", "template", "overhead_aircraft_snapshot")
    entity = OverheadAircraftSnapshot(entry)
    if legacy:
        registry.async_remove(legacy)
        entity.entity_id = legacy
    async_add_entities([entity])


class OverheadAircraftSnapshot(CoordinatorEntity, SensorEntity):
    _attr_name = "Overhead Aircraft Snapshot"
    _attr_icon = "mdi:airplane"
    _unrecorded_attributes = frozenset(
        {"ac", "now", "http_status", "latitude", "longitude", "entry_id", "refresh_interval_seconds"}
    )

    def __init__(self, entry):
        super().__init__(entry.runtime_data)
        self.entry = entry
        self._attr_unique_id = f"{entry.entry_id}_snapshot"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=NAME,
            manufacturer="Overhead Flights",
            model="On-demand aircraft dashboard",
            sw_version=VERSION,
        )

    @property
    def available(self):
        return self.coordinator.last_update_success and self.coordinator.data["ok"]

    @property
    def native_value(self):
        return self.coordinator.data["now"] or None

    @property
    def capability_attributes(self):
        return {
            "latitude": self.entry.data["latitude"],
            "longitude": self.entry.data["longitude"],
            "entry_id": self.entry.entry_id,
            "refresh_interval_seconds": REFRESH_INTERVAL_SECONDS,
            "http_status": self.coordinator.data["http_status"],
        }

    @property
    def extra_state_attributes(self):
        data = self.coordinator.data
        return {
            "ac": data["ac"],
            "now": data["now"],
        }
