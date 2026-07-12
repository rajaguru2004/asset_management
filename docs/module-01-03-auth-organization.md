# AssetFlow — Merged Module 1+3 Report: Auth, RBAC & Organization Setup

**Supersedes** `module-01-login-signup.md` (content carried forward and re-based on NestJS).
**References:**
- **Ref A** — Excel Engineering (`D:\excel engineering\codes`): dynamic page-level RBAC (platform pages + role permission matrix + cache), 2-step OTP auth, navigation builder, Zustand/usePermission/PermissionGate frontend.
- **Ref B** — SHIS HRM (`D:\SHIS HRM\human-resource-management\apps`): NestJS feature-module skeleton, Prisma/Postgres, guards+decorators, Swagger, audit interceptor, department hierarchy + head, LibraryItem configurable masters, multi-view frontend components with services layer + React Query.

**Locked decisions:** NestJS feature modules (Ref B skeleton) · dynamic page-level RBAC (Ref A model) · PostgreSQL + Prisma · mock OTP `123456` · 4 seeded system roles · single tenant · department hierarchy + head (Ref B) · LibraryItem-style asset categories (Ref B) · **no** User/Employee split · **no** change-request/history tables.

---

## 1. Combined Scope (from the PDF)

**Module 1 — Login/Signup:** signup creates Employee only (no role selection); email+password login; forgot password; session validation; no self-elevation.

**Module 3 — Organization Setup (Admin only, 3 tabs):**
- **Tab A Departments:** create/edit/deactivate; assign Department Head; optional Parent Department (hierarchy); Active/Inactive status.
- **Tab B Asset Categories:** create/edit (Electronics, Furniture, Vehicles…); optional category-specific fields (e.g. warranty period for Electronics).
- **Tab C Employee Directory:** name/email/department/role/status; Admin promotes Employee → Department Head / Asset Manager **here and only here**.

These merge naturally: Tab C *is* the user management half of Module 1, and RBAC only becomes demonstrable once roles can be assigned.

---

## 2. Monorepo Layout (Ref B)

```
assetflow/
├── docker-compose.yml            # postgres + backend + frontend
├── package.json                  # workspace root
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
│   └── seed.ts                   # roles, platform pages, permission matrix, admin user
└── src/
    ├── main.ts                   # global pipes, exception filter, Swagger, cookies, CORS
    ├── app.module.ts
    ├── prisma/                   # PrismaModule + PrismaService (Ref B pattern)
    │   ├── prisma.module.ts
    │   └── prisma.service.ts
    ├── common/
    │   ├── decorators/
    │   │   ├── public.decorator.ts          # @Public() — skip auth        (Ref B)
    │   │   ├── current-user.decorator.ts    # @CurrentUser()               (Ref B)
    │   │   └── require-permission.decorator.ts  # @RequirePermission(pageKey, ...actions)  (NEW — Ref A's authorize() as metadata)
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts            # passport-jwt, honors @Public (Ref B)
    │   │   └── permissions.guard.ts         # reads @RequirePermission metadata →
    │   │                                    #   PermissionCacheService.check(roleId, pageKey, action)
    │   │                                    #   (Ref A authorize/authorizeOr logic; OR across actions)
    │   └── filters/http-exception.filter.ts # uniform {success,message,data} envelope
    ├── auth/
    │   ├── auth.module.ts / auth.controller.ts / auth.service.ts
    │   ├── strategies/jwt.strategy.ts       # payload {sub, roleId} → req.user
    │   └── dto/  register.dto.ts, login.dto.ts, verify-otp.dto.ts,
    │             forgot-password.dto.ts, reset-password.dto.ts, change-password.dto.ts
    ├── users/                                # = PDF Tab C Employee Directory
    │   ├── users.module.ts / users.controller.ts / users.service.ts
    │   └── dto/  create-user.dto.ts, update-user.dto.ts, query-users.dto.ts, assign-role.dto.ts
    ├── roles/                                # role master + permission matrix (Ref A)
    │   ├── roles.module.ts / roles.controller.ts / roles.service.ts
    │   ├── permission-cache.service.ts       # in-memory Map cache + invalidate (Ref A permissionCache)
    │   └── dto/  create-role.dto.ts, update-role-permissions.dto.ts
    ├── platform-pages/                       # page registry CRUD (Ref A)
    │   ├── platform-pages.module.ts / .controller.ts / .service.ts
    │   └── dto/  create-page.dto.ts, update-page.dto.ts
    ├── navigation/
    │   ├── navigation.module.ts / .controller.ts / .service.ts   # sidebar tree (Ref A algorithm)
    ├── departments/                          # = PDF Tab A (Ref B departments, trimmed)
    │   ├── departments.module.ts / .controller.ts / .service.ts
    │   └── dto/  create-department.dto.ts, update-department.dto.ts
    └── asset-categories/                     # = PDF Tab B (Ref B library-items pattern)
        ├── asset-categories.module.ts / .controller.ts / .service.ts
        └── dto/  create-category.dto.ts, update-category.dto.ts
```

