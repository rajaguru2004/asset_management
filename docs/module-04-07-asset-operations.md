# AssetFlow — Modules 4–7 Consolidated Plan: Registry · Allocation · Booking · Maintenance (FINAL)

> **Days 2–3 hackathon build.** Fully aligned to the **final** `module-01-03-auth-organization.md`: static RBAC matrix in code · one-shot JWT login · static sidebar · Int IDs · `{success,message,data}` envelope · Swagger · lean scope with `// TODO` ledger.
> **Supersedes** `module-04-05-asset-registry-allocation.md` and the uploaded `module-06-07-booking-maintenance.md` (Rev 2) as the single build document for the four operational modules.

---

## 0. Reconciliation Decisions (what changed to merge 6+7 into the 4+5 base)

| Rev-2 (6+7 upload) said | This plan | Why |
|---|---|---|
| Dynamic RBAC: `@RequirePermission('RESOURCE_BOOKING','VIEW')`, PlatformPage seed, navigation builder | **Static matrix**: `BOOKINGS`, `MAINTENANCE` resources added to the `Resource` enum + `ROLE_PERMISSIONS` constant (like ASSETS/ALLOCATIONS/LIBRARIES) | Final 1+3 cut all permission tables; page keys no longer exist |
| `isBookable` flag on **AssetCategory** | **`Asset.isShared`** (already in the M4 schema) is the single booking-eligibility flag; category flag dropped | PDF puts the "shared/bookable" flag on the **registration form, per asset** — a meeting room and a broken projector in the same category shouldn't both be bookable |
| Assumed `AssetStatus = AVAILABLE/ASSIGNED/…` | Canonical 7-state enum from M4: `AVAILABLE ALLOCATED RESERVED UNDER_MAINTENANCE LOST RETIRED DISPOSED` (`ASSIGNED`→`ALLOCATED`) | One enum, M4 owns it |
| `[M5]` open: allocation lookup on resolve | Resolved: resolve restores `ALLOCATED` iff an `AssetAllocation` row with `status: ACTIVE` exists, else `AVAILABLE` | M5 schema is final |
| Open: does overdue share the booking scheduler? | **One** `scheduler.service.ts` (in `common/`): booking reminders + auto-complete crons; **overdue stays computed-on-read** (M5 §7.9) — no overdue cron for the demo | One cron surface, fewer moving parts |
| Open: working hours for availability slots | Hardcoded 08:00–20:00 constant. `// TODO: system-settings` | Lean |
| One-open-request rule enforced in service only | Also enforced by a **partial unique index** (same trick as one-ACTIVE-allocation) | Free DB-level guarantee, symmetric with M5 |
| RESERVED set by bookings | **Deferred** — overlap math is time-range-based and never needs asset-status flips; `// TODO: flip RESERVED during ongoing booking (polish)` | Zero demo value, real complexity |

Everything else from Rev 2 is kept verbatim: half-open overlap intervals, REJECTED rows persisted for audit, state machine file, transactional status automation, EventEmitter2 stubs for Module 10, no 5th "Technician" role.

---

## 1. Module Functions (what each one does)

| Module | Function (business) | Core technical mechanism |
|---|---|---|
| **4 — Asset Registry** | Trustworthy asset master: what we own, what it cost, where it is, what shape it's in. Classifies each asset personal vs shared (`isShared`) — the fork that routes it to M5 or M6 | Atomic per-category tag sequence (`$transaction` + `increment`) · category-driven `customValues` validated against `customFields` · 7-state lifecycle · library-backed vocabularies |
| **5 — Allocation & Transfer** | Chain of custody: exactly one accountable holder per asset, full history, managerial sign-off on every hand-over, overdue tracking | Partial unique index (one ACTIVE per asset) · 409 conflict payload with holder + transfer CTA · atomic transfer swap · `expectedReturnDate` overdue computed on read |
| **6 — Resource Booking** | Time-sharing of `isShared` assets (rooms, cars, projectors) without double-booking; self-service for every employee | Half-open interval overlap vs CONFIRMED rows · `FOR UPDATE` transaction per asset · availability slot math · cron reminders + auto-complete |
| **7 — Maintenance** | Repairs routed through approval before work starts; asset availability reacts automatically; repair history per asset | Transition-map state machine (`assertTransition`) · transactional asset-status automation with `prevAssetStatus` restore · one open request per asset (partial index) |

