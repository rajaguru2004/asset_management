# AssetFlow — Modules 8–10 Consolidated Plan: Audit · Reports & Analytics · Logs & Notifications (FINAL)

> **Day-4 hackathon build (~8h).** Aligned to the **final** `module-01-03-auth-organization.md` (static RBAC matrix · one-shot JWT · static sidebar · Int IDs · envelope · Swagger) and `module-04-07-asset-operations.md` (whose `EventEmitter2` stubs were built for Module 10 to consume — that bill comes due here).
> Completes the PDF scope: Module 2 Dashboard is already fulfilled by the KPI extensions in 1+3 §9 and 4–7 §6.5.

---

## 0. Scope Decisions

| Full design | This plan | Reason |
|---|---|---|
| Auditor as join table + per-auditor asset assignment | `auditorIds Int[]` on the cycle; any listed auditor may mark any in-scope record | Assignment granularity is invisible in a demo; array + service check is 10 lines |
| Multi-stage cycle states (DRAFT→OPEN→REVIEW→CLOSED) | Two states: `OPEN → CLOSED` | The PDF needs create → verify → close-with-report; nothing more |
| PDF/XLSX report exports | **CSV export** (`?format=csv`, server-generated) | CSV opens in Excel and costs ~20 lines; pretty PDFs are polish `// TODO` |
| "Assets nearing retirement" report | **Deferred** `// TODO` | Needs expected-life data the schema doesn't carry; honest cut |
| WebSocket push notifications | **30s React Query polling** on the bell | Polling is indistinguishable in a demo; sockets are an hour of plumbing `// TODO` |
| Dept-scoped reports for Dept Head | Reports are Admin/AM/DH **org-wide** view; dept filtering is a query param, scoping `// TODO` | Single-org demo |
| Audit interceptor with per-resource decorators (Ref B `@AuditResource`) | **Lean global interceptor**: logs every mutating request (non-GET) with actor, method, route, body summary | Same audit-trail outcome, zero per-controller work |

**Kept in full — because they *are* the demo:** audit cycles with scope snapshot, Verified/Missing/Damaged marking, auto discrepancy report, **cycle close → MISSING assets flip to LOST** (transaction), **DAMAGED findings auto-raise maintenance requests** (cross-module wow moment), utilization/maintenance/department/heatmap analytics with CSV export, bell with unread badge, full activity trail, overdue-return alerts.

---

## 1. Module Functions

| Module | Function (business) | Core technical mechanism |
|---|---|---|
| **8 — Asset Audit** | Periodic physical verification: does the register match reality? Discrepancies become decisions (write off as LOST, send to repair), not surprises | Cycle = snapshot of in-scope assets as PENDING records → auditors mark → close in one transaction: lock records, generate discrepancy report, LOST/condition updates, maintenance auto-raise |
| **9 — Reports & Analytics** | Turn operational data into management answers: which assets earn their cost, which drain it, where the bottlenecks are | Read-only aggregation service over M4–7 tables (Prisma `groupBy` + raw SQL for the heatmap); CSV serializer; zero new writable state |
| **10 — Logs & Notifications** | Nobody digs for updates: events find their audience; every action leaves a who/what/when trail | One `NotificationListener` consuming the *already-emitted* M5/6/7/8 events → targeted Notification rows; global `ActivityLogInterceptor` for the mutation trail; overdue cron |

Module 9 writes nothing; Module 10 writes automatically. Both sit on top of M4–7 without touching its code — the event stubs were the contract.

---

## 2. Static RBAC Additions (final matrix delta — completes the app)

```ts
// common/rbac/permissions.enum.ts — ADD
AUDITS = 'AUDITS', REPORTS = 'REPORTS', ACTIVITY_LOGS = 'ACTIVITY_LOGS',
```

