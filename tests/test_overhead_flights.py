import asyncio
from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch

import aiohttp
import probatio


COMPONENT = Path(__file__).resolve().parents[1] / "custom_components/overhead_flights"
PACKAGE = "overhead_flights_tests"
package = ModuleType(PACKAGE)
package.__path__ = [str(COMPONENT)]
sys.modules[PACKAGE] = package


def load_module(name):
    spec = importlib.util.spec_from_file_location(f"{PACKAGE}.{name}", COMPONENT / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


api = load_module("api")


class Response:
    def __init__(self, status=200, payload=None, headers=None):
        self.status = status
        self.payload = payload
        self.headers = headers or {}

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def json(self, **kwargs):
        await asyncio.sleep(0)
        if isinstance(self.payload, Exception):
            raise self.payload
        return self.payload


class Session:
    def __init__(self, *responses):
        self.responses = list(responses)
        self.requests = []

    def get(self, url, **kwargs):
        self.requests.append((url, kwargs))
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


class FeedTests(unittest.IsolatedAsyncioTestCase):
    def client(self, *responses):
        self.clock = 100
        self.session = Session(*responses)
        return api.ADSBClient(self.session, -37.6, 145.0, clock=lambda: self.clock)

    async def test_no_request_at_creation_and_fixed_coverage(self):
        client = self.client()
        self.assertEqual(self.session.requests, [])
        self.assertFalse(client.snapshot["ok"])
        self.assertTrue(client.url.endswith("/-37.6/145.0/14"))

    async def test_concurrent_viewers_share_request_and_cooldown(self):
        client = self.client(
            Response(payload={"now": 1234, "ac": [{"hex": "abc123"}]}),
            Response(payload={"now": 1264, "ac": []}),
        )
        snapshots = await asyncio.gather(*(client.refresh() for index in range(10)))
        self.assertEqual(len(self.session.requests), 1)
        self.assertTrue(all(snapshot["ok"] for snapshot in snapshots))
        self.clock += 29
        await client.refresh()
        self.assertEqual(len(self.session.requests), 1)
        self.clock += 1
        self.assertEqual((await client.refresh())["now"], 1264)
        self.assertEqual(len(self.session.requests), 2)

    async def test_failure_also_consumes_cooldown(self):
        client = self.client(aiohttp.ClientError("offline"))
        self.assertFalse((await client.refresh())["ok"])
        await client.refresh()
        self.assertEqual(len(self.session.requests), 1)

    async def test_rate_limit_honours_retry_after(self):
        client = self.client(Response(status=429, headers={"Retry-After": "900"}))
        snapshot = await client.refresh()
        self.assertFalse(snapshot["ok"])
        self.assertEqual(snapshot["http_status"], 429)
        self.assertEqual(client.next_request, 1000)
        self.clock = 999
        await client.refresh()
        self.assertEqual(len(self.session.requests), 1)

    async def test_rate_limit_without_header_backs_off(self):
        client = self.client(Response(status=429))
        await client.refresh()
        self.assertEqual(client.next_request, 400)

    async def test_malformed_and_invalid_payloads_are_unavailable(self):
        for payload in [[], {}, {"now": True, "ac": []}, {"now": float("nan"), "ac": []},
                        {"now": -1, "ac": []}, {"now": 123, "ac": {}}, ValueError("not json")]:
            with self.subTest(payload=payload):
                self.assertFalse((await self.client(Response(payload=payload)).refresh())["ok"])

    async def test_invalid_aircraft_records_are_discarded(self):
        client = self.client(Response(payload={"now": 123, "ac": [None, 3, {"hex": "abc123"}]}))
        self.assertEqual((await client.refresh())["ac"], [{"hex": "abc123"}])

    async def test_failure_does_not_reuse_live_aircraft(self):
        client = self.client(Response(payload={"now": 123, "ac": [{"hex": "abc123"}]}), Response(status=503))
        await client.refresh()
        self.clock += 30
        failed = await client.refresh()
        self.assertFalse(failed["ok"])
        self.assertEqual(failed["ac"], [])
        self.assertEqual(failed["http_status"], 503)

    def test_retry_after_http_date_and_invalid_values(self):
        future = format_datetime(datetime.now(timezone.utc) + timedelta(seconds=900), usegmt=True)
        self.assertGreater(api.retry_delay(future, 300), 890)
        for value in [None, "nonsense", "nan", "inf", "-10"]:
            self.assertEqual(api.retry_delay(value, 300), 300)


class PhotoTests(unittest.IsolatedAsyncioTestCase):
    async def test_hex_first_then_registration_and_success_cached(self):
        session = Session(Response(status=404), Response(payload={"photos": [{"id": "test"}]}))
        client = api.PlanespottersClient(session, "contact@example.com")
        self.assertEqual(session.requests, [])
        result = await client.photos("ABC123", "vh-abc")
        self.assertEqual(result["photos"], [{"id": "test"}])
        self.assertTrue(session.requests[0][0].endswith("hex/abc123"))
        self.assertTrue(session.requests[1][0].endswith("reg/VH-ABC"))
        self.assertIn("contact@example.com", session.requests[0][1]["headers"]["User-Agent"])
        await client.photos("ABC123", "vh-abc")
        self.assertEqual(len(session.requests), 2)

    async def test_photo_rate_limit_blocks_next_request(self):
        session = Session(Response(status=429, headers={"Retry-After": "900"}))
        client = api.PlanespottersClient(session, "contact@example.com")
        for index in range(2):
            with self.assertRaises(api.PhotoLookupError):
                await client.photos("ABC123", "VH-ABC")
        self.assertEqual(len(session.requests), 1)

    async def test_invalid_photo_response_is_not_returned(self):
        client = api.PlanespottersClient(Session(Response(payload={"photos": "invalid"})), "contact@example.com")
        with self.assertRaises(api.PhotoLookupError):
            await client.photos("ABC123", "VH-ABC")


class SettingsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        constants = ModuleType("homeassistant.const")
        constants.CONF_LATITUDE = "latitude"
        constants.CONF_LONGITUDE = "longitude"
        validation = ModuleType("homeassistant.helpers.config_validation")
        validation.string = probatio.Coerce(str)
        validation.latitude = probatio.All(probatio.Coerce(float), probatio.Range(min=-90, max=90))
        validation.longitude = probatio.All(probatio.Coerce(float), probatio.Range(min=-180, max=180))
        helpers = ModuleType("homeassistant.helpers")
        helpers.config_validation = validation
        with patch.dict(sys.modules, {"homeassistant": ModuleType("homeassistant"),
                                    "homeassistant.const": constants, "homeassistant.helpers": helpers}):
            cls.validation = load_module("validation")

    def settings(self, **changes):
        return {"latitude": -37.6, "longitude": 145.0, "photo_contact": "contact@example.com", **changes}

    def test_contact_is_required_and_normalized(self):
        schema = self.validation.settings_schema()
        self.assertEqual(schema(self.settings(photo_contact=" contact@example.com "))["photo_contact"], "contact@example.com")
        self.assertEqual(schema(self.settings(photo_contact="https://example.com/contact"))["photo_contact"], "https://example.com/contact")
        for contact in ["", "not an email", "bad\r\nheader@example.com", "http://example.com"]:
            with self.assertRaises(probatio.Invalid):
                schema(self.settings(photo_contact=contact))

    def test_coordinate_range_and_finiteness(self):
        for latitude in [True, float("nan"), float("inf"), -91, 91]:
            with self.assertRaises(probatio.Invalid):
                self.validation.settings_schema()(self.settings(latitude=latitude))
        for longitude in [-181, 181, float("nan")]:
            with self.assertRaises(probatio.Invalid):
                self.validation.settings_schema()(self.settings(longitude=longitude))

    def test_setup_and_reconfigure_forms_are_serializable(self):
        fields = probatio.to_field_list(self.validation.settings_schema(form=True))
        self.assertEqual([field["name"] for field in fields], ["latitude", "longitude", "photo_contact"])
        self.assertTrue(all(field["required"] for field in fields))
        self.assertTrue(all("default" not in field for field in fields))
        fields = probatio.to_field_list(self.validation.settings_schema(self.settings(), form=True))
        self.assertEqual(fields[0]["default"], -37.6)


class SensorBootstrapTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        class CoordinatorEntity:
            def __init__(self, coordinator):
                self.coordinator = coordinator

        sensor = ModuleType("homeassistant.components.sensor")
        sensor.SensorEntity = type("SensorEntity", (), {})
        entity = ModuleType("homeassistant.helpers.entity")
        entity.DeviceInfo = dict
        coordinator = ModuleType("homeassistant.helpers.update_coordinator")
        coordinator.CoordinatorEntity = CoordinatorEntity
        helpers = ModuleType("homeassistant.helpers")
        helpers.entity_registry = ModuleType("entity_registry")
        with patch.dict(sys.modules, {
            "homeassistant": ModuleType("homeassistant"),
            "homeassistant.components": ModuleType("homeassistant.components"),
            "homeassistant.components.sensor": sensor,
            "homeassistant.helpers": helpers,
            "homeassistant.helpers.entity": entity,
            "homeassistant.helpers.update_coordinator": coordinator,
        }):
            cls.sensor = load_module("sensor")

    def make_sensor(self, ok=False, status=0):
        coordinator = SimpleNamespace(
            last_update_success=True,
            data={"ok": ok, "http_status": status, "now": 123 if ok else 0, "ac": []},
        )
        entry = SimpleNamespace(entry_id="entry-test", data={"latitude": -37.6, "longitude": 145.0}, runtime_data=coordinator)
        return self.sensor.OverheadAircraftSnapshot(entry)

    def serialize_attributes(self, entity):
        attributes = dict(entity.capability_attributes or {})
        if entity.available:
            attributes.update(entity.extra_state_attributes)
        return attributes

    def test_unavailable_sensor_keeps_metadata_needed_for_first_refresh(self):
        entity = self.make_sensor()
        self.assertFalse(entity.available)
        attributes = self.serialize_attributes(entity)
        self.assertEqual(attributes["entry_id"], "entry-test")
        self.assertEqual(attributes["latitude"], -37.6)
        self.assertEqual(attributes["longitude"], 145.0)
        self.assertEqual(attributes["http_status"], 0)
        self.assertNotIn("ac", attributes)

    def test_rate_limit_status_survives_unavailability(self):
        entity = self.make_sensor(status=429)
        self.assertFalse(entity.available)
        self.assertEqual(self.serialize_attributes(entity)["http_status"], 429)

    def test_success_exposes_snapshot_and_reconfigure_keeps_new_centre(self):
        entity = self.make_sensor(ok=True, status=200)
        self.assertTrue(entity.available)
        self.assertEqual(self.serialize_attributes(entity)["now"], 123)
        entity.entry.data = {"latitude": 10.0, "longitude": 20.0}
        entity.coordinator.data = {"ok": False, "http_status": 0, "now": 0, "ac": []}
        self.assertEqual(self.serialize_attributes(entity)["latitude"], 10.0)
        self.assertEqual(self.serialize_attributes(entity)["entry_id"], "entry-test")


if __name__ == "__main__":
    unittest.main()
