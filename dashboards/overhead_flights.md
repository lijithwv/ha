# Overhead · Ink

The dashboard searches for real aircraft photos and renders them with reduced
colour levels, ink outlines and a stippled texture in the browser. Aircraft
paintwork and markings come from the photo rather than a generated airline logo.
Photos retain their photographic background; this is not background removal.

The configured `photo_source: planespotters` tries Planespotters and Wikimedia
Commons aircraft photos with a small photographer credit linked to the original.
Commons photos also show their Creative Commons licence and identify the ink
treatment. No photo service API key is required. Commons searches remain
available when Planespotters rejects a request or has no matching photo.

Matching order is exact registration, the same airline and aircraft type, any
airline with the same aircraft type, then the existing SVG illustration. The
substitute photo is labelled representative and notes when the airline may differ.
Even registration-matched photos may predate a repaint. Airline fallback is
inferred from the flight's three-letter ICAO callsign prefix. Unknown airlines
skip the airline-specific search but still get a type-only search. Known type
codes expand to model names; other valid type codes are searched as supplied.

Lookups are cached per browser session (successful results for six hours, no
match for ten minutes), deduplicated and limited to three concurrent aircraft
lookups. Failed image loads try other matching images before the drawing.

Planespotters offers registration/transponder lookups; Commons searches provide
the same-airline/type and any-airline/type fallbacks without relying on aircraft
currently airborne. Optional `photo_source: public-domain`
instead searches Wikimedia Commons for public-domain or CC0 photographs without
an attribution requirement. Its coverage is limited; it does not fall back to
Planespotters automatically.

Optional `photo_source: catalog` uses your supplied or separately licensed
photos. A `photo_catalog` list can also supplement either online source:

```yaml
photo_catalog:
  - registration: VH-EXAMPLE
    airline: VOZ
    type: B738
    url: /local/aircraft/vh-example.jpg
```

The airline is an ICAO callsign prefix and the type is an ICAO aircraft code.
The file must be supplied separately and permit this use. Catalog entries are
checked before online photos. Only HTTPS or `/local/` image URLs are accepted.

Aircraft type codes select a representative airframe family: narrowbody,
widebody, double-deck, four-engine, business jet, turboprop, light aircraft or
helicopter. The flight's three-letter ICAO airline callsign prefix selects the
livery. Unknown airlines use neutral colours. These are stylised illustrations,
not exact aircraft profiles, verified current liveries or live photographs.

Airline palettes are defined in `www/overhead-flights-card.js` in `inkLiveries`.
Airframe selection is defined in `inkAirframe`. Both can be extended without
adding image files or network requests.

The ADS-B.lol feed polls the approved fixed centre every 30 seconds. Its URL in
`packages/overhead_flights.yaml` and the card coordinates in
`dashboards/overhead_flights.yaml` must match. The card excludes ground traffic,
positions older than 90 seconds and aircraft beyond exactly 20 km. Aircraft are
sorted nearest first. Delayed or missing data displays an explicit status.

After changing the module URL in `configuration.yaml`, restart Home Assistant
and reload the dashboard. Hard-refresh the browser if it retains the old module.
