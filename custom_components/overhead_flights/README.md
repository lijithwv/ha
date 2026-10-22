# Overhead Flights

A self-contained Home Assistant custom integration and ink-and-paper Lovelace
card for aircraft near a fixed location. Includes ADSB.lol positions,
Planespotters photos, callsign routes from ADSBdb, and neutral aircraft drawings
when a photo is unavailable. No API keys, image catalogs or cutout worker.

## Install

Requires Home Assistant Core 2026.10 or later. Copy this entire
`overhead_flights` directory to your HA configuration's `custom_components/`
directory, then restart Home Assistant.

1. Open **Settings → Devices & services → Add integration → Overhead Flights**.
2. Enter fixed latitude and longitude. A nearby public landmark is fine; the
   integration never reads or polls your Home zone.
3. Enter a real contact email or HTTPS contact URL. Planespotters requires this
   in the server-side API User-Agent. Setup does not contact either provider.
4. Add this manual card to any dashboard:

```yaml
type: custom:overhead-flights-card
entity: sensor.overhead_aircraft_snapshot
```

The integration serves and registers its bundled frontend module automatically;
no `/www` copy, Lovelace resource, REST command, script or YAML package is needed.
If HA assigned a different sensor entity ID, use that ID in the card. A complete
example dashboard is in `examples/dashboard.yaml`.

Change the fixed location or contact using **Reconfigure** on the integration's
menu in Devices & services. Removing the integration unloads the sensor. Only
one integration instance is currently supported, with any number of viewers.

## Behaviour

- The frontend radius dropdown offers **5, 10, 15, 20 and 25 km**, starting at
  **5 km**. Optional card `radius_km` sets a different initial choice. Choices
  stay local to each card and reset on reload; they do not trigger API calls.
- A shared feed covers 14 nautical miles (about 25.9 km). The card applies the
  exact selected radius, excludes ground aircraft, drops positions older than
  90 seconds, and sorts nearest first.
- Positions refresh only when a card is connected, within the viewport and in
  a visible browser tab. There is no startup fetch or scheduled background
  polling. An already-started request can finish after the card is hidden.
- Concurrent viewers share a server-side 30-second cooldown, including failed
  requests. HTTP 429 respects `Retry-After`, with at least five minutes of
  backoff. The observed ADSB.lol quota is 500 requests/day: about four hours of
  continuous viewing at 30-second intervals can exhaust it. This integration
  does not bypass that quota or switch providers.
- Photo matching tries Mode-S hex then registration. Metadata is cached for an
  hour; negative matches for five minutes. There is no on-disk image cache.
  Photographer credit links to the original. Photos are displayed unchanged,
  without filters, overlays, background removal or upscaling. They may show
  older paintwork; side views cannot be guaranteed by the photo API.
- Routes are browser-side callsign database lookups, cached for an hour, not
  verified flight plans. Missing routes remain Unknown with a status note.
- The snapshot sensor exposes `ac`, `now`, `http_status`, `latitude`, `longitude`
  and `entry_id` for the card. High-volume snapshot attributes are excluded
  from Recorder. Stale or unavailable feeds are not labelled live.
- Location, entry ID and transport status remain available as capability
  attributes even before the first successful request or after reconfiguration.
  A configured card can therefore bootstrap a visible-only refresh while the
  snapshot sensor itself is unavailable, without startup polling.

## Privacy

While the dashboard requests positions, the configured fixed coordinates go
to ADSB.lol. Aircraft identifiers and the configured contact go to
Planespotters. Aircraft callsigns go to ADSBdb for route lookups. Photos load
from Planespotters' image CDN in the browser. The contact stays out of frontend
code and WebSocket responses. HA stores integration configuration privately;
do not publish `.storage`. Downloadable diagnostics redact coordinates and
contact and omit aircraft records.

## Migrating the earlier YAML dashboard

For a one-time import, use the following configuration (directly or in an HA
package), keeping your existing coordinates and contact:

```yaml
overhead_flights:
  latitude: !secret overhead_latitude
  longitude: !secret overhead_longitude
  photo_contact: !secret overhead_planespotters_contact
```

Remove the previous REST command, template snapshot sensor, refresh script and
manual `frontend.extra_module_url` registration before restarting. The import
creates a normal UI-managed config entry. After it appears in Devices &
services, remove the import YAML; settings remain in the entry. The integration
migrates the legacy template snapshot's entity ID if it exists.

Use the minimal card above: remove `refresh_script`, `latitude` and `longitude`
from the old card configuration. Keep other card settings if desired. Remove
the old `www/overhead-flights-card.js` copy and hard-refresh open browsers so
they do not keep the previous custom element loaded.

## Development

Python source is split into configuration/validation, API clients, coordinator,
sensor, WebSocket handlers and diagnostics. Presentation lives in
`frontend/overhead-flights-card.js`. `strings.json` and `translations/en.json`
provide the setup/reconfiguration forms. There are no extra runtime pip
requirements beyond Home Assistant.

This folder is the installable unit; no repository URL or HACS publishing
metadata is invented. For a release repository, put it under
`custom_components/overhead_flights/` and publish that repository separately.

From the HA configuration repository, run the focused backend tests with:

```sh
python3 -m pip install aiohttp probatio
python3 -m unittest discover -s tests -p test_overhead_flights.py -v
node --check custom_components/overhead_flights/frontend/overhead-flights-card.js
node --test tests/test_overhead_flights_card.cjs
ha core check
```

Tests use mocked HTTP responses and never contact a flight provider.
