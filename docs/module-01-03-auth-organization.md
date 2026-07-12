# AssetFlow — Module 1+3 Implementation Plan: Auth, RBAC & Organization Setup

> **8-hour hackathon build.** Goal: polished, fully-working demo that wins — not enterprise completeness.
> Clean architecture preserved (NestJS feature modules, Prisma, JWT, RBAC via guards, React Query).
> Everything non-essential is **cut or deferred with a `// TODO:` marker**, never half-built.

**Supersedes** `module-01-login-signup.md`.
**References:** Ref A — Excel Engineering (dynamic RBAC, OTP, nav builder — mostly deferred here). Ref B — SHIS HRM (NestJS feature-module skeleton, Prisma, guards+decorators, Swagger, department hierarchy + head, LibraryItem masters, React Query) — the structural base.

---

## 0. Scope Decisions (what's in, what's deferred, and why)

| Full enterprise design | This plan | Reason |
|---|---|---|
| Dynamic `PlatformPage` table + CRUD | **Cut.** Permissions are a static enum matrix in code | No admin edits pages in an 8h demo. Saves a whole module + UI. |
| `PermissionCacheService` (Map cache + invalidation) | **Cut.** Static `ROLE_PERMISSIONS` constant, O(1) lookup | Cache exists to avoid DB hits on a matrix that never changes at runtime. In-memory constant is already faster and can't go stale. |
| 2-step OTP login (`login → verify-otp → resend`) | **Cut.** One-shot `POST /auth/login` → JWT | OTP mocked to `123456` adds 3 endpoints + 2 screens for zero demo value. |
| Dynamic navigation builder (`GET /navigation`) | **Cut.** Static sidebar config array, filtered by role | Sidebar has ~2–8 fixed items. Static array + `hasPermission()` filter is ~20 lines. |
| Advanced role management (`roles` CRUD, matrix update) | **Cut.** 4 roles seeded, matrix in code | No new roles created live. Promotion (`Employee → X`) still fully works via user role field. |
| `RolePagePermission` table | **Cut.** Matrix is a TS constant | Fewer tables, no join per request. |
| Forgot/reset-password OTP flow | **Deferred** (`// TODO`) | Not in the core demo narrative. |
| Department org-chart view + view switcher | **Deferred** (`// TODO`) | Table view demos CRUD fully; org chart is polish-if-time. |
| Audit interceptor, history tables, change-requests, User/Employee split | **Deferred** (Module 10) | Not needed for this demo. |

**Kept in full — because they *are* the demo:** JWT auth, RBAC guards, Departments CRUD + hierarchy + head, Asset Categories CRUD + custom fields, Employee Directory + **live role promotion (no re-login)**, dashboard KPIs, validations, envelope responses, Swagger.

---

## 1. Combined Scope (from the PDF)

**Module 1 — Login/Signup:** signup creates Employee only (no role selection); email+password login; session validation; no self-elevation.

**Module 3 — Organization Setup (Admin, 3 tabs):**
- **Tab A Departments:** create/edit/deactivate; assign Department Head; optional Parent Department (hierarchy); Active/Inactive.
- **Tab B Asset Categories:** create/edit (Electronics, Furniture, Vehicles…); optional category-specific fields (e.g. warranty period).
- **Tab C Employee Directory:** name/email/department/role/status; Admin promotes Employee → Department Head / Asset Manager **here and only here**.

Tab C *is* the user-management half of Module 1; RBAC becomes demonstrable once roles can be assigned.

---

## 2. Monorepo Layout

```
assetflow/
├── docker-compose.yml            # postgres only (backend + frontend run via npm for fast reload)
└── apps/
    ├── backend/                  # NestJS 10 + Prisma
    └── frontend/                 # Next.js App Router
```

---

## 3. Backend Structure (NestJS feature modules)