Global guard order (as in Ref B's `@UseGuards(JwtAuthGuard, RolesGuard)`, applied app-wide via `APP_GUARD`): `JwtAuthGuard` → `PermissionsGuard`. Endpoints opt out with `@Public()`.

---

## 4. Prisma Schema

```prisma
model User {
  id           Int        @id @default(autoincrement())
  email        String     @unique
  password     String                     // bcrypt(10)
  firstName    String     @default("")
  lastName     String     @default("")
  phone        String     @default("")
  roleId       Int                        // ONLY authorization field
  role         RoleMaster @relation(fields: [roleId], references: [id])
  departmentId Int?
  department   Department? @relation("DeptMembers", fields: [departmentId], references: [id])
  isActive     Boolean    @default(true)  // Tab C Status Active/Inactive
  otp          String?
  otpExpiry    DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  headedDepartments Department[] @relation("DeptHead")

  @@index([roleId])
  @@index([departmentId])
}

model RoleMaster {
  id           Int     @id @default(autoincrement())
  roleName     String  @unique             // Admin, Asset Manager, Department Head, Employee
  description  String  @default("")
  isSystemRole Boolean @default(false)     // 4 seeded = true, undeletable
  isActive     Boolean @default(true)
  users        User[]
  permissions  RolePagePermission[]
}

model PlatformPage {
  id           Int     @id @default(autoincrement())
  pageKey      String  @unique             // "DEPARTMENTS", "ASSET_CATEGORIES", ...
  pageName     String
  pageRoute    String
  pageIcon     String                       // lucide-react name
  parentPageId Int?
  displayOrder Int     @default(0)
  isActive     Boolean @default(true)
  showInNav    Boolean @default(true)
  isSystem     Boolean @default(false)
  permissions  RolePagePermission[]
}

model RolePagePermission {
  id          Int          @id @default(autoincrement())
  roleId      Int
  pageId      Int
  canView     Boolean @default(false)
  canCreate   Boolean @default(false)
  canUpdate   Boolean @default(false)
  canDelete   Boolean @default(false)
  canDropdown Boolean @default(true)
  role        RoleMaster   @relation(fields: [roleId], references: [id], onDelete: Cascade)
  page        PlatformPage @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@unique([roleId, pageId])
}

model Department {                          // Ref B, trimmed
  id        Int      @id @default(autoincrement())
  code      String   @unique               // "IT", "HR", "FIN"
  name      String
  description String @default("")
  parentId  Int?                            // hierarchy (Ref B self-relation)
  parent    Department?  @relation("DeptHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children  Department[] @relation("DeptHierarchy")
  headId    Int?                            // Department Head (Ref B managerId)
  head      User?    @relation("DeptHead", fields: [headId], references: [id], onDelete: SetNull)
  members   User[]   @relation("DeptMembers")
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AssetCategory {                       // Ref B LibraryItem pattern
  id           Int      @id @default(autoincrement())
  name         String   @unique             // Electronics, Furniture, Vehicles...
  description  String   @default("")
  tagPrefix    String   @default("AF")      // feeds Module 4 asset-tag generation
  customFields Json     @default("[]")      // [{key,label,type,required}] e.g. warrantyPeriod
  sortOrder    Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

Category-specific fields use the Ref B metadata idea generalized to a `customFields` JSON definition; Module 4 assets store matching values in their own `customValues Json`. One table serves every category (no migrations per category).

---

## 5. RBAC Flow (Ref A model in NestJS clothes)

```
Request
 → JwtAuthGuard        (passport-jwt; @Public skips; req.user = {sub: userId, roleId})
 → PermissionsGuard    reads @RequirePermission('DEPARTMENTS', 'CREATE') metadata
                       → PermissionCacheService.getRolePermissions(roleId)
                         [Map cache hit? use : Prisma query → cache]
                       → any listed action true? next : 403
 → Controller → Service → Prisma
```

- `@RequirePermission(pageKey, ...actions)` with multiple actions = OR logic (replaces Ref A's `authorizeOr`).
- `PermissionCacheService.invalidate(roleId)` called on every `PUT /roles/:id/permissions` — Ref A's cache invalidation rule, mandatory.
- JWT payload stays minimal (`sub`, `roleId`); permissions resolved per-request → **role promotion takes effect immediately, no re-login** (key demo moment).
- Swagger (`@ApiTags`, `@ApiBearerAuth`) on all controllers — Ref B convention, free API docs for judges.

---

## 6. API Endpoints

### 6.1 `auth/` (all `@Public` unless 🔒)

| Method | Path | Behavior |
|---|---|---|
| POST | `/auth/register` | Signup → **roleId force-set to Employee server-side**; 409 on duplicate email |
| POST | `/auth/login` | email+password → mock OTP `123456` stored w/ 5-min expiry → `{mfaRequired, userId, maskedEmail}` |
| POST | `/auth/verify-otp` | OTP valid → clear OTP → JWT (24h) as http-only cookie + body |
| POST | `/auth/resend-otp` | reset mock OTP + expiry |
| POST | `/auth/forgot-password` | set reset OTP (console-logged) |
| POST | `/auth/verify-reset-otp` / `/auth/reset-password` | OTP check → bcrypt new password |
| GET 🔒 | `/auth/me` | session validation |
| POST 🔒 | `/auth/logout` | clear cookie |
| POST 🔒 | `/auth/change-password` | old+new |

### 6.2 `users/` — Employee Directory (Tab C)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/users` | `@RequirePermission('EMPLOYEE_DIRECTORY','VIEW','DROPDOWN')` | search/filter by name, email, dept, role, status; paginated (Ref B QueryUsersDto) |
| GET | `/users/:id` | same | profile |
| POST | `/users` | `('EMPLOYEE_DIRECTORY','CREATE')` | Admin creates user directly (any role) |
| PATCH | `/users/:id` | `('EMPLOYEE_DIRECTORY','UPDATE')` | profile fields, department, isActive |
| PATCH | `/users/:id/role` | `('EMPLOYEE_DIRECTORY','UPDATE')` | **the promotion endpoint** — Employee → Dept Head / Asset Manager; invalidates nothing (perms are per-role, not per-user) |
| DELETE | `/users/:id` | `('EMPLOYEE_DIRECTORY','DELETE')` | soft-deactivate (isActive=false) |

### 6.3 `departments/` (Tab A — Ref B endpoints, trimmed)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/departments` | `('DEPARTMENTS','VIEW','DROPDOWN')` | flat list + member/asset counts |
| GET | `/departments/tree` | same | hierarchy via parentId (Ref B `/tree`) |
| GET | `/departments/:id` | same | detail + head + members |
| POST | `/departments` | `('DEPARTMENTS','CREATE')` | code unique; optional parentId, headId |
| PATCH | `/departments/:id` | `('DEPARTMENTS','UPDATE')` | rename, re-parent (cycle check), assign head, activate/deactivate |
| DELETE | `/departments/:id` | `('DEPARTMENTS','DELETE')` | soft-deactivate; blocked if active members or child depts |

### 6.4 `asset-categories/` (Tab B)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/asset-categories` | `('ASSET_CATEGORIES','VIEW','DROPDOWN')` | ordered by sortOrder |
| POST | `/asset-categories` | `('ASSET_CATEGORIES','CREATE')` | name unique; customFields schema validated |
| PATCH | `/asset-categories/:id` | `('ASSET_CATEGORIES','UPDATE')` | edit fields/customFields/deactivate |
| DELETE | `/asset-categories/:id` | `('ASSET_CATEGORIES','DELETE')` | blocked once assets reference it (Module 4) |

### 6.5 `roles/`, `platform-pages/`, `navigation/` (Ref A, unchanged design)

`GET/POST/PATCH/DELETE /roles`, `PUT /roles/:id/permissions` (matrix update → cache invalidate), system roles undeletable; `platform-pages` CRUD (Admin, `showInNav:false` pages); `GET /navigation` → `{navigation, allPermissions}` built from PlatformPage tree × role permissions (Ref A algorithm).

---

## 7. Frontend Structure (Ref B skeleton, Ref A auth/permission plumbing)

```
apps/frontend/
├── app/
│   ├── (auth)/login/page.tsx        # credentials → OTP → done; forgot-password views
│   ├── (auth)/signup/page.tsx       # Employee self-signup (no role field)
│   ├── 403/page.tsx                 # Ref B forbidden page
│   └── (admin)/
│       ├── layout.tsx               # verifySession guard + Sidebar/Header
│       ├── dashboard/page.tsx       # Module 2 placeholder
│       └── organization/page.tsx    # ONE page, THREE tabs (PDF requirement)
├── components/
│   ├── layout/  AdminSidebar.tsx (navigation API), AdminHeader.tsx
│   ├── common/  PermissionGate.tsx, FormField.tsx, ConfirmDialog.tsx
│   ├── departments/  DepartmentTableView.tsx, DepartmentOrgView.tsx,   # Ref B multi-view
│   │                 DepartmentForm.tsx, DepartmentViewSwitcher.tsx
│   ├── categories/   CategoryTable.tsx, CategoryForm.tsx (+ custom-field builder)
│   └── employees/    EmployeeTableView.tsx, EmployeeFilterPanel.tsx,   # Ref B
│                     RoleAssignModal.tsx, EmployeeStatsBar.tsx
├── services/                        # Ref B services layer
│   ├── authService.ts, userService.ts, departmentService.ts,
│   ├── categoryService.ts, roleService.ts, navigationService.ts
├── store/authStore.ts               # Ref A Zustand store (login/OTP/permissions/verifySession)
├── hooks/usePermission.ts           # Ref A hook (reads authStore.permissions tree)
└── lib/  axios.ts (401 interceptor), react-query.tsx (Ref B), toast.tsx
```

Organization page = tabbed container matching the PDF's "three tabs" wording; each tab lazy-loads its domain components. React Query for server state (Ref B), Zustand only for auth/session (Ref A).

---

## 8. Seed Data (`prisma/seed.ts`)

1. **Roles:** Admin(1), Asset Manager(2), Department Head(3), Employee(4) — `isSystemRole: true`.
2. **Platform pages:** DASHBOARD, ORG_SETUP(+children DEPARTMENTS, ASSET_CATEGORIES, EMPLOYEE_DIRECTORY), ASSET_REGISTRY, ASSET_ALLOCATION, RESOURCE_BOOKING, MAINTENANCE, ASSET_AUDIT, REPORTS, NOTIFICATIONS, ROLE_MANAGEMENT(hidden), PLATFORM_PAGES(hidden).
3. **Permission matrix:** Admin = full; Asset Manager = CRUD on registry/allocation/maintenance/audit + VIEW reports; Dept Head = VIEW dept-scoped pages + CREATE bookings/transfers; Employee = VIEW own + CREATE bookings/maintenance. (Row-level "own/department" scoping enforced in later modules' services — RBAC handles page×action only, as in both references.)
4. **Bootstrap admin:** `admin@assetflow.com` + sample departments (IT, HR, Finance, Marketing) and categories (Electronics `{warrantyPeriod}`, Furniture, Vehicles `{plateNumber, fuelType}`, Projectors).

---

## 9. Business Rules & Edge Cases (merged)

1. **No self-elevation:** register hard-codes Employee; role changes only via `PATCH /users/:id/role` behind `EMPLOYEE_DIRECTORY.UPDATE`.
2. Generic auth errors (no user enumeration); OTP 5-min expiry, cleared on success; inactive users cannot log in.
3. **Department cycle prevention:** re-parenting rejects if new parent is a descendant of the department (walk-up check).
4. **Head consistency:** headId must reference an active user; on assignment, optionally auto-promote to Department Head role (flag in DTO); deactivating a user clears their headId slots (SetNull).
5. Deactivating a department requires zero active members and zero active children; deleted = deactivated (soft), never hard-deleted once referenced.
6. Category `name` unique; `customFields` validated against `{key,label,type∈[text,number,date,boolean],required}`; deletion blocked once assets exist; edits to customFields never destroy existing asset values (additive).
7. System roles undeletable; roles with assigned users undeletable; permission-matrix update → cache invalidate immediately.
8. Last-admin protection: cannot demote/deactivate the final active Admin.
9. Every mutating endpoint returns the envelope `{success, message, data}`; class-validator DTOs reject unknown fields (`whitelist: true, forbidNonWhitelisted: true`).
10. Passwords never serialized (Prisma `select` omission).

---

## 10. Build Order & Test Plan

**Build order:** schema+migrate → seed → prisma module → auth (strategy, guards, controller) → permission cache + PermissionsGuard + decorator → roles/platform-pages/navigation → users → departments → asset-categories → frontend axios/store/services → login+signup → admin layout+sidebar → organization page (3 tabs) → RoleAssignModal.

| # | Test | Expected |
|---|---|---|
| 1 | Signup with `roleId: 1` injected | Created as Employee; field ignored |
| 2 | Login → OTP `123456` / wrong / expired | token / 401 / 401 |
| 3 | Employee token → `POST /departments` | 403 + redirect to `/403` in UI |
| 4 | Admin creates dept with parent = own descendant | 400 cycle rejected |
| 5 | Assign head → user gains Dept Head role → next request | New permissions live, no re-login |
| 6 | Deactivate dept with members | Blocked with message |
| 7 | Create Electronics category with `warrantyPeriod` custom field | Stored; visible in GET |
| 8 | Delete Employee system role / role with users | Both blocked |
| 9 | Update role matrix → immediate re-check | Cache invalidated |
| 10 | Sidebar Employee vs Admin | Filtered tree matches matrix |
| 11 | `GET /auth/me` after refresh | Session restored (cookie) |
| 12 | Swagger `/api/docs` | All endpoints documented |

---

## 11. Pattern Source Map (what came from where)

| Concern | Source | Adaptation |
|---|---|---|
| Backend skeleton (modules/controllers/services/DTOs/guards/Swagger/exception filter) | Ref B (HRM) | verbatim structure |
| Dynamic RBAC (platform pages, role matrix, cache, navigation builder) | Ref A (Excel) | `authorize()` middleware → `@RequirePermission` + `PermissionsGuard`; Redis → in-memory Map |
| 2-step OTP login, forgot-password OTP flow, auth store | Ref A | OTP mocked static `123456` |
| Department hierarchy (`parentId`), `/tree`, head assignment | Ref B | `managerId` → `headId` (User, not Employee) |
| Asset categories with per-category custom fields | Ref B LibraryItem | enum type → single AssetCategory table + `customFields` JSON |
| Employee directory list/filter/pagination DTOs, multi-view components, services layer, React Query, 403 page | Ref B | trimmed to hackathon scope |
| usePermission / PermissionGate / Zustand auth store | Ref A | unchanged |
| Dropped from Ref B | — | User/Employee split, change-request + history tables, branches, audit interceptor (Module 10 candidate), i18n, email verification |

The audit interceptor (`@AuditResource` → AuditLog) is intentionally deferred — it maps 1:1 to Module 10's Activity Logs and can be lifted from Ref B when we get there.
