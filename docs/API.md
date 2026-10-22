# API Reference (Phase 2)

Base URL: `http://localhost:5000/api/v1`. Responses: `{ "success": true, "data": ..., "meta": ... }`
or `{ "success": false, "error": { "code", "message", "details?" } }`.

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | API and database status |
| `GET /trees` | Paginated list. Params: `page` (1+), `limit` (1-200, default 50), `wardNumber`, `treeName` (exact), `status` (`0`\|`1`\|`null`), `bbox` (`minLon,minLat,maxLon,maxLat`) |
| `GET /trees/search` | Same filters and pagination, plus `q` (case-insensitive species-name contains), `objectId`, `kgisTreeId`, `kgisCode`, `departmentCode` (exact). At least one of these five is required |
| `GET /trees/:id` | One record by MongoDB `_id` (24-char hex). 404 `TREE_NOT_FOUND` if absent |
| `GET /dashboard` | Totals, status counts, repeated-coordinate figures, top 10 species and wards, data notes |
| `GET /analytics/species` | `treeName`, `count`, `percentage` for every category. Optional `limit` |
| `GET /analytics/wards` | `wardNumber`, `count`, `percentage`. Optional `limit`, `sort=count` (default) or `sort=ward` (numeric order) |
| `GET /analytics/status` | `status` 1, 0, null with `count`, `percentage` |
| `GET /analytics/condition` | Always 404 `FIELD_NOT_IN_SOURCE_DATASET` (no such field in the source) |

Unknown query parameters are rejected with 400 so typos never silently return unfiltered data.
Percentages are rounded to 2 decimals. Dashboard/analytics aggregations are computed from MongoDB and
cached in memory for `ANALYTICS_CACHE_TTL_SECONDS` (default 600).

## Notes

- Results are ordered by `objectId` for stable pagination. Very deep pages (large `skip`) get slower; use filters or `bbox`.
- `limit` is capped at 200. A map view that needs more points should get a dedicated endpoint in a later phase.
- `repeatedCoordinateRecords` = records whose exact coordinates already appear on another record.