```
apps/backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                   # 4 roles, admin user, sample depts + categories + employees
└── src/
    ├── main.ts                   # global pipes, exception filter, Swagger, cookies, CORS
    ├── app.module.ts
    ├── prisma/  prisma.module.ts, prisma.service.ts
    ├── common/
    │   ├── decorators/
    │   │   ├── public.decorator.ts             # @Public() — skip auth
    │   │   ├── current-user.decorator.ts       # @CurrentUser()
    │   │   └── require-permission.decorator.ts  # @RequirePermission(Resource, Action)
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts               # passport-jwt, honors @Public
    │   │   └── permissions.guard.ts            # reads metadata → ROLE_PERMISSIONS lookup (NO cache table)
    │   ├── rbac/
    │   │   ├── permissions.enum.ts             # Resource + Action enums
    │   │   └── role-permissions.ts             # STATIC matrix constant
    │   └── filters/http-exception.filter.ts    # {success,message,data} envelope
    ├── auth/
    │   ├── auth.module.ts / .controller.ts / .service.ts
    │   ├── strategies/jwt.strategy.ts          # payload {sub, roleId} → req.user
    │   └── dto/  register.dto.ts, login.dto.ts, change-password.dto.ts
    ├── users/                                   # Tab C Employee Directory
    │   ├── users.module.ts / .controller.ts / .service.ts
    │   └── dto/  create-user.dto.ts, update-user.dto.ts, query-users.dto.ts, assign-role.dto.ts
    ├── departments/                             # Tab A
    │   ├── departments.module.ts / .controller.ts / .service.ts
    │   └── dto/  create-department.dto.ts, update-department.dto.ts
    ├── asset-categories/                        # Tab B
    │   ├── asset-categories.module.ts / .controller.ts / .service.ts
    │   └── dto/  create-category.dto.ts, update-category.dto.ts
    └── dashboard/                               # KPI stats
        └── dashboard.module.ts / .controller.ts / .service.ts
```

Global guard order via `APP_GUARD`: `JwtAuthGuard` → `PermissionsGuard`. Endpoints opt out with `@Public()`.

---

## 4. Static RBAC (the key simplification)

No permission tables, no cache, no DB round-trip for the matrix. Permissions live in code.

```ts
// common/rbac/permissions.enum.ts
export enum Resource {
  DEPARTMENTS = 'DEPARTMENTS',
  ASSET_CATEGORIES = 'ASSET_CATEGORIES',
  EMPLOYEE_DIRECTORY = 'EMPLOYEE_DIRECTORY',
  DASHBOARD = 'DASHBOARD',
}
export enum Action { VIEW = 'VIEW', CREATE = 'CREATE', UPDATE = 'UPDATE', DELETE = 'DELETE' }

// role ids match seeded RoleMaster ids
export const ADMIN = 1, ASSET_MANAGER = 2, DEPT_HEAD = 3, EMPLOYEE = 4;
```

```ts
// common/rbac/role-permissions.ts
import { Resource as R, Action as A, ADMIN, ASSET_MANAGER, DEPT_HEAD, EMPLOYEE } from './permissions.enum';

// roleId → resource → allowed actions
export const ROLE_PERMISSIONS: Record<number, Partial<Record<R, A[]>>> = {
  [ADMIN]: {
    [R.DEPARTMENTS]:         [A.VIEW, A.CREATE, A.UPDATE, A.DELETE],
    [R.ASSET_CATEGORIES]:    [A.VIEW, A.CREATE, A.UPDATE, A.DELETE],
    [R.EMPLOYEE_DIRECTORY]:  [A.VIEW, A.CREATE, A.UPDATE, A.DELETE],
    [R.DASHBOARD]:           [A.VIEW],
  },
  [ASSET_MANAGER]: {
    [R.DEPARTMENTS]:         [A.VIEW],
    [R.ASSET_CATEGORIES]:    [A.VIEW, A.CREATE, A.UPDATE, A.DELETE],
    [R.EMPLOYEE_DIRECTORY]:  [A.VIEW],
    [R.DASHBOARD]:           [A.VIEW],
  },
  [DEPT_HEAD]: {
    [R.DEPARTMENTS]:         [A.VIEW],
    [R.EMPLOYEE_DIRECTORY]:  [A.VIEW],
    [R.DASHBOARD]:           [A.VIEW],
  },
  [EMPLOYEE]: {
    [R.DASHBOARD]:           [A.VIEW],
  },
};

export function hasPermission(roleId: number, resource: R, action: A): boolean {
  return ROLE_PERMISSIONS[roleId]?.[resource]?.includes(action) ?? false;
}
```

```ts
// common/decorators/require-permission.decorator.ts
import { Reflector } from '@nestjs/core';
export const RequirePermission = Reflector.createDecorator<{ resource: Resource; action: Action }>();
```