```ts
// common/rbac/role-permissions.ts — EXTEND
[ADMIN]:         { [R.AUDITS]: ALL, [R.REPORTS]: [VIEW], [R.ACTIVITY_LOGS]: [VIEW] },
[ASSET_MANAGER]: { [R.AUDITS]: [VIEW, CREATE, UPDATE],   // create cycles, resolve discrepancies
                   [R.REPORTS]: [VIEW] },
[DEPT_HEAD]:     { [R.AUDITS]: [VIEW], [R.REPORTS]: [VIEW] },
[EMPLOYEE]:      { /* nothing — auditor marking + notifications are auth-only endpoints */ },
```

Auditor pattern = technician pattern (4–7 §4.4): an auditor is **any active User** listed in `cycle.auditorIds`; marking endpoints are auth-only with a service-level assignment check — an Employee can be an auditor without matrix changes, and the 4 seeded roles stay locked. Notifications are inherently own-scoped → auth-only, no resource. Sidebar additions:

```ts
{ label: 'Audits',        href: '/audits',        resource: R.AUDITS },
{ label: 'Reports',       href: '/reports',       resource: R.REPORTS },
{ label: 'Activity Logs', href: '/activity-logs', resource: R.ACTIVITY_LOGS },
// Bell (notifications) renders for every authenticated user — no gate
```

---

## 3. Prisma Schema Additions

```prisma
enum AuditCycleStatus  { OPEN CLOSED }
enum AuditResult       { PENDING VERIFIED MISSING DAMAGED }

model AuditCycle {
  id           Int              @id @default(autoincrement())
  name         String                            // "Q3 Chennai Audit"
  location     String?                           // scope: "location" library dataId (optional)
  departmentId Int?                              // scope: department (optional)
  department   Department?      @relation(fields: [departmentId], references: [id])
  startDate    DateTime
  endDate      DateTime
  status       AuditCycleStatus @default(OPEN)
  auditorIds   Int[]                             // active users; validated in service
  createdById  Int
  createdBy    User             @relation("AuditCreator", fields: [createdById], references: [id])
  closedAt     DateTime?
  closedById   Int?
  records      AuditRecord[]
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  @@index([status])
}

model AuditRecord {
  id          Int         @id @default(autoincrement())
  cycleId     Int
  cycle       AuditCycle  @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  assetId     Int
  asset       Asset       @relation(fields: [assetId], references: [id])
  result      AuditResult @default(PENDING)
  notes       String      @default("")
  auditedById Int?                                // who marked it
  auditedAt   DateTime?
  @@unique([cycleId, assetId])                    // one verdict per asset per cycle
  @@index([cycleId, result])
}

model Notification {
  id        Int      @id @default(autoincrement())
  userId    Int                                   // recipient
  user      User     @relation(fields: [userId], references: [id])
  type      String                                // "ASSET_ASSIGNED", "BOOKING_REMINDER", ...
  title     String
  message   String
  refType   String?                               // "allocation" | "booking" | "maintenance" | "audit"
  refId     Int?                                  // deep-link target
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  @@index([userId, isRead])
}

model ActivityLog {
  id         Int      @id @default(autoincrement())
  userId     Int?                                  // actor (null = system/cron)
  user       User?    @relation(fields: [userId], references: [id])
  action     String                                // "CREATE" | "UPDATE" | "DELETE" | domain verb
  resource   String                                // "asset" | "allocation" | "booking" | ...
  resourceId Int?
  meta       Json     @default("{}")               // route, summary of changes/event payload
  createdAt  DateTime @default(now())
  @@index([resource, resourceId])
  @@index([userId])
  @@index([createdAt])
}
```

**One-column additions to M4–7 tables:** `AssetAllocation.overdueAlertedAt DateTime?` (idempotent overdue alert, same trick as `Booking.remindedAt`). Back-relations on `User` (`notifications`, `activityLogs`, `auditCyclesCreated`) and `Asset.auditRecords` — additive.

No new libraries; audit scope reuses the `location` library.

---

## 4. Technical Approach (the three core mechanisms)

### 4.1 M8 — Cycle lifecycle (snapshot → mark → transactional close)