Shared shape of 5/6/7: **request-lifecycle over assets** — a user raises a request, a privileged role advances a state machine, asset status + events react. One pattern, three domains.

---

## 2. Static RBAC Additions (extends 1+3 §4 — the complete Day-2/3 matrix delta)

```ts
// common/rbac/permissions.enum.ts — ADD
ASSETS = 'ASSETS', ALLOCATIONS = 'ALLOCATIONS', LIBRARIES = 'LIBRARIES',
BOOKINGS = 'BOOKINGS', MAINTENANCE = 'MAINTENANCE',
```

```ts
// common/rbac/role-permissions.ts — EXTEND
[ADMIN]: {         // full CRUD on all five new resources
  [R.ASSETS]: ALL, [R.ALLOCATIONS]: ALL, [R.LIBRARIES]: ALL, [R.BOOKINGS]: ALL, [R.MAINTENANCE]: ALL },
[ASSET_MANAGER]: {
  [R.ASSETS]: ALL, [R.ALLOCATIONS]: ALL, [R.LIBRARIES]: [VIEW, CREATE],
  [R.BOOKINGS]: ALL,                       // manage/cancel any booking
  [R.MAINTENANCE]: ALL },                  // approve/assign/start/resolve = UPDATE
[DEPT_HEAD]: {
  [R.ASSETS]: [VIEW], [R.ALLOCATIONS]: [VIEW, UPDATE],  // approve transfers // TODO dept-scope
  [R.LIBRARIES]: [VIEW],
  [R.BOOKINGS]: [VIEW, CREATE, UPDATE],    // book for the department, cancel own
  [R.MAINTENANCE]: [VIEW] },
[EMPLOYEE]: {
  [R.BOOKINGS]: [VIEW, CREATE, UPDATE],    // book/cancel/reschedule own (row-scoped in service)
  [R.MAINTENANCE]: [VIEW, CREATE] },       // raise + track own (row-scoped)
```

PDF role table honored: Employee books resources and raises maintenance requests; Dept Head books for the department; approve/assign/start/resolve all sit behind `MAINTENANCE.UPDATE`, held only by Admin/AM. Employee's M5 surface stays auth-only (`/allocations/my`, transfer-request) exactly as in the 4+5 plan. Row-level "own/department" filtering happens in services, never in the matrix (1+3 rule). Frontend `lib/permissions.ts` mirror + static NAV get the same additions:

```ts
{ label: 'Assets', href: '/assets', resource: R.ASSETS },
{ label: 'Allocations', href: '/allocations', resource: R.ALLOCATIONS },
{ label: 'Bookings', href: '/bookings', resource: R.BOOKINGS },
{ label: 'Maintenance', href: '/maintenance', resource: R.MAINTENANCE },
{ label: 'Library', href: '/library', resource: R.LIBRARIES },
```

---

## 3. Prisma Schema (consolidated delta over the 1+3 schema)