```ts
// common/guards/permissions.guard.ts (core)
const meta = this.reflector.get(RequirePermission, ctx.getHandler());
if (!meta) return true;                                  // no decorator = auth-only
// read roleId from DB (single indexed lookup) so promotion is effective WITHOUT re-login
const user = await this.prisma.user.findUnique({
  where: { id: req.user.sub },
  select: { roleId: true, isActive: true },
});
if (!user?.isActive) throw new UnauthorizedException();
if (!hasPermission(user.roleId, meta.resource, meta.action)) throw new ForbiddenException();
return true;
```

**Live-promotion demo moment (preserved):** because the guard resolves `roleId` from the DB user per-request, promoting a user via `PATCH /users/:id/role` takes effect on their **very next request — no re-login, no cache to invalidate.**

```
// TODO(post-hackathon): if the per-request roleId lookup ever gets hot, reintroduce a small cache.
//   For a demo it's a single indexed read.
```

---

## 5. Prisma Schema

Dropped vs. enterprise design: `PlatformPage`, `RolePagePermission`, `otp`, `otpExpiry`.

```prisma
model User {
  id           Int         @id @default(autoincrement())
  email        String      @unique
  password     String                       // bcrypt(10)
  firstName    String      @default("")
  lastName     String      @default("")
  phone        String      @default("")
  roleId       Int                          // ONLY authorization field
  role         RoleMaster  @relation(fields: [roleId], references: [id])
  departmentId Int?
  department   Department? @relation("DeptMembers", fields: [departmentId], references: [id])
  isActive     Boolean     @default(true)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  headedDepartments Department[] @relation("DeptHead")
  @@index([roleId])
  @@index([departmentId])
}

model RoleMaster {
  id           Int     @id @default(autoincrement())
  roleName     String  @unique              // Admin, Asset Manager, Department Head, Employee
  description  String  @default("")
  isSystemRole Boolean @default(true)       // all 4 seeded, undeletable
  users        User[]
  // NOTE: no permissions relation — matrix lives in code (ROLE_PERMISSIONS)
}

model Department {
  id          Int      @id @default(autoincrement())
  code        String   @unique              // "IT", "HR", "FIN"
  name        String
  description String   @default("")
  parentId    Int?
  parent      Department?  @relation("DeptHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children    Department[] @relation("DeptHierarchy")
  headId      Int?
  head        User?    @relation("DeptHead", fields: [headId], references: [id], onDelete: SetNull)
  members     User[]   @relation("DeptMembers")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model AssetCategory {
  id           Int      @id @default(autoincrement())
  name         String   @unique             // Electronics, Furniture, Vehicles...
  description  String   @default("")
  tagPrefix    String   @default("AF")       // feeds Module 4 asset-tag generation
  customFields Json     @default("[]")        // [{key,label,type,required}] e.g. warrantyPeriod
  sortOrder    Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

One `AssetCategory` table serves every category via `customFields` JSON — no per-category migrations. Module 4 assets store matching values in their own `customValues Json`.

---

## 6. API Endpoints

### 6.1 `auth/`

| Method | Path | Behavior |
|---|---|---|
| POST | `/auth/register` | Signup → **roleId force-set to Employee server-side**; 409 on duplicate email |
| POST | `/auth/login` | email+password → **JWT (24h) as http-only cookie + body**. No OTP. |
| GET 🔒 | `/auth/me` | session validation → `{user, roleId}` |
| POST 🔒 | `/auth/logout` | clear cookie |
| POST 🔒 | `/auth/change-password` | old+new |

```
// TODO(post-hackathon): OTP 2FA (login → verify-otp → resend) and forgot/reset-password OTP flow.
```

### 6.2 `users/` — Employee Directory (Tab C)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/users` | `@RequirePermission(EMPLOYEE_DIRECTORY, VIEW)` | search/filter name,email,dept,role,status; paginated |
| GET | `/users/:id` | same | profile |
| POST | `/users` | `(EMPLOYEE_DIRECTORY, CREATE)` | Admin creates user (any role) |
| PATCH | `/users/:id` | `(EMPLOYEE_DIRECTORY, UPDATE)` | profile fields, department, isActive |
| PATCH | `/users/:id/role` | `(EMPLOYEE_DIRECTORY, UPDATE)` | **promotion endpoint** — Employee → Dept Head / Asset Manager; effect immediate (guard reads DB roleId) |
| DELETE | `/users/:id` | `(EMPLOYEE_DIRECTORY, DELETE)` | soft-deactivate (isActive=false) |

