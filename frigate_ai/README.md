# Frigate AI activity

The Frigate AI sidebar dashboard searches the latest 40 description updates.
All updates, including routine events, append to `/config/frigate_ai/activity.jsonl`.
The package uses a local shell command to write JSON Lines, so no File integration
setup or additional OpenAI requests are required. The archive is excluded from Git
and is not served through `/local`.

After a configuration check and Home Assistant restart, the package listens on
`frigate/tracked_object_update` and fetches event metadata from
`http://ccab4aaf-frigate:5000`. Only `DoorBell_Cam` and `Garage_Cam` are processed.
Existing camera notifications are unaffected. Important activity also appears in
Home Assistant Activity; routine and other activity only appear in the dashboard
and archive. Event timestamps use Frigate's start time, with receipt time stored
separately. Repeated descriptions for one event are separate archive entries.

Check `sensor.frigate_ai_latest_activity`, `sensor.frigate_ai_recent_history`,
and `input_text.frigate_ai_search` after a new description arrives. Failed metadata
lookups and archive writes appear in Home Assistant's system log.

Search the complete archive from a terminal:

```sh
grep -i 'parcel' /config/frigate_ai/activity.jsonl
grep '"category": "vehicle_interaction"' /config/frigate_ai/activity.jsonl
tail -n 20 /config/frigate_ai/activity.jsonl
```

Keyword classification can misinterpret negations and unfamiliar phrasing.
The archive grows until manually rotated or removed; snapshot links require
the Frigate integration and retained event snapshots.

## Wednesday bin check

`packages/garage_bin_check.yaml` runs `script.garage_bin_check` every Wednesday
at 21:00 in Home Assistant's configured timezone (currently Australia/Sydney,
which matches Melbourne). The dashboard also provides a manual check action.
Both phones receive a confirmation, reminder, or unable-to-verify message.
`sensor.garage_bin_check` records the latest result and check time.

The script takes a new `camera.garage_cam` snapshot and makes one additional
paid OpenAI image-analysis request using the existing Frigate OpenAI key and
`gpt-4o-mini`. No credential is copied into this repository. API failures,
failed/stale snapshots, darkness, occlusion and low confidence result in
`uncertain`, never a successful confirmation.

Edit `frigate_ai/bin_check_settings.json` to adjust the minimum bin count
(two), model, confidence threshold, pickup-area description or
polygon. Polygon coordinates are normalised image coordinates: x goes from
0 left to 1 right; y goes from 0 top to 1 bottom. The initial polygon covers
the area just in front of our driveway, excluding the garden/mailbox frontage,
the far side of the road and the garage storage area. Position alone cannot
prove ownership. The check requires a red lid and the green or yellow lid due
that week, using the next Wednesday's `calendar.bin_collection` entries
(including today when Wednesday, currently at 22:00). It does not guess an
alternating-week anchor. Missing or ambiguous calendar entries prevent a
successful confirmation, but a clearly empty pickup area still reports
`missing`. Unreadable lid colours and obscured pickup areas produce `uncertain`.

The model receives a snapshot with the pickup polygon outlined in red. Code
rejects candidate bins whose estimated bottom-centre ground position lies
outside the polygon. The annotated image is saved privately as
`/config/frigate_ai/bin_check_region.jpg`, the original as
`bin_check_snapshot.jpg`, and the latest result as `bin_check_result.json`.
These files are overwritten each run and excluded from Git. Camera imagery
is sent to OpenAI; vision estimates can still be wrong, especially at night.