```prisma
enum AssetStatus       { AVAILABLE ALLOCATED RESERVED UNDER_MAINTENANCE LOST RETIRED DISPOSED }
enum AssetCondition    { GOOD FAIR DAMAGED UNDER_REPAIR }
enum AllocationStatus  { ACTIVE RETURNED TRANSFER_PENDING }
enum BookingStatus     { CONFIRMED REJECTED CANCELLED COMPLETED }
enum MaintenancePriority { LOW MEDIUM HIGH }
enum MaintenanceRequestStatus { PENDING APPROVED REJECTED TECHNICIAN_ASSIGNED IN_PROGRESS RESOLVED CANCELLED }

model Asset {
  id              Int            @id @default(autoincrement())
  assetTag        String         @unique              // server-generated ONLY
  name            String
  categoryId      Int
  category        AssetCategory  @relation(fields: [categoryId], references: [id])
  serialNumber    String?        @unique
  condition       AssetCondition @default(GOOD)
  location        String         @default("")          // "location" library dataId
  status          AssetStatus    @default(AVAILABLE)
  isShared        Boolean        @default(false)       // true → bookable (M6), not allocatable (M5)
  acquisitionDate DateTime?
  acquisitionCost Decimal?       @db.Decimal(12,2)     // reports/ranking only
  photoUrl        String?                              // TODO: upload wiring
  customValues    Json           @default("{}")
  isActive        Boolean        @default(true)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  allocations     AssetAllocation[]
  bookings        Booking[]
  maintenance     MaintenanceRequest[]
  @@index([categoryId]) @@index([status])
}

model AssetTagSequence { id Int @id @default(autoincrement())  categoryId Int @unique  lastNumber Int @default(0) }

model AssetAllocation {
  id                 Int              @id @default(autoincrement())
  assetId            Int
  asset              Asset            @relation(fields: [assetId], references: [id])
  userId             Int?             // exactly one of userId/departmentId (service-validated)
  user               User?            @relation("Holder", fields: [userId], references: [id])
  departmentId       Int?
  department         Department?      @relation("DeptAllocations", fields: [departmentId], references: [id])
  allocatedById      Int
  allocatedBy        User             @relation("Allocator", fields: [allocatedById], references: [id])
  status             AllocationStatus @default(ACTIVE)
  allocatedAt        DateTime         @default(now())
  expectedReturnDate DateTime?
  returnedAt         DateTime?
  returnCondition    AssetCondition?
  notes              String           @default("")
  @@index([assetId]) @@index([userId]) @@index([status, expectedReturnDate])
}

model Booking {
  id           Int           @id @default(autoincrement())
  assetId      Int
  asset        Asset         @relation(fields: [assetId], references: [id])
  bookedById   Int
  bookedBy     User          @relation("UserBookings", fields: [bookedById], references: [id])
  purpose      String
  startTime    DateTime
  endTime      DateTime
  status       BookingStatus @default(CONFIRMED)
  cancelReason String        @default("")
  remindedAt   DateTime?                              // idempotent reminder cron
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  @@index([assetId, startTime, endTime]) @@index([bookedById])
}

model MaintenanceRequest {
  id              Int                      @id @default(autoincrement())
  assetId         Int
  asset           Asset                    @relation(fields: [assetId], references: [id])
  requestedById   Int
  requestedBy     User                     @relation("MaintRequester", fields: [requestedById], references: [id])
  issue           String                                   // "Screen broken"
  description     String                   @default("")
  priority        MaintenancePriority      @default(MEDIUM)
  status          MaintenanceRequestStatus @default(PENDING)
  approvedById    Int?
  approvedBy      User?                    @relation("MaintApprover", fields: [approvedById], references: [id])
  technicianId    Int?                     // any active User — no 5th role
  technician      User?                    @relation("MaintTechnician", fields: [technicianId], references: [id])
  rejectReason    String                   @default("")
  resolutionNotes String                   @default("")
  cost            Decimal?                 @db.Decimal(12,2)
  prevAssetStatus String?                                  // restored on RESOLVED
  approvedAt DateTime?  assignedAt DateTime?  startedAt DateTime?  resolvedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  @@index([assetId, status]) @@index([technicianId])
}

model LibraryItem {
  id Int @id @default(autoincrement())
  libName String   dataId String   data Json   isActive Boolean @default(true)
  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
  @@unique([libName, dataId]) @@index([libName, isActive])
}
```

**Raw-SQL migration steps (both critical — DB-level invariants):**

```sql
-- M5: one active holder per asset
CREATE UNIQUE INDEX "one_active_allocation_per_asset"
ON "AssetAllocation" ("assetId") WHERE "status" = 'ACTIVE';

-- M7: one open maintenance request per asset
CREATE UNIQUE INDEX "one_open_maintenance_per_asset"
ON "MaintenanceRequest" ("assetId")
WHERE "status" IN ('PENDING','APPROVED','TECHNICIAN_ASSIGNED','IN_PROGRESS');
```

New libraries in `library.config.ts`: `location`, `fuel_type` (M4) + `booking_purpose`, `maintenance_type` (M6/7 dropdowns, optional).

---

## 4. Technical Approach (the four core mechanisms)

### 4.1 M4 — Atomic tag generation + custom-field validation