### 6.3 `departments/` (Tab A)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/departments` | `(DEPARTMENTS, VIEW)` | flat list + member counts |
| GET | `/departments/tree` | `(DEPARTMENTS, VIEW)` | hierarchy via parentId |
| GET | `/departments/:id` | same | detail + head + members |
| POST | `/departments` | `(DEPARTMENTS, CREATE)` | code unique; optional parentId, headId |
| PATCH | `/departments/:id` | `(DEPARTMENTS, UPDATE)` | rename, re-parent (cycle check), assign head, (de)activate |
| DELETE | `/departments/:id` | `(DEPARTMENTS, DELETE)` | soft-deactivate; blocked if active members or child depts |

### 6.4 `asset-categories/` (Tab B)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/asset-categories` | `(ASSET_CATEGORIES, VIEW)` | ordered by sortOrder |
| POST | `/asset-categories` | `(ASSET_CATEGORIES, CREATE)` | name unique; customFields schema validated |
| PATCH | `/asset-categories/:id` | `(ASSET_CATEGORIES, UPDATE)` | edit fields/customFields/deactivate |
| DELETE | `/asset-categories/:id` | `(ASSET_CATEGORIES, DELETE)` | blocked once assets reference it (Module 4) |

### 6.5 `dashboard/`

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/dashboard/stats` | `(DASHBOARD, VIEW)` | KPI batch (see §9) |

**No** `roles/`, `platform-pages/`, or `navigation/` endpoints — replaced by static RBAC (§4) and static sidebar (§7).

---

## 7. Frontend Structure

```
apps/frontend/
├── app/
│   ├── (auth)/login/page.tsx        # credentials → JWT → redirect. No OTP screen.
│   ├── (auth)/signup/page.tsx       # Employee self-signup (no role field)
│   ├── 403/page.tsx                 # forbidden page
│   └── (admin)/
│       ├── layout.tsx               # verifySession guard + Sidebar/Header
│       ├── dashboard/page.tsx       # KPI cards + chart (§9)
│       └── organization/page.tsx    # ONE page, THREE tabs (PDF requirement)
├── components/
│   ├── layout/  AdminSidebar.tsx (STATIC config), AdminHeader.tsx
│   ├── common/  PermissionGate.tsx, FormField.tsx, ConfirmDialog.tsx
│   ├── departments/  DepartmentTableView.tsx, DepartmentForm.tsx
│   │                 // TODO: DepartmentOrgView.tsx + ViewSwitcher (polish if time)
│   ├── categories/   CategoryTable.tsx, CategoryForm.tsx (+ custom-field builder)
│   └── employees/    EmployeeTableView.tsx, EmployeeFilterPanel.tsx,
│                     RoleAssignModal.tsx, EmployeeStatsBar.tsx
├── services/  authService.ts, userService.ts, departmentService.ts,
│              categoryService.ts, dashboardService.ts
├── store/authStore.ts               # Zustand: login/logout/verifySession/{user, roleId}
├── lib/permissions.ts               # SAME static matrix mirrored client-side for gating
└── lib/  axios.ts (401 interceptor), react-query.tsx, toast.tsx
```

**Static sidebar with role-based visibility** — replaces the navigation API:

```ts
// components/layout/AdminSidebar.tsx
const NAV = [
  { label: 'Dashboard',    href: '/dashboard',    resource: Resource.DASHBOARD },
  { label: 'Organization', href: '/organization', resource: Resource.DEPARTMENTS },
];
// render: NAV.filter(item => hasPermission(roleId, item.resource, Action.VIEW))
```

`lib/permissions.ts` mirrors backend `ROLE_PERMISSIONS` so sidebar + `PermissionGate` gate off one source of truth. React Query for server state; Zustand only for auth/session.

```
// TODO(post-hackathon): extract the shared RBAC matrix into a shared package to kill client/server drift.
```

---

## 8. Seed Data (`prisma/seed.ts`)

Idempotent (`upsert`) so re-running never breaks the demo.

1. **Roles:** Admin(1), Asset Manager(2), Department Head(3), Employee(4).
2. **Bootstrap admin:** `admin@assetflow.com` + known demo password (bcrypt).
3. **Sample departments:** IT, HR, Finance, Marketing — include one parent/child pair to show hierarchy.
4. **Sample categories:** Electronics `{warrantyPeriod}`, Furniture, Vehicles `{plateNumber, fuelType}`, Projectors.
5. **Sample employees** across departments — directory, filters, and a live promotion are demoable immediately.

No platform-pages or permission-matrix seed (matrix is code now).

---

## 9. Dashboard KPIs (demo centerpiece)

`GET /dashboard/stats` (`@RequirePermission(DASHBOARD, VIEW)`) → single query batch:

```json
{ "totalEmployees": 12, "totalDepartments": 4, "activeCategories": 4,
  "employeesByRole": { "Admin": 1, "Asset Manager": 2, "Department Head": 3, "Employee": 6 },
  "recentlyAdded": [ /* last 5 users */ ] }
