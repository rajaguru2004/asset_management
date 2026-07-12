# AssetFlow — Project Scope Document
### Enterprise Asset & Resource Management System

**Document Type:** Project Scope / Requirements Specification
**Source:** AssetFlow Hackathon Problem Statement
**Mockup (POC):** https://app.excalidraw.com/l/65VNwvy7c4X/5ceOBMjbDby

---

## 1. Overview

AssetFlow is a centralized ERP platform designed to digitize how organizations track, allocate, and maintain physical assets and shared resources. It is industry-agnostic — any organization with equipment, furniture, vehicles, or shared spaces (offices, schools, hospitals, factories, agencies) can adopt it to replace manual tracking methods such as spreadsheets and paper logs.

The platform delivers structured asset lifecycles, centralized resource booking, and real-time visibility into who holds what, where it is, and its condition — built on clean architecture, role-based workflows, and scalable module design.

---

## 2. Vision & Mission

**Vision:** Simplify and digitize asset and resource tracking, allocation, and maintenance through a single centralized ERP platform, applicable across any organization type.

**Mission:** Build a user-centric, responsive application that gives staff intuitive tools to:
- Set up departments, asset categories, and the employee directory
- Register and track assets through their full lifecycle
- Allocate assets to employees/departments with conflict handling
- Book shared resources (rooms, vehicles, equipment) without overlaps
- Run a structured maintenance approval workflow
- Run structured audit cycles to catch discrepancies
- Get notified of overdue returns, bookings, and maintenance events

---

## 3. Problem Statement

Organizations commonly manage physical assets and shared resources using disconnected tools — spreadsheets, paper logs, or ad hoc communication. This leads to:
- No single source of truth for asset location, condition, or custody
- Double-booking of shared resources and double-allocation of assets
- Maintenance work starting without approval or tracking
- No structured mechanism to audit assets and catch loss/damage
- No proactive visibility into overdue returns, bookings, or maintenance

AssetFlow solves this with a unified platform covering the full asset and resource lifecycle, while deliberately staying out of purchasing, invoicing, and accounting concerns.

---

## 4. Objectives

- Provide a single system of record for departments, asset categories, and employees
- Enforce a well-defined asset lifecycle with controlled state transitions
- Prevent conflicting allocations and overlapping bookings through system-level validation
- Route maintenance work through a mandatory approval workflow before repairs begin
- Enable periodic, structured audit cycles with auto-generated discrepancy reporting
- Give every role a real-time operational snapshot via dashboard KPIs and notifications
- Enforce realistic, secure role assignment (no self-elevated admin/manager roles)

---

## 5. Scope

### 5.1 In Scope
- Department, asset category, and employee directory management
- Full asset lifecycle tracking (Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed)
- Asset allocation, transfer, and return workflows with conflict prevention
- Shared resource booking with time-slot overlap validation
- Maintenance request → approval → resolution workflow
- Scheduled audit cycles with auditor assignment and discrepancy reporting
- Notifications and full activity/audit logs
- Reports & analytics dashboard
- Role-based access control with admin-driven role promotion

### 5.2 Out of Scope
- Purchasing / procurement workflows
- Invoicing and billing
- Accounting / financial ledger integration
- Payroll or HR management beyond the employee directory
- Third-party vendor management

---

## 6. User Roles & Permissions

| Role | Responsibilities |
|---|---|
| **Admin** | Manages departments, asset categories, audit cycles, and employee/role assignment (Organization Setup). Views organization-wide analytics. |
| **Asset Manager** | Registers and allocates assets. Approves transfers, maintenance requests, and audit discrepancy resolution. Approves asset returns and condition check-in notes. |
| **Department Head** | Views assets allocated to their department. Approves allocation/transfer requests within their department. Books shared resources on behalf of the department. |
| **Employee** | Views assets allocated to them. Books shared resources. Raises maintenance requests. Initiates return/transfer requests. |

### Role Assignment Rule
Signup creates an **Employee account only** — no role selection at signup. Admin promotes Employees to **Department Head** or **Asset Manager** exclusively from the Employee Directory (Organization Setup → Tab C). This is the **only** place roles are assigned, preventing self-elevation.

---

## 7. Functional Modules (Screens)

### 7.1 Login / Signup
- Signup creates an Employee account only (no role selection)
- Admin promotes Department Heads / Asset Managers from Employee Directory
- Email & password login, forgot password, session validation

### 7.2 Dashboard / Home
- KPI cards: Assets Available, Assets Allocated, Maintenance Today, Active Bookings, Pending Transfers, Upcoming Returns
- Overdue returns (past Expected Return Date) highlighted separately from upcoming ones
- Quick actions: Register Asset, Book Resource, Raise Maintenance Request