One `$transaction` in `AssetsService.create()`: load category → `validateCustomValues(dto.customValues, category.customFields)` (required keys, type checks, select values must exist as **active** library items, unknown keys rejected) → `assetTagSequence.upsert` with `lastNumber: { increment: 1 }` (Postgres-atomic, no race) → `asset.create` with `` `${category.tagPrefix}-${String(n).padStart(4,'0')}` ``. `CreateAssetDto` has no `assetTag`/`status` fields — `whitelist: true` strips injections (same trick as auth's no-self-elevation).

### 4.2 M5 — Custody transactions

**Allocate** (`$transaction`): asset must be `AVAILABLE` and `isShared: false` → 409 with `{holder, allocatedAt, canRequestTransfer: true}` if `ALLOCATED` (powers the PDF UX verbatim) · 409 "shared resource — use booking" if `isShared` · exactly one of `userId`/`departmentId`, target active → flip asset `ALLOCATED` + create ACTIVE row. Partial index is the last line of defense.
**Return**: allocation → `RETURNED` (+`returnedAt`, `returnCondition`), asset → `AVAILABLE`; DAMAGED/UNDER_REPAIR check-in updates `Asset.condition` (M7 feed).
**Transfer**: pending row (`TRANSFER_PENDING`, one per asset+user) → approve = atomic swap (old→RETURNED, pending→ACTIVE); asset never passes through AVAILABLE mid-transfer.
**Overdue**: `status: ACTIVE AND expectedReturnDate < now()` — computed on read by `/allocations/overdue` and the dashboard; no cron.

### 4.3 M6 — Overlap validation (PDF example, exactly)

Half-open intervals `[start, end)`; conflict iff `existing.start < new.end AND existing.end > new.start`, checked against **CONFIRMED** rows on the same asset only:

```
9:00–10:00 CONFIRMED
9:30–10:30 → conflict → saved as REJECTED + 409 (body includes the clashing booking)
10:00–11:00 → 10:00 > 10:00 is false → CONFIRMED   (back-to-back OK, per PDF)
```

Race safety: creation transaction takes `SELECT … FOR UPDATE` on the asset row — two simultaneous 10–11 requests → exactly one CONFIRMED. Eligibility: `asset.isShared === true` and status not in `{UNDER_MAINTENANCE, RETIRED, LOST, DISPOSED}`. Reschedule = same validation atomically; failure leaves the original booking untouched. `availability.service.ts` is pure functions (slot math within 08:00–20:00) → unit-testable, powers the live preview.
**Scheduler** (`@nestjs/schedule`, 1-min cron, idempotent): reminders for CONFIRMED bookings starting ≤15 min with `remindedAt IS NULL` (emit event, stamp), auto-complete past CONFIRMED → `COMPLETED`.

### 4.4 M7 — State machine + status automation

```
PENDING ─approve→ APPROVED ─assign→ TECHNICIAN_ASSIGNED ─start→ IN_PROGRESS ─resolve→ RESOLVED
   └reject→ REJECTED          (requester may cancel only while PENDING → CANCELLED)
```

`maintenance-state.machine.ts` exports the allowed-transitions map + `assertTransition(current, next)` → 409 on illegal jumps; single source of truth, unit-tested. **Status automation** (transactional): `start` stores `asset.status` into `prevAssetStatus`, sets `UNDER_MAINTENANCE` (blocks new bookings *and* allocations); `resolve` requires notes, restores `ALLOCATED` iff an ACTIVE allocation exists else `AVAILABLE`. Existing future CONFIRMED bookings on an asset entering maintenance are **flagged, not auto-cancelled** (event emitted; AM decides). Technician = any active User; only the assigned technician or Admin/AM may start/resolve.

All 5/6/7 services emit typed events (`EventEmitter2`): `allocation.*`, `booking.created|rejected|cancelled|reminder`, `maintenance.submitted|approved|rejected|assigned|started|resolved` — console-logged stub listener until Module 10 swaps in Notification + AuditLog writes with zero changes here.

---

## 5. Backend Structure (extends the 1+3 tree)

```
src/
├── assets/        assets.module/.controller/.service
│   └── dto/ create-asset.dto, update-asset.dto, query-assets.dto
├── allocations/   allocations.module/.controller/.service
│   └── dto/ allocate.dto, return-asset.dto, transfer-request.dto, query-allocations.dto
├── bookings/      bookings.module/.controller/.service
│   ├── availability.service.ts          # pure overlap/slot math
│   └── dto/ create-booking.dto, reschedule-booking.dto, cancel-booking.dto,
│            query-bookings.dto, calendar-query.dto
├── maintenance/   maintenance.module/.controller/.service
│   ├── maintenance-state.machine.ts
│   └── dto/ create-request.dto, reject-request.dto, assign-technician.dto,
│            resolve-request.dto, query-requests.dto
├── libraries/     libraries.module/.controller/.service + library.config.ts + library.validator.ts
└── common/scheduler/scheduler.service.ts   # ALL crons (booking reminder + auto-complete)
```

---

## 6. API Endpoints (final guards — static matrix notation)

### 6.1 `assets/` (M4)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/assets` | `(ASSETS, VIEW)` | filters: category/status/condition/location/isShared; search name/tag/serial; paginated |
| GET | `/assets/:id` | `(ASSETS, VIEW)` | detail + holder + allocation history (+ maintenance history) |
| POST | `/assets` | `(ASSETS, CREATE)` | tag txn §4.1 |
| PATCH | `/assets/:id` | `(ASSETS, UPDATE)` | `assetTag`, `categoryId` immutable |
| DELETE | `/assets/:id` | `(ASSETS, DELETE)` | soft-retire; blocked if ALLOCATED |

### 6.2 `allocations/` (M5)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/allocations` | `(ALLOCATIONS, VIEW)` | filters incl. overdue |
| GET | `/allocations/my` | auth-only | employee path |
| GET | `/allocations/overdue` | `(ALLOCATIONS, VIEW)` | dashboard/notification feed |
| POST | `/allocations` | `(ALLOCATIONS, CREATE)` | §4.2; 409s |
| POST | `/allocations/:id/return` | `(ALLOCATIONS, UPDATE)` | condition check-in |
| POST | `/allocations/transfer-request` | auth-only | one pending per (asset,user) |
| GET | `/allocations/transfers/pending` | `(ALLOCATIONS, UPDATE)` | queue |
| PATCH | `/allocations/transfers/:id/approve\|reject` | `(ALLOCATIONS, UPDATE)` | atomic swap / remove |

### 6.3 `bookings/` (M6)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/bookings` | `(BOOKINGS, VIEW)` | row scope in service: Employee=own, DeptHead=department, Admin/AM=all |
| GET | `/bookings/calendar` | `(BOOKINGS, VIEW)` | `?assetId&from&to` grouped per day |
| GET | `/bookings/availability` | `(BOOKINGS, VIEW)` | free slots for `?assetId&date` (08:00–20:00) |
| POST | `/bookings` | `(BOOKINGS, CREATE)` | §4.3; conflict → REJECTED row + 409 with clash |
| PATCH | `/bookings/:id/reschedule` | `(BOOKINGS, UPDATE)` | own (or AM/Admin); atomic re-validation |
| PATCH | `/bookings/:id/cancel` | `(BOOKINGS, UPDATE)` | own (or AM/Admin); future CONFIRMED only; reason required |

### 6.4 `maintenance/` (M7)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/maintenance` | `(MAINTENANCE, VIEW)` | row scope: Employee=own, DeptHead=dept, technicians also see assigned-to-me |
| GET | `/maintenance/:id` | same | detail + stage timeline |
| POST | `/maintenance` | `(MAINTENANCE, CREATE)` | 409 if asset already has an open request |
| PATCH | `/maintenance/:id/approve` | `(MAINTENANCE, UPDATE)` | PENDING→APPROVED |
| PATCH | `/maintenance/:id/reject` | `(MAINTENANCE, UPDATE)` | reason required |
| PATCH | `/maintenance/:id/assign` | `(MAINTENANCE, UPDATE)` | technicianId = active user |
| PATCH | `/maintenance/:id/start` | `(MAINTENANCE, UPDATE)` + assigned-tech check | asset → UNDER_MAINTENANCE |
| PATCH | `/maintenance/:id/resolve` | same | notes required; restores status §4.4 |
| PATCH | `/maintenance/:id/cancel` | auth-only + requester check | PENDING only |

### 6.5 `libraries/` (unchanged from 4+5 plan) · `dashboard/stats` extended

Dashboard adds M6/7 KPIs on top of the M4/5 set: `activeBookings`, `bookingsToday`, `maintenanceToday`, `pendingMaintenance` → completes the PDF's KPI card list (Available / Allocated / Maintenance Today / Bookings / Overdue Returns / Pending Transfers).

---

## 7. Frontend Structure (extends 1+3/4+5 conventions)

```
app/(admin)/
├── assets/page.tsx          # registry + Register
├── allocations/page.tsx     # table + Pending Transfers tab + Overdue chip
├── bookings/page.tsx        # calendar ⇄ list switcher
├── maintenance/page.tsx     # workflow board (status columns) ⇄ table
└── library/page.tsx         # generic config-driven manage screen
components/
├── assets/       AssetTable, AssetForm (dynamic custom fields + isShared toggle),
│                 CustomFieldsRenderer, AssetDetailDrawer, AllocateModal (409 UX)
├── allocations/  AllocationTable, ReturnModal, TransferQueue
├── bookings/     BookingCalendar (week grid), BookingForm (bookable-asset picker →
│                 live availability preview → time range), BookingCard, CancelBookingDialog
├── maintenance/  RequestForm, WorkflowStepper (Pending→…→Resolved), AssignTechnicianModal,
│                 ResolveModal (notes+cost), PriorityBadge, RequestTimeline
└── library/      LibraryTable, LibraryForm            // TODO: InlineLibraryModal (polish)
services/  assetService, allocationService, bookingService, maintenanceService, libraryService
```

Buttons gated by the mirrored static matrix (`PermissionGate` + `lib/permissions.ts`); React Query invalidations: mutations touch `['assets']`, `['allocations']`, `['bookings']`, `['maintenance']`, `['dashboard']` — KPI cards and status chips flip live.

**Demo moments:** register → tag appears · allocate → second browser gets the live "Already allocated · Holder: Tony · [Request Transfer]" block · approve transfer → holder swaps instantly · book 9–10 then watch 9:30–10:30 rejected in the availability preview *before* submit · maintenance stepper advances Pending→Resolved while the asset badge flips Under Maintenance → Available.

---

## 8. Seed Additions (idempotent, extends 1+3 seed)

1. Libraries: locations (CHN, CBE), fuel types (PET/DSL/EV), booking purposes, maintenance types.
2. Categories: + **Meeting Rooms**; assets: ~12 across categories — 3 `isShared` (Room A, Room B, Projector), valid customValues, matching `AssetTagSequence` rows.
3. Allocations: 2 ACTIVE (one to "Tony", one departmental), 1 **overdue**, 1 RETURNED, 1 TRANSFER_PENDING.
4. Bookings: Room A today 9–10 CONFIRMED (the PDF demo slot), one COMPLETED yesterday, one REJECTED (conflict visible in UI).
5. Maintenance: 1 PENDING ("Screen broken", HIGH), 1 IN_PROGRESS (its asset seeded UNDER_MAINTENANCE with `prevAssetStatus`), 1 RESOLVED with notes+cost.

---

## 9. Business Rules & Edge Cases (consolidated)

**M4:** tag server-generated/immutable/race-proof · customValues validated create+update, select values must be active library items · cannot retire ALLOCATED · category delete blocked once assets exist · library delete blocked while referenced ("used by N assets"), deactivate instead.
**M5:** one ACTIVE allocation per asset (DB+txn) · exactly one target (user XOR department), target active · cannot allocate RETIRED/DISPOSED/LOST/UNDER_MAINTENANCE/RESERVED or `isShared` assets · transfer swap atomic, never AVAILABLE mid-transfer · one TRANSFER_PENDING per (asset,user) · overdue on read.
**M6:** window valid (`start<end`, future, ≤8h, 15-min steps) · only `isShared` + non-blocked-status assets bookable · overlap vs CONFIRMED only, half-open (back-to-back OK) · REJECTED/CANCELLED/COMPLETED never block · reschedule atomic, original untouched on failure · cancel = future CONFIRMED + reason · crons idempotent (`remindedAt`) · deactivating a user cancels their future CONFIRMED bookings (hook in `users/`).
**M7:** one open request per asset (DB+txn) · illegal transitions 409 via state machine · reject needs reason, resolve needs notes · only assigned tech or Admin/AM starts/resolves; deactivated technician mid-flight → AM reassigns · asset flips UNDER_MAINTENANCE on start (blocks bookings + allocations), restores ALLOCATED/AVAILABLE on resolve · future bookings on maintenance assets flagged, not auto-cancelled · priority editable by requester only while PENDING.
**All:** row scoping (own/department) in services, never the matrix · envelope + `whitelist/forbidNonWhitelisted` · Swagger on every controller.

---

## 10. Build Order (Days 2–3, ~14h)

| Slot | Task | ~Time |
|---|---|---|
| 1 | Schema (all §3) + 2 partial-index migrations + consolidated seed | 1:00 |
| 2 | RBAC deltas (enum + matrix + frontend mirror + NAV) | 0:15 |
| 3 | Libraries module (config/validator/CRUD/delete-protection) | 0:50 |
| 4 | Assets: tag txn + custom-value validation + controller + stats | 1:20 |
| 5 | Allocations: allocate/return/transfer txns + overdue + controller | 1:30 |
| 6 | `availability.service` (pure fns + unit tests) → bookings service/controller | 1:30 |
| 7 | Scheduler (reminder + auto-complete crons) | 0:30 |
| 8 | State machine (unit tests) → maintenance service/controller + event stubs | 1:30 |
| 9 | FE: services/hooks + AssetTable/AssetForm/CustomFieldsRenderer | 1:10 |
| 10 | FE: AllocateModal 409 UX + AllocationTable + ReturnModal + TransferQueue | 1:10 |
| 11 | FE: BookingCalendar + BookingForm w/ availability preview | 1:20 |
| 12 | FE: maintenance board + WorkflowStepper + modals | 1:10 |
| 13 | Library screen + dashboard KPI extension | 0:35 |
| 14 | Polish: toasts, empty states, InlineLibraryModal-if-time, full demo dry-run | 0:40 |

---

## 11. Test Plan (consolidated)

| # | Test | Expected |
|---|---|---|
| 1 | Two parallel `POST /assets` same category | Sequential tags, no collision |
| 2 | Inject `assetTag`/`status` in create body | Stripped |
| 3 | Electronics missing `warrantyPeriod`; vehicle `fuelType:"XYZ"` | 400 naming field / invalid option |
| 4 | Allocate AVAILABLE → Tony; allocate again | 201 then **409** `{holder:'Tony', canRequestTransfer:true}` |
| 5 | Allocate `isShared` asset | 409 "use booking" |
| 6 | SQL-insert 2nd ACTIVE allocation / 2nd open maintenance | Both rejected by partial indexes |
| 7 | Transfer request → approve | Old RETURNED, new ACTIVE, never AVAILABLE between |
| 8 | Seeded overdue allocation | In `/allocations/overdue` + KPI |
| 9 | Book Room A 9–10 → 9:30–10:30 → 10–11 | CONFIRMED → REJECTED+409 w/ clash → CONFIRMED |
| 10 | Two concurrent 10–11 requests | Exactly one CONFIRMED |
| 11 | Book non-shared or UNDER_MAINTENANCE asset | 409 |
| 12 | Reschedule into occupied slot | 409, original intact |
| 13 | Employee cancels someone else's booking | 403 (row scope) |
| 14 | Cron pass | Past CONFIRMED → COMPLETED; reminder fires once |
| 15 | Submit→approve→assign→start | Asset UNDER_MAINTENANCE; PENDING→resolve directly = 409 |
| 16 | Resolve (notes+cost) on allocated asset | Asset restored to ALLOCATED |
| 17 | Technician B starts A's request; Employee hits approve | 403 / 403 (matrix) |
| 18 | Promote Employee → Asset Manager | Register/allocate/approve unlock next request, no re-login |
| 19 | Delete in-use location library item | Blocked "used by N assets" |
| 20 | Swagger `/api/docs` | All M4–7 endpoints documented |

---

## 12. Deferred Feature Ledger (all `// TODO` in code)

- Photo/document uploads (`photoUrl` ready) · QR render + scan search
- Excel library import + logs · InlineLibraryModal (if slot 14 misses)
- Dept-scope on DH transfer approvals · working-hours system setting (08:00–20:00 constant)
- RESERVED wiring during ongoing bookings · DISPOSED action UI · LOST arrives with M8 audit
- Overdue/reminder **delivery** = Module 10 (events already emitted); daily overdue cron if on-read ever insufficient
- Maintenance history panel in AssetDetailDrawer fills from M7 data (wire-up in slot 12 if time)

---

## 13. Pattern Source Map

| Concern | Source |
|---|---|
| Feature modules, DTOs, guards, Swagger, envelope | Ref B (HRM) via final 1+3 |
| Static RBAC matrix + mirror + PermissionGate | Final 1+3 §4/§7 |
| Atomic tag sequence · partial unique indexes · 409 holder UX · atomic transfer swap | 4+5 final plan |
| Half-open overlap + `FOR UPDATE` · state machine file · status automation · scheduler · event stubs | 6+7 Rev 2 (re-based here) |
| Library engine (config CRUD, dedupe, delete protection) | Ref A `listOfLib`, Prisma port |
| Multi-view pages, services layer, React Query | Ref B |
