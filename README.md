# Urban Green Management System

## Purpose

Cities need a digital way to manage parks, urban forests, green belts, tree inventories and
environmental performance indicators. This project provides a web application for doing that,
using the **Bengaluru Tree Census (July 2026)** as its primary data source.

Two principles shape the whole codebase:

1. **Real data only.** Dashboard figures are computed from the database at request time. Nothing is hardcoded and no statistics are invented.
2. **Census data and management data are kept separate.** Census records are read-only reference data (`census_*` collections). Everything the application creates itself lives in `mgmt_*` collections and references census records by ID. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

> **Status: Phase 2 (real census data + API).** The census GeoJSON can be imported into MongoDB and is
> served through REST endpoints (trees, search, dashboard, analytics). No frontend features beyond the
> connection check exist yet. See [docs/DATASET.md](docs/DATASET.md) and [docs/API.md](docs/API.md).

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Axios |
| Backend | Node.js, Express 5, TypeScript, Mongoose, Zod (env validation) |
| Database | MongoDB |
| Tooling | ESLint (flat config), Prettier, EditorConfig |
| Planned (added when used) | Leaflet + OpenStreetMap (maps), Recharts (charts), React Router |

## Folder structure

```
urban-green-management-system/
├── README.md
├── docs/ARCHITECTURE.md        Layering, data-separation policy, API contract
├── backend/
│   ├── .env.example
│   ├── data/raw/           source GeoJSON (read-only, git-ignored)
│   ├── scripts/            inspect-geojson, import-tree-census, check-api
│   └── src/
│       ├── config/             env validation, MongoDB connection
│       ├── controllers/        request/response handling
│       ├── middleware/         404 handler, centralized error handler
│       ├── models/
│       │   ├── census/         read-only census schemas (later phase)
│       │   └── management/     application-generated schemas (later phase)
│       ├── routes/             URL wiring, mounted under /api/v1
│       ├── services/           business logic + DB access (later phase)
│       ├── validators/         zod query/param schemas
│       ├── types/              API response types
│       ├── utils/              AppError, TtlCache
│       ├── app.ts              Express app assembly
│       └── server.ts           DB connect + listen + graceful shutdown
└── frontend/
    ├── .env.example
    └── src/
        ├── components/
        │   ├── ui/             Button, Card, Spinner
        │   ├── feedback/       LoadingState, ErrorState, EmptyState
        │   └── layout/         AppLayout
        ├── config/             typed env access
        ├── features/           one folder per feature (system-status for now)
        ├── hooks/              useAsync
        ├── services/           Axios client + API calls
        ├── types/              API types
        └── utils/              small helpers
```

## Prerequisites

- Node.js **20.19 or newer** (required by Vite 7) and npm
- A MongoDB instance: local (`mongodb://127.0.0.1:27017`) or a free MongoDB Atlas cluster

## Run the backend

```bash
cd backend
npm install
cp .env.example .env      # then edit MONGODB_URI if needed
npm run dev
```

The API runs at `http://localhost:5000/api/v1`. Check it: `curl http://localhost:5000/api/v1/health`

## Run the frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. The page shows a "Backend connection" card; it should report the API
and database as healthy when the backend is running.

## Useful scripts (run inside `backend/` or `frontend/`)

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start in development mode with reload |
| `npm run build` | Type-check and produce a production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript check without emitting |
| `npm run format` | Format source with Prettier |

## Environment variables

Real `.env` files are git-ignored. Only the `.env.example` files are committed.

| File | Variable | Meaning |
| --- | --- | --- |
| backend/.env | `NODE_ENV` | `development` / `test` / `production` |
| backend/.env | `PORT` | API port (default 5000) |
| backend/.env | `MONGODB_URI` | MongoDB connection string (required) |
| backend/.env | `CLIENT_ORIGIN` | Frontend origin allowed by CORS |
| frontend/.env | `VITE_API_BASE_URL` | Backend API base URL |

## Phase 2: import the census data and use the API

Place `bbmp_tree_census_july_2026.geojson` in `backend/data/raw/` (it is only ever read), then from `backend/`:

```powershell
npm run import:census:dry-run   # validate and report only, no database needed
npm run import:census           # import into MongoDB collection tree_census (safe to re-run)
npm run dev                     # start the API
npm run check:api               # in a second terminal: end-to-end checks against the real data
```

The import streams the 227 MB file in batches, upserts by `OBJECTID` (re-running never creates duplicates)
and creates the indexes afterwards. It prints source / valid / invalid / duplicate / inserted / skipped counts.