### 7.3 Organization Setup (Admin only — 3 tabs)
**Tab A — Department Management**
- Create/edit/deactivate department
- Assign Department Head, optional Parent Department (hierarchy), Status (Active/Inactive)

**Tab B — Asset Category Management**
- Create/edit categories (Electronics, Furniture, Vehicles, etc.)
- Optional category-specific fields (e.g., warranty period for Electronics)

**Tab C — Employee Directory**
- Fields: Name, Email, Department, Role, Status (Active/Inactive)
- Admin promotes Employee → Department Head / Asset Manager here

### 7.4 Asset Registration & Directory
- Register: Name, Category, auto-generated Asset Tag (e.g., AF-0001), Serial Number, Acquisition Date, Acquisition Cost (reporting/ranking only — not linked to accounting), Condition, Location, photo/documents, shared/bookable flag
- Search/filter by Asset Tag, Serial Number, QR code, category, status, department, location
- Lifecycle status shown per asset
- Per-asset history: allocation history + maintenance history

### 7.5 Asset Allocation & Transfer
- Allocate asset to employee/department with optional Expected Return Date
- **Conflict rule:** cannot allocate an asset already held by someone else — system blocks the action, shows current holder, and offers a Transfer Request button instead
  - *Example: Priya holds Laptop AF-0114. Raj's allocation attempt is blocked with "currently held by Priya" and a Transfer Request option.*
- **Transfer workflow:** Requested → Approved (Asset Manager/Department Head) → Re-allocated (history auto-updated)
- **Return flow:** mark returned → capture condition check-in notes → status reverts to Available
- Overdue allocations (past Expected Return Date) auto-flagged, feeding Dashboard + Notifications

### 7.6 Resource Booking
- Calendar view of a resource's existing bookings
- **Overlap validation:** rejects any request overlapping an existing booking
  - *Example: Room B2 booked 9:00–10:00. A 9:30–10:30 request is rejected; a 10:00–11:00 request is accepted (back-to-back is valid).*
- Booking status: Upcoming, Ongoing, Completed, Cancelled
- Cancel/reschedule; reminder notification before the slot starts

### 7.7 Maintenance Management
- Raise request: select asset, describe issue, set priority, attach photo
- **Workflow:** Pending → Approved / Rejected (Asset Manager) → Technician Assigned → In Progress → Resolved
- Asset status auto-updates to Under Maintenance on approval, back to Available on resolution
- Maintenance history retained per asset

### 7.8 Asset Audit
- Create an Audit Cycle (scope: department/location, date range)
- Assign one or more auditors to the cycle
- Auditor marks each asset: Verified / Missing / Damaged
- System auto-generates a discrepancy report for flagged items
- Close Audit Cycle — locks the cycle, updates affected asset statuses (e.g., Lost for confirmed-missing items)
- Audit history retained per cycle

### 7.9 Reports & Analytics
- Asset utilization trends: most-used vs. idle assets
- Maintenance frequency by asset/category
- Assets due for maintenance or nearing retirement
- Department-wise allocation summary
- Resource booking heatmap (peak usage windows)
- Exportable reports

### 7.10 Activity Logs & Notifications
- Notification triggers: Asset Assigned, Maintenance Approved/Rejected, Booking Confirmed/Cancelled/Reminder, Transfer Approved, Overdue Return Alert, Audit Discrepancy Flagged
- Full audit log of admin/manager/employee actions (who did what, when)

---

## 8. Asset Lifecycle State Machine

**States:** `Available` · `Allocated` · `Reserved` · `Under Maintenance` · `Lost` · `Retired` · `Disposed`

**Representative transitions:**
- `Available → Allocated` (on successful allocation)
- `Allocated → Available` (on return)
- `Available ↔ Under Maintenance` (on maintenance approval / resolution)
- `Available → Reserved` (shared resource booked)
- `Under Maintenance / Available → Lost` (confirmed-missing during audit closure)
- `Any active state → Retired → Disposed` (end-of-life)

The lifecycle must be enforced at the system level — an asset cannot be allocated while `Allocated`, `Under Maintenance`, `Lost`, `Retired`, or `Disposed`, and cannot be double-booked while `Reserved` for an overlapping slot.

---

## 9. Core Business Rules

| Rule | Description |
|---|---|
| No double-allocation | An asset held by one employee/department cannot be allocated to another; a Transfer Request is required instead. |
| No overlapping bookings | Shared resources cannot be booked for overlapping time slots; back-to-back slots are allowed. |
| Maintenance gating | Repair work cannot begin until the maintenance request is approved; asset status flips to Under Maintenance only on approval. |
| Audit-driven status updates | Confirmed-missing assets from a closed audit cycle are automatically marked Lost. |
| Overdue detection | Allocations and bookings past their expected return/end are auto-flagged on the Dashboard and via Notifications. |
| Realistic role assignment | No self-assigned admin/manager roles; all promotions happen via Admin action in the Employee Directory. |

