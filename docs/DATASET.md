# Dataset: Bengaluru Tree Census (July 2026)

Source file (never modified): `backend/data/raw/bbmp_tree_census_july_2026.geojson`
(227.6 MB, GeoJSON FeatureCollection). Structure below comes from the inspection report, not from assumptions.

## What the source contains

- **702,109 features**, all with `Point` geometry as `[longitude, latitude]`.
- No missing geometry, no malformed/non-numeric/out-of-range coordinates, no (0,0), no swapped lat/lon.
- All points lie in longitude 77.4601552 to 77.7756399, latitude 12.8493939 to 13.141673.
- No fully identical records. 72,926 records share coordinates with another record (valid, kept).

| Source property | Type in source | Notes |
| --- | --- | --- |
| `OBJECTID` | number | Unique in the inspected data (min 9, max 729839). Stored as a source identifier; MongoDB `_id` is separate. |
| `KGISTreeID` | string | High cardinality, **2,502 repeated values**: not unique. |
| `KGISCode` | string | **688,657 repeated values**: not unique. |
| `KGISVillageID` | number | Grouping code (about 332 distinct values): not unique. |
| `DepartmentCode` | string | Numeric-looking; no repeats seen, but not treated as globally unique. |
| `WardNumber` | string | Numeric-looking text, 144 distinct values. Kept as text. |
| `TreeName` | string | 236 distinct species/categories; `"Others"` is the largest category (a category, not "missing"). |
| `Status` | number or null | 1 = 683,461; 0 = 35; null = 18,613. **Meaning is not documented**, so none is assumed. |

## What the source does NOT contain

Height, diameter, girth, age, condition, health, canopy, carbon, or any measurement. No such field is
modelled, filtered, or reported, and no indicator that would need them is fabricated.

## MongoDB storage (`tree_census`)

Source fields keep their original names (`OBJECTID`, `KGISTreeID`, ...) plus:

- `location`: GeoJSON `Point`, `[longitude, latitude]`
- `importedAt`, `sourceFile`: import metadata

Cleaning is limited to: trimming whitespace, storing empty strings as `null`, and skipping structurally
invalid records (missing/non-Point geometry, bad coordinates, missing `OBJECTID`). Values are never merged,
renamed, case-folded or derived. `Status` null is kept as null, separate from 0.

## Indexes

| Index | Why |
| --- | --- |
| `OBJECTID` **unique** | 0 repeats in the data; import identity key (makes re-imports idempotent) |
| `location` 2dsphere | bounding-box / map-area queries |
| `WardNumber`, `TreeName`, `Status` | API filters and analytics |
| `KGISTreeID`, `KGISCode`, `DepartmentCode` (non-unique) | identifier lookups via `/trees/search` |
| `KGISVillageID` (not indexed) | about 332 distinct values across 700k records, no API uses it |

## Limitations

- `GET /analytics/condition` returns 404 `FIELD_NOT_IN_SOURCE_DATASET`: there is no condition field.
- Meaning of `Status` 0/1 is unknown until source documentation is obtained.
- Species names are used exactly as they appear in the source; spelling variants (if any) are not merged.
