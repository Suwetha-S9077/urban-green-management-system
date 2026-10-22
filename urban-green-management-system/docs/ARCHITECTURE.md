# Architecture Notes

## Layers (backend)

`routes` -> `controllers` -> `services` -> `models`

- **routes**: URL wiring only.
- **controllers**: parse/validate the request, call a service, shape the response.
- **services**: business logic and database access. Controllers never touch Mongoose directly.
- **models**: Mongoose schemas, split into `census/` and `management/` (see below).
- **middleware**: cross-cutting concerns (404, centralized error handler).
- **config**: validated environment variables and the MongoDB connection.

## Data separation policy

| Namespace | Collection prefix | Source | Written by the app? |
| --- | --- | --- | --- |
| Census | `census_` | Bengaluru Tree Census (July 2026), imported by a dedicated import script | **No.** Read-only from API code |
| Management | `mgmt_` | Created by users of this application (e.g. maintenance records, inspections) | Yes |

Management records reference census records by ID; they never copy or mutate census fields.
Every dashboard figure must be computed from the database at request time. No numbers are hardcoded.

## API contract

Base path: `/api/v1`

Success:

```json
{ "success": true, "data": { } }
```

Error:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { } } }
```

The frontend Axios client converts error responses into a typed `ApiClientError`, so UI code only ever handles one error shape.

## Deliberately deferred

Leaflet, Recharts, React Router, authentication, and census models are added in the phases that actually use them.
