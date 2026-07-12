-- Partial unique indexes: DB-level invariants prisma db push can't express
-- (no `prisma migrate` in this workflow — see CLAUDE.md §3). Run via `npm run db:indexes`
-- after every `db push`. Idempotent (IF NOT EXISTS).

-- M5: one active holder per asset
CREATE UNIQUE INDEX IF NOT EXISTS "one_active_allocation_per_asset"
ON "asset_allocations" ("assetId") WHERE "status" = 'ACTIVE';

-- M7: one open maintenance request per asset
CREATE UNIQUE INDEX IF NOT EXISTS "one_open_maintenance_per_asset"
ON "maintenance_requests" ("assetId")
WHERE "status" IN ('PENDING','APPROVED','TECHNICIAN_ASSIGNED','IN_PROGRESS');
