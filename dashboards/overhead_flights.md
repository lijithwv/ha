# Overhead · Ink

Photos come directly from the Planespotters aircraft-photo API, requested by
Mode-S hex code and then registration. There is no general image search, no
Wikimedia fallback, and no downloaded image catalog. If neither identifier has
a usable photograph, the neutral aircraft drawing is displayed.

The browser asks the authenticated `overhead_flights/photo` HA WebSocket command.
The `custom_components/overhead_flights` adapter calls Planespotters with the
application User-Agent and contact required by its API. The contact is stored
in `secrets.yaml` as `overhead_planespotters_contact` and referenced in the
package configuration; it is never included in frontend code or photo responses.
The configured `photo_source` is `planespotters`.

Photographer credit links to the original Planespotters photo. Photos are
displayed as received, including their backgrounds, without ink filters,
colour changes, dot overlays or background removal. Images are scaled down to
fit the card when necessary, never enlarged beyond their native dimensions.
Wider thumbnails are preferred, but this API does not identify camera angle, so side
views cannot be guaranteed. Photos are library images of the matched aircraft,
not live camera images, and may predate a repaint.

The adapter serializes provider requests, shares successful metadata for one
hour across browsers, and backs off on provider errors. No photo requests run
at startup. The card retains browser-memory lookup results and retries failures
after a minute. These photo calls do not consume the ADSB.lol position quota.

Full aircraft names are listed in `AIRCRAFT_TYPE_NAMES` and displayed alongside
their ICAO type code. From/To values come from ADSBdb's callsign route lookup,
cached for one hour. This is database route information, not a verified live
flight plan; absent routes display Unknown. Route lookups begin only while the
card is visible and do not consume the ADSB.lol position-feed quota.

Aircraft type codes select a representative airframe family: narrowbody,
widebody, double-deck, four-engine, business jet, turboprop, light aircraft or
helicopter. All fallback drawings use neutral colours with no airline names,
tail logos or airline paintwork. They are generic illustrations, not exact
aircraft profiles or live photographs.

Airframe selection is defined in `getAircraftFamily`. Fallback drawings do not
use the airline code.

The ADS-B.lol feed is requested only while this card is connected, in the
viewport and in a visible browser tab. Hiding the tab, scrolling the card out
of view or leaving the dashboard stops new feed requests. No REST polling runs
at startup or in the background. An already-started request can still finish.

`requestFeedRefresh` calls `script.overhead_flights_refresh`. The script fetches
data through `rest_command.overhead_flights_fetch` and publishes an event to
`sensor.overhead_aircraft_snapshot`. Its single-run mode and 30-second cooldown
share the request budget across all viewers, including failures. The cooldown
ends without fetching again; a visible dashboard must request the next update.
The card checks visibility every 15 seconds and on visibility changes.

Only visible dashboards request updates. At 30-second intervals, about four
hours of continuous viewing can exhaust the observed 500-request daily quota
and produce HTTP 429 responses. An exhausted quota still needs to reset before
the feed can recover; the card does not label old data as live. The retired
`sensor.overhead_aircraft_feed` is no longer used by this dashboard.

## Search radius

Use the Within dropdown in the header to select 5, 10, 15, 20 or 25 km.
It starts at 5 km; an optional card `radius_km` setting changes
that initial value. Each card keeps its own selection until it is reloaded or
reconfigured. Other viewers are unaffected.

The shared feed covers all radius options (14 nautical miles, about 25.9 km,
at the provider), with the card applying the exact selected kilometre limit.
Changing the dropdown immediately filters the current snapshot locally,
without an extra feed request or a change to the 30-second refresh cadence.
The maximum selectable radius is 25 km.

The feed URL in
`packages/overhead_flights.yaml` and the card coordinates in
`dashboards/overhead_flights.yaml` must match. The card excludes ground traffic,
positions already over 90 seconds old when fetched, and aircraft beyond the
selected radius. Positions are retained for at most 90 seconds. Aircraft are sorted
nearest first. Delayed or
missing data displays an explicit status. Keep `update_interval_seconds` aligned
with the cooldown in `scripts/overhead_flights.yaml` when changing cadence.

## Card structure

`CARD_STYLES` holds presentation separately from logic.
Named helpers handle safe text, identifiers and distance calculations.
`OverheadPhotoService` owns photo matching, caching and request scheduling.
`getViewModel` handles feed freshness and dashboard state. The card's
`renderHeader`, `renderArtwork`, `renderPhotoCredit`,
`renderEmptyState` and `renderFooter` methods render individual parts; `render`
assembles them and `bindImageErrors` handles broken images.

The compact header displays the feed status and nearest-first ordering, the search radius and the feed's last
update time in Home Assistant's configured timezone. There is no separate
title, subtitle, wall clock or summary statistics strip.

Photo captions and photographer links share one line when space permits.
From and To flank the aircraft identity on larger screens; narrow screens put
the identity above the route endpoints. Successful route lookups have no extra
source label; missing routes still explain the lookup status. Aircraft cards
retain distance and bearing without a redundant nearest-aircraft heading.

After changing the module URL in `configuration.yaml`, restart Home Assistant
and reload the dashboard. Hard-refresh the browser if it retains the old module.
