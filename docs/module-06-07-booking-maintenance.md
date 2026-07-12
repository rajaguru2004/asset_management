# AssetFlow — Merged Module 6+7 Report: Resource Booking & Maintenance Management (Rev 2)

**Supersedes** Rev 1 (which mixed in the old scaffold's uuid/enum-Role conventions). Rev 2 is re-based **entirely** on `module-01-03-auth-organization.md`: Int autoincrement IDs · dynamic page-level RBAC (`@RequirePermission` + PermissionsGuard) · `RoleMaster`/`User`/`Department`/`AssetCategory` schema · `{success,message,data}` envelope · Swagger everywhere. Modules 4 & 5 reports pending — interfaces marked **[M4]** / **[M5]**.

**Locked decisions (this report):** half-open interval overlap (back-to-back allowed, per PDF example) · conflicting requests persisted as `REJECTED` (audit + demo visibility) · one open maintenance request per asset · technician = any active User chosen by Asset Manager (**no** 5th role — 4 seeded system roles stay locked) · asset status automation transactional, service-side · reminders via `@nestjs/schedule` cron; delivery deferred to Module 10 · `isBookable` flag lives on `AssetCategory` (LibraryItem pattern: one more master attribute, no new table).

---

## 1. Combined Scope (from the PDF)

**Module 6 — Resource Booking:** shared resources (Meeting Room, Car, Projector) bookable on a calendar; overlap validation — Room A booked 9–10 → request 9:30–10:30 **rejected**, request 10–11 **accepted** (touching boundaries never conflict); booking statuses; cancel/reschedule; reminders.

**Module 7 — Maintenance Management:** employee reports an issue ("Screen broken", priority High); workflow `Pending → Approved → Technician Assigned → In Progress → Resolved`; asset auto-set to `Under Maintenance` while under repair, back to `Available` on completion.

These merge naturally: both are **request-lifecycle modules over assets** — a user raises a time/repair request, a privileged role advances it through a state machine, asset status + notifications react automatically. They share the state-machine service pattern, row-level "own/department/all" scoping (Module 1+3 §8.3 note), and Module 10 event hooks.

---

## 2. Backend Structure (extends the Module 1+3 tree)

```
src/
├── bookings/                            # page key RESOURCE_BOOKING (seeded)
│   ├── bookings.module.ts / bookings.controller.ts / bookings.service.ts
│   ├── availability.service.ts          # pure overlap/slot math (unit-testable)
│   ├── booking-scheduler.service.ts     # cron: reminders + auto-complete
│   └── dto/  create-booking.dto.ts, reschedule-booking.dto.ts,
│             cancel-booking.dto.ts, query-bookings.dto.ts, calendar-query.dto.ts
└── maintenance/                         # page key MAINTENANCE (seeded)
    ├── maintenance.module.ts / maintenance.controller.ts / maintenance.service.ts
    ├── maintenance-state.machine.ts     # allowed-transitions map + assertTransition()
    └── dto/  create-request.dto.ts, reject-request.dto.ts, assign-technician.dto.ts,
              resolve-request.dto.ts, query-requests.dto.ts
```

Guard order unchanged (`APP_GUARD`): `JwtAuthGuard → PermissionsGuard`. Both page keys already exist in the Module 1+3 seed (§8.2), as do their matrix rows (§8.3) — **zero RBAC schema work needed**.

---

## 3. Prisma Schema Additions (Module 1+3 conventions: Int IDs, relations to `User`)

```prisma
enum BookingStatus {
  CONFIRMED     // created successfully (no conflict)
  REJECTED      // conflicted at creation; kept for audit/demo
  CANCELLED     // cancelled before start
  COMPLETED     // endTime passed (cron-flipped)
}

model Booking {
  id           Int           @id @default(autoincrement())
  assetId      Int                                        // [M4] Asset model
  asset        Asset         @relation(fields: [assetId], references: [id])
  bookedById   Int
  bookedBy     User          @relation("UserBookings", fields: [bookedById], references: [id])
  purpose      String
  startTime    DateTime
  endTime      DateTime
  status       BookingStatus @default(CONFIRMED)
  cancelReason String        @default("")
  remindedAt   DateTime?                                  // idempotent reminder cron
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([assetId, startTime, endTime])
  @@index([bookedById])
}

enum MaintenancePriority { LOW MEDIUM HIGH }

enum MaintenanceRequestStatus {
  PENDING
  APPROVED
  REJECTED
  TECHNICIAN_ASSIGNED
  IN_PROGRESS
  RESOLVED
  CANCELLED          // requester withdraws while PENDING
}

model MaintenanceRequest {
  id              Int                      @id @default(autoincrement())
  assetId         Int                                     // [M4]
  asset           Asset                    @relation(fields: [assetId], references: [id])
  requestedById   Int
  requestedBy     User                     @relation("MaintRequester", fields: [requestedById], references: [id])
  issue           String                                  // "Screen broken"
  description     String                   @default("")
  priority        MaintenancePriority      @default(MEDIUM)
  status          MaintenanceRequestStatus @default(PENDING)
  approvedById    Int?
  approvedBy      User?                    @relation("MaintApprover", fields: [approvedById], references: [id])
  technicianId    Int?
  technician      User?                    @relation("MaintTechnician", fields: [technicianId], references: [id])
  rejectReason    String                   @default("")
  resolutionNotes String                   @default("")
  cost            Decimal?                 @db.Decimal(12, 2)
  prevAssetStatus String?                                 // asset status to restore on RESOLVED (§5.3)
  approvedAt      DateTime?
  assignedAt      DateTime?
  startedAt       DateTime?
  resolvedAt      DateTime?
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt

  @@index([assetId, status])
  @@index([technicianId])
}
```

**One-line change to Module 1+3's `AssetCategory`:** add `isBookable Boolean @default(false)` — the LibraryItem pattern absorbs it like `tagPrefix` did. Seeded `true` for Vehicles and Projectors, plus a new seeded **Meeting Rooms** category; `false` for Electronics/Furniture. Bookings accepted only for assets whose category `isBookable` **and** whose status is `AVAILABLE` **[M4]**.

`User` gains three back-relations (`bookings`, plus the two maintenance relations) — additive, no migration risk.

---

## 4. Core Logic

### 4.1 Overlap validation (the PDF example, exactly)

Half-open intervals `[start, end)` — conflict iff `existing.start < new.end AND existing.end > new.start`, checked against **CONFIRMED** bookings on the same asset only:

```
9:00–10:00 CONFIRMED
9:30–10:30 → 9:00 < 10:30 && 10:00 > 9:30  → conflict → REJECTED
10:00–11:00 → 10:00 > 10:00 is false        → no conflict → CONFIRMED
```

Race safety: creation runs in `prisma.$transaction` with a `SELECT … FOR UPDATE` on the asset row, serializing concurrent requests per asset. Two simultaneous 10–11 requests → exactly one CONFIRMED, one REJECTED.

### 4.2 Maintenance state machine

```
PENDING ──approve──► APPROVED ──assign──► TECHNICIAN_ASSIGNED ──start──► IN_PROGRESS ──resolve──► RESOLVED
   │ reject
   ▼                     (requester may cancel only while PENDING)
REJECTED / CANCELLED
```

`maintenance-state.machine.ts` exports `ALLOWED: Record<Status, Status[]>` + `assertTransition(current, next)` → 409 on illegal jumps (no PENDING→RESOLVED shortcuts). Single source of truth, unit-tested.

### 4.3 Asset status automation (transactional, service-side) [M4]

- **start** (`→ IN_PROGRESS`): store current `asset.status` in `prevAssetStatus`, set asset `UNDER_MAINTENANCE`.
- **resolve**: if an active allocation exists **[M5]** restore `ASSIGNED`, else `AVAILABLE` (`prevAssetStatus` as fallback) — matches the PDF's "After completion → Available".
- `UNDER_MAINTENANCE` blocks **new** bookings (409); existing CONFIRMED future bookings are flagged (`assetUnderMaintenance: true`) and emitted to Module 10 — not auto-cancelled (Asset Manager decides).

### 4.4 Scheduler (`@nestjs/schedule`, every minute)

- **Reminder:** CONFIRMED bookings starting within 15 min with `remindedAt IS NULL` → emit event (console-logged until Module 10), stamp `remindedAt`.
- **Auto-complete:** CONFIRMED bookings with `endTime < now()` → `COMPLETED`.

---

## 5. API Endpoints

### 5.1 `bookings/`

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/bookings` | `('RESOURCE_BOOKING','VIEW')` | filters: assetId, status, from/to, mine; paginated. Row scope in service: Employee = own, Dept Head = `bookedBy.departmentId` match, Admin/AM = all |
| GET | `/bookings/calendar` | same | `?assetId&from&to` → bookings grouped per day for the calendar grid |
| GET | `/bookings/availability` | same | `?assetId&date` → free slots between CONFIRMED bookings within working hours |
| POST | `/bookings` | `('RESOURCE_BOOKING','CREATE')` | overlap check §4.1; conflict → row saved REJECTED + 409 body includes the clashing booking |
| PATCH | `/bookings/:id/reschedule` | `('RESOURCE_BOOKING','UPDATE')` | own (or AM/Admin); atomic re-validation — old slot released only if new one is free |
| PATCH | `/bookings/:id/cancel` | `('RESOURCE_BOOKING','UPDATE')` | own (or AM/Admin); future CONFIRMED only; `cancelReason` required |

### 5.2 `maintenance/`

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/maintenance` | `('MAINTENANCE','VIEW')` | filters: status, priority, assetId, technicianId, mine; same row scoping. Technicians additionally see requests assigned to them |
| GET | `/maintenance/:id` | same | detail + stage timeline (all timestamps) |
| POST | `/maintenance` | `('MAINTENANCE','CREATE')` | `{assetId, issue, description?, priority}`; 409 if asset already has an open request (§7.5) |
| PATCH | `/maintenance/:id/approve` | `('MAINTENANCE','UPDATE')` | PENDING→APPROVED |
| PATCH | `/maintenance/:id/reject` | same | PENDING→REJECTED; `rejectReason` required |
| PATCH | `/maintenance/:id/assign` | same | APPROVED→TECHNICIAN_ASSIGNED; `technicianId` must be an active user |
| PATCH | `/maintenance/:id/start` | same | assigned technician or Admin/AM; asset → UNDER_MAINTENANCE (§4.3) |
| PATCH | `/maintenance/:id/resolve` | same | assigned technician or Admin/AM; `{resolutionNotes, cost?}`; restores asset status |
| PATCH | `/maintenance/:id/cancel` | `('MAINTENANCE','UPDATE')` | requester only, PENDING only |

Matrix rows (already seeded, Module 1+3 §8.3): Admin full · Asset Manager CRUD on MAINTENANCE (+ booking management) · Dept Head VIEW dept + CREATE bookings · Employee VIEW own + CREATE bookings/maintenance. Approve/assign/start/resolve sit behind `MAINTENANCE.UPDATE`, which only Admin/AM hold — the workflow is protected by the existing matrix, no special-casing.

---

## 6. Frontend Structure (extends Module 1+3 tree)

```
app/(admin)/
├── bookings/page.tsx            # calendar ⇄ list switcher (Ref B multi-view pattern)
└── maintenance/page.tsx         # workflow board (status columns) ⇄ table view
components/
├── bookings/    BookingCalendar.tsx (week grid, per-asset lanes), BookingForm.tsx
│                (bookable-asset picker → live availability preview → time range),
│                BookingCard.tsx, CancelBookingDialog.tsx, BookingViewSwitcher.tsx
└── maintenance/ RequestForm.tsx, WorkflowStepper.tsx (Pending→…→Resolved),
                 AssignTechnicianModal.tsx (user dropdown via EMPLOYEE_DIRECTORY dropdown perm),
                 ResolveModal.tsx (notes+cost), PriorityBadge.tsx, RequestTimeline.tsx
services/  bookingService.ts, maintenanceService.ts
hooks/     useBookings.ts, useAvailability.ts, useMaintenance.ts    # React Query
```

Action buttons wrapped in `PermissionGate` (Module 1+3): Employees see Submit/Cancel only; Asset Managers see Approve/Assign/Start/Resolve. Sidebar entries appear automatically — RESOURCE_BOOKING and MAINTENANCE are already in the PlatformPage seed, so the navigation builder needs nothing new.

Demo moments: availability preview shows the 9:30–10:30 rejection *before* submit (server re-validates); WorkflowStepper advances live; asset badge flips to "Under Maintenance" the instant Start is clicked.

---

## 7. Business Rules & Edge Cases

1. Booking window valid: `start < end`, not in the past, ≤ 8h, 15-min granularity.
2. Only assets in `isBookable` categories with status `AVAILABLE` accept bookings; RETIRED/LOST/UNDER_MAINTENANCE **[M4]** → 409.
3. Overlap = half-open interval vs CONFIRMED only (REJECTED/CANCELLED/COMPLETED never block); back-to-back allowed per PDF.
4. Reschedule atomic (one transaction): validate new window first; failure leaves the original untouched; past/non-CONFIRMED reschedules → 400.
5. One **open** request per asset (PENDING/APPROVED/TECHNICIAN_ASSIGNED/IN_PROGRESS); duplicate → 409 pointing at the existing request.
6. Illegal transitions → 409 via state machine; `reject` requires reason; `resolve` requires notes.
7. Resolve restores `ASSIGNED` when an active allocation exists **[M5]**, else `AVAILABLE`; never resolves back to UNDER_MAINTENANCE.
8. Only the assigned technician (or Admin/AM) may start/resolve; technician must be active; deactivating a technician mid-flight → request stays, AM reassigns.
9. Row scoping in services, not RBAC (Module 1+3 §8.3 rule): Employees act only on own rows; Dept Head reads department rows via `User.departmentId`.
10. Crons idempotent (`remindedAt` stamp; status-filtered auto-complete); safe across restarts.
11. Priority editable by requester only while PENDING.
12. Inactive users cannot book (login already blocked, Module 1+3 §9.2); their future CONFIRMED bookings are cancelled on deactivation (service hook in `users/`).
13. Envelope + `whitelist/forbidNonWhitelisted` DTOs throughout.

---

## 8. Notification / Audit Hooks (Module 10 interface)

Services emit typed events via `EventEmitter2`: `booking.created|rejected|cancelled|reminder`, `maintenance.submitted|approved|rejected|assigned|started|resolved`. Stub listener console-logs until Module 10; then the listener writes Notification + AuditLog rows (Ref B audit interceptor lands there, per Module 1+3 §11) — 6/7 code unchanged.

---

## 9. Build Order & Test Plan

**Build order:** schema (+`isBookable`, seed Meeting Rooms category + sample bookable assets **[M4 stub if needed]**) → migrate+seed → `availability.service` (pure fns + unit tests) → bookings controller/service → scheduler → state machine (unit tests) → maintenance controller/service → event stub → frontend services/hooks → BookingCalendar+Form → maintenance board+stepper → PermissionGate wiring.

| # | Test | Expected |
|---|---|---|
| 1 | Book Room A 9–10, then 9:30–10:30 | 2nd saved REJECTED + 409 with clash info |
| 2 | Then book 10–11 | CONFIRMED (boundary touch OK) |
| 3 | Two concurrent 10–11 requests | exactly one CONFIRMED |
| 4 | Book asset in non-bookable category / RETIRED asset | 409 |
| 5 | Reschedule into occupied slot | 409, original intact |
| 6 | Employee cancels someone else's booking | 403 (row scope) |
| 7 | Dept Head lists bookings | Only own-department rows |
| 8 | Cron pass: past CONFIRMED booking | COMPLETED; reminder fires once only |
| 9 | Submit (Screen broken, High) → approve → assign → start | asset UNDER_MAINTENANCE |
| 10 | Resolve with notes+cost | asset AVAILABLE (or ASSIGNED if allocated) |
| 11 | PENDING → resolve directly | 409 illegal transition |
| 12 | Second request on same asset while first open | 409 duplicate |
| 13 | Technician B starts request assigned to A | 403 |
| 14 | Employee token → `PATCH /maintenance/:id/approve` | 403 (matrix: no MAINTENANCE.UPDATE) |
| 15 | Booking attempt on UNDER_MAINTENANCE asset | 409 |
| 16 | Swagger `/api/docs` | all 6+7 endpoints documented |

---

## 10. Pattern Source Map

| Concern | Source | Adaptation |
|---|---|---|
| Feature-module skeleton, DTOs, envelope, Swagger | Ref B via Module 1+3 | verbatim |
| `@RequirePermission` guards, page keys, matrix, PermissionGate/navigation | Module 1+3 (Ref A model) | RESOURCE_BOOKING + MAINTENANCE rows already seeded — reused as-is |
| `isBookable` on AssetCategory | Ref B LibraryItem pattern | one extra master attribute, like `tagPrefix` |
| Multi-view pages (calendar⇄list, board⇄table), services layer, React Query | Ref B multi-view components | new domain components |
| Overlap check | new | half-open interval + `FOR UPDATE` transaction |
| State machine w/ transition map | new | single source-of-truth file, unit-tested |
| Scheduler | `@nestjs/schedule` | mock delivery until Module 10 |
| Row-level own/department scoping | Module 1+3 §8.3 rule | via `User.departmentId` (schema already has it) |

**Open items for the M4/M5 reports:** Asset model + `AssetStatus` enum definition (this report assumes `AVAILABLE/ASSIGNED/UNDER_MAINTENANCE/RETIRED/LOST`), active-allocation lookup for §4.3 restore, whether Module 5's overdue-flagging cron shares `booking-scheduler`, and working-hours config for availability slots (hardcode 08:00–20:00 until then).