---

## 10. End-to-End Workflow Summary

1. Admin sets up departments, asset categories, and promotes select employees to Department Head / Asset Manager.
2. Asset Manager registers a new asset — it enters the system as **Available**.
3. Asset is allocated to an employee/department (blocked with a Transfer Request prompt if already allocated), or marked as a shared bookable resource.
4. Employees book shared resources by time slot; overlapping requests are rejected automatically.
5. If an asset needs repair, the holder raises a maintenance request, which must be approved before work begins and before the asset flips to Under Maintenance.
6. Assets are transferred or returned as needs change; overdue returns are flagged automatically.
7. Periodic audit cycles assign auditors, verify assets, and auto-generate discrepancy reports before closing.
8. All activity is tracked through notifications, logs, and reports.

---

## 11. Core Data Entities & Relationships

- **Department** — has a Head, optional Parent Department (hierarchy), Status
- **Employee** — belongs to a Department, has a Role, Status
- **Asset Category** — defines category-specific fields (e.g., warranty period)
- **Asset** — belongs to a Category, has a Lifecycle Status, Location, Condition, optional Acquisition data, shared/bookable flag; linked to Allocation History and Maintenance History
- **Allocation / Transfer** — links Asset ↔ Employee/Department, tracks Requested/Approved/Re-allocated states and Expected Return Date
- **Booking** — links Asset (shared/bookable) ↔ Employee/Department, time slot, Status (Upcoming/Ongoing/Completed/Cancelled)
- **Maintenance Request** — links Asset ↔ Requestor, Priority, Status (Pending/Approved/Rejected/Technician Assigned/In Progress/Resolved)
- **Audit Cycle** — scope (department/location), date range, assigned Auditors, per-asset verification results, generated Discrepancy Report
- **Notification** — event type, recipient, related entity, timestamp
- **Activity Log** — actor, action, entity affected, timestamp

---

## 12. Non-Functional Requirements

- **Architecture:** Proper ERP architecture with reusable, modular components; clean separation of concerns between modules (Org Setup, Assets, Bookings, Maintenance, Audits, Reports)
- **Security:** Role-based access control (RBAC) enforced server-side; no client-side role trust; session validation on every request
- **Usability:** Intuitive, responsive UI/UX across all roles and screen sizes
- **Data Integrity:** Referential integrity across departments, employees, assets, bookings, maintenance requests, and audits
- **Auditability:** Full activity logging for traceability (who did what, when)
- **Scalability:** Module design should support adding new asset categories, roles, or resource types without structural rework

---

## 13. Suggested Technical Approach *(optional — not mandated by problem statement)*

Given the modular, workflow-heavy nature of AssetFlow, a typical implementation could use:
- **Backend:** NestJS (modular architecture, RBAC via guards/decorators, JWT auth) + PostgreSQL via Prisma
- **Frontend:** Next.js + TypeScript, TanStack Query for data fetching, React Hook Form + Zod for validation, ShadCN UI for components
- **Notifications:** Event-driven triggers (e.g., queue/cron for overdue checks, reminders)
- **File/Photo Storage:** Object storage for asset photos, maintenance attachments, and documents
- **Reports:** Server-side aggregation queries with exportable output (CSV/PDF)

*(This section reflects one possible stack choice and can be adapted to the team's preferred technology.)*

---

## 14. Deliverables

- Working application covering all 10 screens/modules listed in Section 7
- Enforced role-based access control with realistic account creation (no self-elevation)
- Functional asset lifecycle with valid state transitions
- Conflict-free allocation and booking logic (demonstrable via the documented examples)
- End-to-end maintenance approval workflow
- End-to-end audit cycle with discrepancy report generation
- Notification system and activity log
- Reports & analytics dashboard with exportable output

---

## 15. Assumptions & Constraints

- The system is industry-agnostic; no industry-specific fields are hardcoded beyond category-level customization
- Purchasing, invoicing, and accounting are explicitly excluded and should not be modeled
- Acquisition Cost is stored for reporting/ranking purposes only — it has no link to any accounting module
- All role promotions are Admin-driven; there is no self-service path to Department Head or Asset Manager
- The Excalidraw link serves as the UI/UX reference (POC) and should guide screen layout, not dictate final visual design

---

## 16. Success Criteria

- All core conflict rules (double-allocation, booking overlap) are provably enforced, not just described
- Maintenance work is never shown as "in progress" without a prior approval record
- Closing an audit cycle correctly and automatically updates statuses for confirmed-missing/damaged assets
- Dashboard KPIs and notifications reflect real-time system state (overdue items surface without manual refresh/search)
- Role-based views correctly restrict what each of the four roles can see and do