**Create** (`AUDITS.CREATE`, one `$transaction`): validate auditors active + dates → create cycle → **snapshot**: select in-scope assets (`isActive: true`, `status NOT IN (DISPOSED)`, filtered by `location` and/or `departmentId` when set — department scope = assets whose ACTIVE allocation targets that department or its members) → `createMany` PENDING `AuditRecord`s. The snapshot freezes the checklist: assets registered after creation belong to the next cycle.

**Mark** (auth-only + assignment check): auditor in `cycle.auditorIds` (or Admin/AM) sets `result: VERIFIED|MISSING|DAMAGED` + notes; cycle must be OPEN; re-marking allowed while open (last verdict wins, `auditedById/At` stamped).

**Close** (`AUDITS.UPDATE`, one `$transaction`) — the demo centerpiece:
1. Reject if any record still PENDING (409 listing the count) — no half-audited closures.
2. Cycle → CLOSED (+`closedAt/closedById`); records become immutable (service refuses marks on CLOSED cycles).
3. **MISSING → asset `status: LOST`**; if it had an ACTIVE allocation, close it (`RETURNED`, note "lost in audit CYC-n").
4. **DAMAGED → asset `condition: DAMAGED`** + auto-create a PENDING `MaintenanceRequest` ("Flagged in audit: {notes}", priority HIGH) **unless** the asset already has an open one (the M7 partial index backstops this).
5. Emit `audit.closed` + `audit.discrepancy` events (→ Module 10 notifies Admin/AM).

**Discrepancy report** (`GET /audits/:id/report`): computed — totals, verified %, and the non-VERIFIED records with asset, last holder, auditor, notes. `?format=csv` for export. Works on OPEN cycles too (progress view); final once CLOSED.

### 4.2 M9 — Aggregation service (read-only)

One `reports.service.ts`; each report = one method, most are Prisma `groupBy`:

| Report | Query core |
|---|---|
| **Utilization** (most/least used) | `assetAllocation.groupBy(['assetId'], _count)` + days-held sum (`COALESCE(returnedAt, now()) - allocatedAt`); join asset name/tag/cost → top-N and bottom-N (idle = zero allocations, AVAILABLE) |
| **Maintenance frequency** | `maintenanceRequest.groupBy(['assetId'])` + per-category rollup + `_sum.cost` — "repeat offenders" table with repair spend vs `acquisitionCost` |
| **Department allocation summary** | ACTIVE allocations grouped by department (direct `departmentId` + holder's department), asset counts + value (`_sum acquisitionCost`) |
| **Booking heatmap** | Raw SQL: `SELECT EXTRACT(DOW FROM "startTime") d, EXTRACT(HOUR FROM "startTime") h, COUNT(*) FROM "Booking" WHERE status IN ('CONFIRMED','COMPLETED') GROUP BY d, h` → 7×12 grid (08:00–20:00) |
| **Audit summary** | Per closed cycle: verified/missing/damaged counts, discrepancy rate trend |

Every endpoint accepts `?from&to` (default 90 days) and `?format=csv`. CSV = tiny serializer in `common/utils/csv.util.ts` (header row + escaping), `Content-Disposition: attachment`. No new state, no cron, no cache — demo datasets are small. `// TODO: dashboard-style caching if data grows.`

### 4.3 M10 — Listener + interceptor + overdue cron

**NotificationListener** (`@OnEvent('**')` on the *existing* M4–8 emissions — zero changes to those modules):

| Event (already emitted) | Recipients | PDF notification |
|---|---|---|
| `allocation.created` | holder (or dept-head for dept allocations) | "Laptop Assigned" |
| `allocation.returned` | allocator | Return confirmed |
| `transfer.requested / approved / rejected` | AM+Admin / requester+old holder / requester | "Transfer Approved" |
| `allocation.overdue` (cron below) | holder + AM | "Return Overdue" |
| `booking.created / cancelled` | booker | "Booking Confirmed/Cancelled" |
| `booking.rejected` | requester | conflict info |
| `booking.reminder` (M6 cron) | booker | "Meeting Reminder" |
| `maintenance.submitted` | AM + Admin | new request |
| `maintenance.approved / rejected` | requester | "Maintenance Approved" |
| `maintenance.assigned` | technician | work order |
| `maintenance.resolved` | requester + AM | repair done |
| `audit.closed / discrepancy` | Admin + AM (+ cycle creator) | "Audit Completed / Discrepancy Flagged" |

Each handler writes targeted `Notification` rows **and** a domain `ActivityLog` row (the business-verb trail: "approved transfer #12"). Role-targeted fan-out = one indexed query on `roleId`.

**ActivityLogInterceptor** (global, after the guards): for non-GET requests, on success, log `{userId, action: method-map, resource: first path segment, resourceId: :id param, meta: {route, status}}`. Generic trail catches anything the domain events miss; skips `/auth/login` body (never log credentials).

**Overdue cron** (added to the shared `scheduler.service.ts`, 4–7 §0): every 15 min, ACTIVE allocations with `expectedReturnDate < now()` and `overdueAlertedAt IS NULL` → emit `allocation.overdue`, stamp. Idempotent, symmetric with `remindedAt`. (`/allocations/overdue` + KPI stay computed-on-read; the cron exists only to *notify*.)

**API + UI:** `GET /notifications` (own, paginated) · `GET /notifications/unread-count` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all` — all auth-only. `GET /activity-logs` (`ACTIVITY_LOGS.VIEW`, Admin) with user/resource/action/date filters. Bell in `AdminHeader` polls unread-count every 30s; dropdown shows latest 10; click marks read + deep-links via `refType/refId`.

---

## 5. Backend Structure (extends the M4–7 tree)

```
src/
├── audits/          audits.module/.controller/.service
│   └── dto/ create-cycle.dto, mark-record.dto, query-cycles.dto
├── reports/         reports.module/.controller/.service        # read-only
├── notifications/   notifications.module/.controller/.service
│   └── notification.listener.ts        # @OnEvent handlers (the event→row map §4.3)
├── activity-logs/   activity-logs.module/.controller/.service
│   └── activity-log.interceptor.ts     # global APP_INTERCEPTOR
└── common/
    ├── scheduler/scheduler.service.ts  # + overdue cron (reminder/auto-complete already here)
    └── utils/csv.util.ts
```

---

## 6. API Endpoints

### 6.1 `audits/` (M8)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/audits` | `(AUDITS, VIEW)` | cycles + progress (`marked/total`); auditors also see cycles assigned to them (auth-scope union) |
| GET | `/audits/my` | auth-only | cycles where requester ∈ auditorIds |
| GET | `/audits/:id` | `(AUDITS, VIEW)` or assigned auditor | cycle + records + assets |
| POST | `/audits` | `(AUDITS, CREATE)` | §4.1 snapshot transaction; 400 if scope matches zero assets |
| PATCH | `/audits/:id/records/:recordId` | auth-only + auditor/AM/Admin check | mark VERIFIED/MISSING/DAMAGED + notes; cycle must be OPEN |
| POST | `/audits/:id/close` | `(AUDITS, UPDATE)` | §4.1 close transaction; 409 while PENDING records remain |
| GET | `/audits/:id/report` | `(AUDITS, VIEW)` | discrepancy report; `?format=csv` |

### 6.2 `reports/` (M9) — all `(REPORTS, VIEW)`, all accept `?from&to&format=csv`

| Path | Returns |
|---|---|
| `/reports/utilization` | most/least-used + idle assets (count, days held, cost) |
| `/reports/maintenance` | frequency by asset + category, repair spend vs acquisition cost |
| `/reports/departments` | per-department: active allocations, asset count, total value |
| `/reports/booking-heatmap` | 7×12 grid `{dow, hour, count}` |
| `/reports/audit-summary` | per closed cycle verdict counts + discrepancy rate |

### 6.3 `notifications/` (auth-only) + `activity-logs/`

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/notifications` | auth-only | own, paginated, `?unread=true` |
| GET | `/notifications/unread-count` | auth-only | bell badge (30s poll) |
| PATCH | `/notifications/:id/read` · `/notifications/read-all` | auth-only | own rows |
| GET | `/activity-logs` | `(ACTIVITY_LOGS, VIEW)` | filters: userId, resource, action, date range; paginated |

---

## 7. Frontend Structure

```
app/(admin)/
├── audits/page.tsx            # cycle list + progress bars
├── audits/[id]/page.tsx       # marking checklist + close button + report tab
├── reports/page.tsx           # tabbed analytics (Recharts) + Export CSV buttons
├── notifications/page.tsx     # full list, mark-read
└── activity-logs/page.tsx     # admin trail table + filters
components/
├── audits/    CycleForm (scope pickers: location library + department), CycleCard (progress),
│              AuditChecklist (rows: asset · holder · Verified/Missing/Damaged segmented control
│              + notes), CloseCycleDialog (summary: "3 missing → LOST, 2 damaged → maintenance"),
│              DiscrepancyReport
├── reports/   UtilizationChart (bar), MaintenanceFrequencyTable, DeptAllocationChart (donut),
│              BookingHeatmap (7×12 CSS-grid, intensity by count), ExportButton
└── notifications/ NotificationBell (badge + dropdown, in AdminHeader), NotificationList,
                   ActivityLogTable
services/  auditService, reportService, notificationService, activityLogService
```

**Demo moments:** create "Q3 Chennai Audit" → checklist appears pre-filled · mark one asset MISSING, one DAMAGED · close → confirmation dialog spells out consequences → asset flips **LOST** in the registry and a **HIGH maintenance request materializes** in M7's queue · bell badge ticks up across the app · booking heatmap shows the seeded 9–10 hotspot · Export CSV opens in Excel.

---

## 8. Seed Additions (idempotent)

1. One **CLOSED** cycle (last month): mostly VERIFIED, 1 MISSING (its asset seeded LOST), 1 DAMAGED — audit-summary report and history are non-empty immediately.
2. One **OPEN** cycle (Chennai scope) with ~6 PENDING records, two Employees as auditors — live marking demo ready.
3. ~10 notifications across users (mixed read/unread — bell badge non-zero at login) + ~30 activity-log rows consistent with the seeded M4–7 story.
4. Bookings seeded in 4–7 already cluster 9–11 → heatmap has a visible hotspot for free.

---

## 9. Business Rules & Edge Cases

**M8:** snapshot at creation (later assets → next cycle) · one verdict per (cycle, asset), re-markable while OPEN, immutable after CLOSED · only assigned auditors/AM/Admin mark; auditors must be active users; deactivated auditor mid-cycle → Admin edits `auditorIds` · close blocked while PENDING remain (409 with count) · close is one transaction: LOST flips + allocation closure + maintenance auto-raise + report freeze · LOST assets can't be allocated/booked (already enforced by M5/M6 status rules) · cycles are never deleted — CLOSED is the terminal state.
**M9:** read-only — no report endpoint mutates · date ranges validated (`from ≤ to`, cap 366 days) · CSV escapes quotes/commas/newlines · money only from `acquisitionCost`/`cost` (the PDF's "not accounting" boundary).
**M10:** notifications own-scoped — reading others' → 404 · listener failures never break the source transaction (events fire post-commit; listener try/catch-logs) · interceptor logs only successes (failed requests changed nothing) and never logs credential bodies · overdue alert once per allocation (`overdueAlertedAt`); returning the asset clears nothing retroactively (history is history) · deleting users never cascades to logs (`userId` nullable — trail outlives actors).
**All:** envelope + `whitelist/forbidNonWhitelisted` + Swagger, as everywhere.

---

## 10. Build Order (Day 4, ~8h)

| Slot | Task | ~Time |
|---|---|---|
| 1 | Schema (§3) + `overdueAlertedAt` + migrate + seed (cycles/notifications/logs) | 0:45 |
| 2 | RBAC deltas (3 resources + matrix + mirror + NAV) | 0:15 |
| 3 | Audits: create-snapshot + mark + close transactions + report | 1:30 |
| 4 | Reports service (5 aggregations) + CSV util + controller | 1:15 |
| 5 | Notifications: model/service/controller + **listener** (event map §4.3) | 1:00 |
| 6 | ActivityLogInterceptor + activity-logs endpoint + overdue cron | 0:45 |
| 7 | FE: audit pages (checklist, close dialog, report) | 1:15 |
| 8 | FE: reports page (charts + heatmap + export) | 1:00 |
| 9 | FE: NotificationBell + list + activity-log table | 0:45 |
| 10 | Polish + full end-to-end demo dry-run (register→allocate→book→repair→audit→report) | 0:30 |

---

## 11. Test Plan

| # | Test | Expected |
|---|---|---|
| 1 | Create cycle scoped to Chennai | PENDING records = exactly the Chennai assets at that moment |
| 2 | Register a new Chennai asset after creation | Not in the open cycle |
| 3 | Unassigned employee marks a record | 403; assigned auditor succeeds |
| 4 | Close with 2 PENDING left | 409 listing count |
| 5 | Mark MISSING (allocated asset) + DAMAGED → close | Asset LOST + its allocation closed; DAMAGED asset → condition set + HIGH maintenance request created |
| 6 | DAMAGED asset already had an open request | No duplicate (partial index + service check) |
| 7 | Mark a record on a CLOSED cycle | 409 immutable |
| 8 | Allocate/book a LOST asset | 409 (M5/M6 rules) |
| 9 | `/reports/utilization` | Most-used matches seeded allocation counts; idle list correct |
| 10 | `/reports/booking-heatmap` | 9–11 hotspot present |
| 11 | `/reports/departments?format=csv` | Valid CSV download, correct escaping |
| 12 | Allocate an asset → holder's bell | Unread count +1, "Laptop Assigned"; other users unaffected |
| 13 | Cron pass on seeded overdue allocation | One `Return Overdue` notification, only once (rerun = no dup) |
| 14 | Booking reminder fires (M6 cron) | Notification row created, `remindedAt` stamped |
| 15 | Any mutation (e.g. PATCH asset) | ActivityLog row with actor/resource/id |
| 16 | Employee fetches another user's notification / `GET /activity-logs` | 404 / 403 |
| 17 | Close cycle → Admin + AM bells | "Audit Completed" + discrepancy notifications |
| 18 | Swagger `/api/docs` | All M8–10 endpoints documented |

---

## 12. Deferred Feature Ledger (all `// TODO` in code)

- PDF/XLSX exports (CSV shipped) · "nearing retirement" report (needs expected-life data)
- WebSocket push (polling shipped) · email delivery of notifications
- Dept-scoped report filtering for Dept Head · report caching
- Per-auditor asset assignment within a cycle · reopen-cycle flow (Admin override)
- Ref B `@AuditResource` per-resource decorators (generic interceptor shipped)
- Notification preferences/mute · retention/archival policy for logs

---

## 13. Pattern Source Map

| Concern | Source |
|---|---|
| Feature modules, DTOs, guards, envelope, Swagger | Ref B via final 1+3 |
| Static matrix + mirror + static NAV | Final 1+3 §4/§7 |
| Auditor-as-any-user (no 5th role) | Technician pattern, 4–7 §4.4 |
| Snapshot + transactional close, partial-index backstop | 4–7 transaction patterns (tag txn, transfer swap) |
| Event → Notification/ActivityLog listener | Consumes 4–7 §4.4 EventEmitter2 stubs (designed for this) |
| ActivityLogInterceptor | Lean port of Ref B `audit.interceptor` + `AuditLog` model (deferral honored from 1+3 §13) |
| Idempotent crons (`overdueAlertedAt`) | `remindedAt` pattern, 4–7 §4.3 |
| Heatmap/groupBy aggregations, CSV export | NEW (Ref A had chart/export screens as precedent) |
```
