# Backend (API) — SQLite schema

This API uses a single relational SQLite database (`fincas.db`) created at runtime. Foreign keys are enforced and indexes are provided for performance and data integrity.

## Schema

- crews
  - id INTEGER PRIMARY KEY AUTOINCREMENT
  - name TEXT NOT NULL

- workers
  - id INTEGER PRIMARY KEY AUTOINCREMENT
  - crew_id INTEGER NOT NULL REFERENCES crews(id)
  - fullname TEXT NOT NULL
  - active INTEGER NOT NULL DEFAULT 1
  - doc TEXT NULL
  - Unique index: (crew_id, doc)

- attendance
  - id INTEGER PRIMARY KEY AUTOINCREMENT
  - worker_id INTEGER NOT NULL REFERENCES workers(id)
  - date TEXT NOT NULL (YYYY-MM-DD)
  - status TEXT NOT NULL CHECK(status IN ('present','absent'))
  - notes TEXT NULL
  - Unique constraint: (worker_id, date)

Notes:
- `PRAGMA foreign_keys = ON` and `journal_mode = WAL` are enabled.
- Soft-delete for workers is handled by `active = 0`.

## Seed

Run once (idempotent):

- `npm run seed` (from `server/`)

It will ensure base crews exist (Finca A..E) and insert a few demo workers if the table is empty.

## Key API endpoints

- GET /api/crews — list crews (id, name)
- GET /api/workers?crewId=1 — active workers in a crew
- POST /api/workers — create or reactivate worker (body: { crewId, doc, fullname })
- PUT /api/workers/:id — update worker fields
- DELETE /api/workers/:id — soft-delete worker

- POST /api/attendance — upsert today attendance for a worker by (crewId, doc)
- POST /api/attendance/bulk — batch upsert by voice parsing (body: { crewId, items: [{doc,status}] })
- GET /api/attendance/today?crewId=1 — today's attendance per crew
- GET /api/attendance/summary[?crewId=1] — per-crew or all-crews summary for today

- GET /api/admin/dashboard — aggregates for admin dashboard (weekly lines, top crews, recent records)

## Storage path

The database file is created at:
- `process.env.DB_DIR` (if writable), otherwise falls back to the server folder
- Filename: `fincas.db`
