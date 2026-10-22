# Overhead · Ink

The dashboard is now supplied by the self-contained `overhead_flights` custom
integration. Installation, configuration, privacy, migration and troubleshooting
are documented in [the integration README](../custom_components/overhead_flights/README.md).

Configure fixed coordinates and the Planespotters contact in **Settings →
Devices & services → Overhead Flights → Reconfigure**. The integration owns its
snapshot sensor and serves/registers its bundled card automatically. The active
dashboard is `overhead_flights.yaml`; no REST command, refresh script, YAML
package or separate `/www` JavaScript file is needed.

The frontend retains the compact status header, last-update time, 5–25 km
radius choices (5 km default), untouched aircraft photos with inline credits,
neutral drawing fallback and From/To flanking the aircraft identity.