```

Frontend: 4 KPI cards + one bar/donut (employees by role or department), animated count-up on load. One screen, strong first impression.

```
// TODO(post-hackathon): real-time asset counts arrive with Module 4.
```

---

## 10. Business Rules & Edge Cases

1. **No self-elevation:** register hard-codes Employee; role changes only via `PATCH /users/:id/role`.
2. Generic auth errors (no user enumeration); inactive users cannot log in.
3. **Department cycle prevention:** re-parenting rejects if new parent is a descendant (walk-up check).
4. **Head consistency:** headId must reference an active user; deactivating a user clears their head slots (SetNull).
5. Deactivating a department requires zero active members and zero active children; soft-delete only, never hard-delete once referenced.
6. Category `name` unique; `customFields` validated against `{key,label,type∈[text,number,date,boolean],required}`; edits are additive (never destroy existing asset values).
7. System roles undeletable (enforced in seed/guards; no role CRUD exists to violate it).
8. **Last-admin protection:** cannot demote/deactivate the final active Admin.
9. Every mutating endpoint returns `{success, message, data}`; DTOs use `whitelist: true, forbidNonWhitelisted: true`.
10. Passwords never serialized (Prisma `select` omission).

**Deferred:** OTP expiry rules, forgot-password flow (§6.1 TODO).

---

## 11. Build Order (8-hour budget)

| Slot | Task | ~Time |
|---|---|---|
| 1 | Scaffold: schema → migrate → seed → PrismaModule | 0:45 |
| 2 | Auth: JWT strategy, login/register/me/logout, guards | 1:00 |
| 3 | Static RBAC: enums, `ROLE_PERMISSIONS`, PermissionsGuard, `@RequirePermission` | 0:30 |
| 4 | Departments module (CRUD + tree + cycle check) | 1:00 |
| 5 | Asset Categories module (CRUD + custom fields) | 0:45 |
| 6 | Users module (directory + filters + **role promotion**) | 0:45 |
| 7 | Dashboard stats endpoint | 0:20 |
| 8 | Frontend: axios/store/services, login+signup, admin layout + **static sidebar** | 1:00 |
| 9 | Organization page (3 tabs) + forms + RoleAssignModal | 1:15 |
| 10 | Dashboard KPI cards + chart | 0:30 |
| 11 | Polish pass: toasts, loading/empty states, confirm dialogs, demo dry-run | 0:30 |

**Demo stability rules:** seed idempotent; one known admin login; happy-path clickthrough rehearsed; every mutation shows a toast; every list has loading + empty states.

---

## 12. Test Plan

| # | Test | Expected |
|---|---|---|
| 1 | Signup with `roleId: 1` injected | Created as Employee; field ignored |
| 2 | Login correct / wrong password | JWT cookie / 401 |
| 3 | Employee token → `POST /departments` | 403 + redirect to `/403` in UI |
| 4 | Admin creates dept with parent = own descendant | 400 cycle rejected |
| 5 | Promote Employee → Dept Head → next request | New permissions live, **no re-login** |
| 6 | Deactivate dept with members | Blocked with message |
| 7 | Create Electronics category with `warrantyPeriod` | Stored; visible in GET |
| 8 | Demote last active Admin | Blocked |
| 9 | Sidebar: Employee vs Admin | Filtered (Employee sees Dashboard only) |
| 10 | `GET /auth/me` after refresh | Session restored (cookie) |
| 11 | Swagger `/api/docs` | All endpoints documented |
| 12 | Dashboard | KPIs + chart render from seeded data |

---

## 13. Deferred Feature Ledger (all marked `// TODO` in code)

- OTP 2FA login + resend
- Forgot/reset password flow
- Dynamic `PlatformPage` CRUD + admin-editable pages
- `PermissionCacheService` (only if per-request role lookup becomes hot)
- Dynamic navigation builder API
- Role CRUD + editable permission-matrix UI
- Department org-chart view + view switcher
- Audit interceptor + history/change-request tables + User/Employee split (Module 10)
- i18n, email verification

Each keeps a clean module boundary and can be lifted back in without rework.
```
