<div align="center">

# 🗂️ AssetFlow

### Enterprise Asset & Resource Management System

A centralized ERP platform that replaces spreadsheets and paper logs with structured asset
lifecycles, secure role-based workflows, and real-time visibility into who holds what, where
it is, and its condition — built for any organization with equipment, furniture, vehicles,
or shared spaces.

[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](#license)

</div>

---

## Table of Contents

- [Vision](#vision)
- [Live Release: Auth, RBAC & Organization Setup](#live-release-auth-rbac--organization-setup)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Authentication & RBAC](#authentication--rbac)
- [Frontend Data Flow](#frontend-data-flow)
- [Default Logins (Seed Data)](#default-logins-seed-data)
- [Product Roadmap](#product-roadmap)
- [Contributing](#contributing)
- [FAQ](#faq)
- [License](#license)
- [Team](#team)

---

## Vision

AssetFlow simplifies and digitizes how organizations track, allocate, and maintain their
physical assets and shared resources. It isn't tied to any single industry — offices,
schools, hospitals, factories, and agencies can all run on it.

The platform delivers:

- **Structured asset lifecycles** — every asset moves through defined states (Available,
  Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed) instead of a spreadsheet cell
- **Centralized resource booking** — shared rooms, vehicles, and equipment booked by time slot
  with automatic overlap prevention
- **Real-time visibility** — who holds what, where it is, and what condition it's in, always
  current
- **Clean ERP architecture** — role-based workflows, reusable modules, and scalable design,
  intentionally scoped away from purchasing, invoicing, or accounting concerns

## Live Release: Auth, RBAC & Organization Setup

This repository currently ships the foundation of that vision — **Login/Signup** and
**Organization Setup** — fully working end to end:

- Realistic, non-self-elevating account creation
- A four-role permission system (Admin, Asset Manager, Department Head, Employee) with
  **live role promotion** — no re-login required
- Department management with hierarchy and department heads
- Asset category management with dynamic custom fields
- A searchable Employee Directory
- A live KPI dashboard

The next modules — Asset Registry, Allocation & Transfer, Resource Booking, Maintenance,
Audit Cycles, Reports & Analytics, and Notifications — are fully designed as detailed build
plans in [`docs/`](docs/), ready for the team to build out module by module (see
[Product Roadmap](#product-roadmap) for the build process).

---

## Features

**Authentication**
- Email + password signup — always creates an Employee account, keeping role assignment
  entirely in Admin's hands
- JWT login, session validation (`GET /auth/me`), and change-password
- Clean, generic error handling on login — no account-enumeration surface
- Inactive accounts are automatically blocked from signing in

**Authorization (RBAC)**
- A clear, auditable permission matrix (`Resource` × `Action` → allowed for each role) that
  lives in code — fast, predictable, and always in sync
- Role promotions via `PATCH /users/:id/role` take effect on the user's **very next request**
  — no re-login, no cache to invalidate
- The frontend mirrors the exact same matrix for instant, consistent UI gating

**Organization Setup — 3-tab Admin workspace**
- **Departments** — create/edit/deactivate, build a parent-child hierarchy, assign
  department heads, with built-in cycle protection
- **Asset Categories** — define categories like Electronics, Furniture, and Vehicles, each
  with its own dynamic custom-field schema (e.g. warranty period, plate number)
- **Employee Directory** — search and filter the whole org, and promote any Employee to
  Department Head or Asset Manager in one action

**Dashboard**
- Live KPI cards: total active employees, active departments, active categories, employees
  grouped by role, and the 5 most recently added employees

**Under the hood**
- Consistent `{ success, data }` response envelope across every endpoint
- Strict DTO validation (`class-validator`, `whitelist`, `forbidNonWhitelisted`) so every
  request is exactly what the API expects
- Full interactive API documentation via Swagger at `/api/docs`
- An idempotent seed script — reset and re-seed demo data anytime with one command

---

## Technology Stack

### Backend (`apps/backend`)

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Auth | `@nestjs/jwt` + `passport-jwt`, `bcrypt` password hashing |
| Validation | `class-validator` + `class-transformer` |
| API Docs | `@nestjs/swagger` at `/api/docs` |
| Scheduling | `@nestjs/schedule` |
| Config | `@nestjs/config` |
| Testing | Jest, Supertest, `fast-check` |
| Extended toolkit | Mailer, ExcelJS, MinIO, Supabase, TensorFlow, face-api, MCP SDK, and more — a shared, extensible stack ready to power the upcoming modules |

### Frontend (`apps/frontend`)

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 |
| Server State | TanStack React Query 5 |
| Client State | Zustand 5 |
| Forms | `react-hook-form` + `zod` |
| HTTP | Axios |
| i18n | `next-intl` (English + Arabic) |
| Charts | Recharts |
| Icons | Lucide React |
| Toasts | Sonner |
| Extended toolkit | FullCalendar, dnd-kit, React Flow, Tiptap, Framer Motion, and more — pre-installed for the calendar, board, and rich-text screens ahead |

### Infrastructure

| Concern | Tool |
|---|---|
| Local database | Docker Compose → Postgres 16, ready on one command |
| Monorepo scripts | Root `package.json` + `concurrently` — one command runs both apps |

---

## Architecture

### Request flow

```mermaid
flowchart LR
    A[Next.js Frontend] -->|axios + Bearer JWT| B[NestJS API]
    B --> C{JwtAuthGuard}
    C -->|"@Public()"| E[Controller]
    C -->|authenticated| D{PermissionsGuard}
    D -->|"@RequirePermission checked against\nthe RBAC matrix"| E
    E --> F[Service]
    F --> G[(PostgreSQL via Prisma)]
    E --> H[TransformInterceptor]
    H -->|"{ success, data }"| A
```

### Live role-promotion flow — the architectural centerpiece

```mermaid
sequenceDiagram
    participant Admin
    participant API as NestJS API
    participant DB as PostgreSQL
    participant Employee

    Admin->>API: PATCH /users/:id/role { roleId: DEPT_HEAD }
    API->>DB: UPDATE users SET roleId = 3
    Note over Employee: Employee makes their NEXT request<br/>with their EXISTING JWT
    Employee->>API: GET /departments (Bearer <token>)
    API->>DB: JwtStrategy.validate() reads the user fresh
    DB-->>API: roleId = 3
    API->>API: PermissionsGuard checks roleId=3 against the matrix
    API-->>Employee: 200 OK — new permissions active instantly
```

This works because the JWT only carries `{ sub, roleId }` as a signed identity claim —
`JwtStrategy.validate()` re-fetches the live `roleId`/`isActive` from the database on every
request, so a promotion is live the moment it's saved.

### Entity relationships

```mermaid
erDiagram
    RoleMaster ||--o{ User : "has many"
    Department ||--o{ User : "has members"
    Department ||--o| User : "has head"
    Department ||--o{ Department : "parent/children"

    RoleMaster {
        int id PK
        string roleName
        boolean isSystemRole
    }
    User {
        int id PK
        string email
        string password
        int roleId FK
        int departmentId FK
        boolean isActive
    }
    Department {
        int id PK
        string code
        string name
        int parentId FK
        int headId FK
        boolean isActive
    }
    AssetCategory {
        int id PK
        string name
        string tagPrefix
        json customFields
        boolean isActive
    }
```

`AssetCategory` is ready to be referenced by the upcoming `Asset` model — `tagPrefix` already
exists to drive auto-generated asset tags like `AF-0001`.

---

## Folder Structure

```
asset_management/
├── package.json                # root — concurrently dev/build/start scripts
├── docker-compose.yml          # Postgres 16, host port 5433
├── docs/                       # detailed build plans for every upcoming module
│   ├── project_scope.md
│   ├── module-01-03-auth-organization.md
│   ├── module-04-07-asset-operations.md
│   ├── module-06-07-booking-maintenance.md
│   └── module-08-10-audit-reports-notifications.md
└── apps/
    ├── backend/                # NestJS API — port 3001
    │   ├── prisma/
    │   │   ├── schema.prisma   # RoleMaster, User, Department, AssetCategory
    │   │   └── seed.ts         # idempotent: 4 roles, depts, categories, demo users
    │   └── src/
    │       ├── main.ts               # bootstrap: pipes, filters, CORS, Swagger
    │       ├── app.module.ts         # module registration, global guards/interceptor
    │       ├── auth/                 # login, register, me, logout, change-password
    │       ├── users/                # Employee Directory + role promotion
    │       ├── departments/          # CRUD + hierarchy + head assignment
    │       ├── asset-categories/     # CRUD + dynamic custom fields
    │       ├── dashboard/            # KPI stats endpoint
    │       ├── health/               # DB connectivity check
    │       ├── prisma/               # PrismaModule + PrismaService (@Global)
    │       └── common/
    │           ├── decorators/       # @Public, @CurrentUser, @RequirePermission
    │           ├── guards/           # PermissionsGuard
    │           ├── filters/          # AllExceptionsFilter → error envelope
    │           ├── interceptors/     # TransformInterceptor → success envelope
    │           ├── rbac/             # permissions.enum.ts, role-permissions.ts
    │           └── selects/          # USER_SAFE_SELECT
    └── frontend/                # Next.js app — port 3000
        ├── app/
        │   ├── (auth)/login/page.tsx
        │   ├── (auth)/signup/page.tsx
        │   ├── (admin)/layout.tsx        # session guard + Sidebar/Header shell
        │   ├── (admin)/dashboard/page.tsx
        │   └── (admin)/organization/page.tsx   # the 3-tab Org Setup screen
        ├── components/
        │   ├── layout/            # AdminSidebar, AdminHeader
        │   ├── common/            # PermissionGate and shared primitives
        │   ├── departments/
        │   ├── categories/
        │   └── employees/
        ├── services/              # axios calls: authService, userService, …
        ├── hooks/                 # React Query hooks: useDepartments, useUsers, …
        ├── store/                 # zustand: authStore, localeStore
        ├── lib/                   # axios instance, permissions.ts mirror, react-query.tsx
        ├── i18n/, messages/en, messages/ar
        └── theme/                 # light/dark theme provider
```

---

## Installation

### Prerequisites

- Node.js 20+
- npm
- Docker (for the local Postgres container)

### Steps

```bash
# 1. Clone
git clone https://github.com/rajaguru2004/asset_management.git
cd asset_management

# 2. Install dependencies
npm install
npm --prefix apps/backend install
npm --prefix apps/frontend install

# 3. Start Postgres locally
docker compose up -d db          # binds host port 5433

# 4. Configure environment
cp apps/backend/.env.example apps/backend/.env
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > apps/frontend/.env.local

# 5. Database: generate client, push schema, seed demo data
npm --prefix apps/backend run prisma:generate
npx --prefix apps/backend prisma db push
npm --prefix apps/backend run prisma:seed

# 6. Run both apps together
npm run dev
```

- Frontend → http://localhost:3000
- API → http://localhost:3001
- Swagger docs → http://localhost:3001/api/docs

Run each app independently anytime with `npm run dev:backend` / `npm run dev:frontend`.

---

## Environment Variables

### `apps/backend/.env`

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Prisma connection string | `postgresql://postgres:postgres@localhost:5433/asset_management` |
| `DIRECT_URL` | Prisma direct connection string | same as above |
| `JWT_SECRET` | Secret used to sign JWTs | your own secret string |
| `JWT_EXPIRES_IN` | JWT lifetime | `7d` |
| `PORT` | Backend HTTP port | `3001` |
| `NODE_ENV` | Node environment | `development` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |

### `apps/frontend/.env.local`

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL the frontend calls for the API | `http://localhost:3001` |

---

## Available Scripts

### Root `package.json`

| Script | What it does |
|---|---|
| `npm run dev` | Runs backend and frontend together |
| `npm run dev:backend` | Runs only the NestJS API in watch mode |
| `npm run dev:frontend` | Runs only the Next.js dev server |
| `npm run build` | Builds backend then frontend |
| `npm run start:backend` | Runs the compiled backend |
| `npm run start:frontend` | Runs the built Next.js app |

### `apps/backend/package.json`

| Script | What it does |
|---|---|
| `dev` / `start:dev` | `nest start --watch` |
| `start:prod` | Runs the compiled production build |
| `build` | `nest build` |
| `lint` / `format` | ESLint / Prettier |
| `test` / `test:cov` | Jest unit tests |
| `test:e2e` | Jest e2e suite |
| `prisma:studio` | Opens Prisma Studio |
| `prisma:generate` | Regenerates the Prisma client |
| `prisma:migrate` | `prisma migrate dev` |
| `prisma:seed` | Seeds roles, departments, categories, and demo users |

### `apps/frontend/package.json`

| Script | What it does |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint` |

---

## API Documentation

Full interactive documentation with request/response schemas is available at **`/api/docs`**
once the backend is running.

### `auth/`

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Self-signup — always creates an Employee |
| POST | `/auth/login` | Email + password → `{ user, accessToken }` |
| GET | `/auth/me` | Validate session, return the current user |
| POST | `/auth/logout` | Logout |
| POST | `/auth/change-password` | Change own password |

### `users/` — Employee Directory

| Method | Path | Description |
|---|---|---|
| GET | `/users` | Search/filter/paginate employees |
| GET | `/users/:id` | Employee profile |
| POST | `/users` | Create an employee (any role) |
| PATCH | `/users/:id` | Update profile / department / status |
| PATCH | `/users/:id/role` | Promote/demote — instantly effective |
| DELETE | `/users/:id` | Soft-deactivate |

### `departments/`

| Method | Path | Description |
|---|---|---|
| GET | `/departments` | Flat list with member/child counts |
| GET | `/departments/tree` | Nested hierarchy |
| GET | `/departments/:id` | Detail + head + members + children |
| POST | `/departments` | Create department |
| PATCH | `/departments/:id` | Rename / re-parent / assign head / (de)activate |
| DELETE | `/departments/:id` | Soft-deactivate |

### `asset-categories/`

| Method | Path | Description |
|---|---|---|
| GET | `/asset-categories` | List, ordered by `sortOrder` |
| GET | `/asset-categories/:id` | Category with custom fields |
| POST | `/asset-categories` | Create category + custom-field schema |
| PATCH | `/asset-categories/:id` | Edit fields / (de)activate |
| DELETE | `/asset-categories/:id` | Soft-deactivate |

### `dashboard/`

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard/stats` | KPI batch for the home dashboard |

### `health/`

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service + database health check |

All authenticated routes expect `Authorization: Bearer <token>`. Every response is wrapped
as `{ success: boolean, data: … }`.

---

## Database Schema

| Model | Purpose |
|---|---|
| `RoleMaster` | The 4 system roles (Admin, Asset Manager, Department Head, Employee) |
| `User` | Every account — `roleId` drives all authorization |
| `Department` | Org units with optional parent (hierarchy) and head |
| `AssetCategory` | Category master with `tagPrefix` and dynamic `customFields` |

Business rules enforced by the service layer: department re-parenting rejects cycles,
deactivating a department is blocked while it has active members or children, and the last
active Admin is always protected from demotion or deactivation.

---

## Authentication & RBAC

### Roles

| id | Role | Default access |
|---|---|---|
| 1 | Admin | Full control over Departments, Asset Categories, Employee Directory, Dashboard |
| 2 | Asset Manager | Full control over Asset Categories; views Departments, Employee Directory, Dashboard |
| 3 | Department Head | Views Departments, Employee Directory, Dashboard |
| 4 | Employee | Views Dashboard |

### Live promotion

`JwtStrategy.validate()` reads the user's `roleId`/`isActive` from PostgreSQL on every
request, so `PATCH /users/:id/role` is effective on the promoted user's very next API call —
no re-login, no cache to manage.

### No self-elevation

`AuthService.register()` always sets `roleId: EMPLOYEE`, and strict DTO validation strips
any extra field from the signup payload. The only way a role ever changes is through
`PATCH /users/:id/role`, which only Admin can call by default.

---

## Frontend Data Flow

```
services/<x>Service.ts   (axios calls, unwraps the { success, data } envelope)
        ↓
hooks/use<X>.ts          (TanStack React Query — caching, invalidation)
        ↓
app/(admin)/<route>/page.tsx   (page composes components)
```

- **Zustand** powers `authStore` and `localeStore`.
- **`PermissionGate`** wraps mutating UI controls, checked against the frontend's
  `lib/permissions.ts` mirror of the backend matrix.
- **`AdminSidebar`** renders navigation filtered by `hasPermission(roleId, …)`.

---

## Default Logins (Seed Data)

After running `npm --prefix apps/backend run prisma:seed`:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@assetflow.com` | `Admin@123` |
| Asset Manager | `maya.manager@assetflow.com` | `Password@123` |
| Department Head | `raj.head@assetflow.com` | `Password@123` |
| Employee | `sam.emp@assetflow.com` | `Password@123` |

The seed also creates 5 departments (including a parent/child pair: IT → IT Support), 4
asset categories with sample custom fields, and employees spread across departments.

**Demo flow:** log in as Admin → Dashboard → Organization → Employees → **Assign role** on
any Employee → they gain access on their next request, live.

---

## Product Roadmap

**Shipped**
- [x] Login/Signup with realistic, non-self-elevating accounts
- [x] Role-based access control with live promotion
- [x] Organization Setup: Departments, Asset Categories, Employee Directory
- [x] KPI Dashboard

**Coming next** — fully designed in [`docs/`](docs/), ready to build:
- [ ] Asset Registry — auto-generated tags, QR lookup, full per-asset history
- [ ] Allocation & Transfer — conflict-aware allocation with a built-in transfer workflow
- [ ] Resource Booking — calendar booking with automatic overlap prevention
- [ ] Maintenance Management — approval workflow with automatic asset status transitions
- [ ] Asset Audit — structured audit cycles with auto-generated discrepancy reports
- [ ] Reports & Analytics — utilization trends, maintenance frequency, booking heatmaps
- [ ] Activity Logs & Notifications — a real-time activity trail and notification center

---

## Contributing

Here are the collaboration rules in short:

1. **One module per feature branch, one owner** — branch naming: `feat/module-<NN>-<slug>`.
2. **Own your folders; append to shared files.**
3. **Each developer runs their own local Postgres** (`docker compose up -d db`, port 5433).
4. Shared files (`schema.prisma`, the RBAC matrix, `app.module.ts`, `AdminSidebar.tsx`,
   `seed.ts`) get **appended to**, inside a module-labeled banner comment.
5. Copy an existing module as your template — backend: clone `departments/`; frontend:
   clone `components/departments/` + `app/(admin)/organization/`.
6. Before opening a PR: both backend and frontend builds pass clean, every new endpoint has
   `@RequirePermission` + Swagger annotations, and RBAC changes are applied across all three
   mirrors (backend enum, backend matrix, frontend `lib/permissions.ts`).

---

## FAQ

**Q: What does this release cover?**
The foundation of AssetFlow: authentication, role-based access control, and organization
setup (departments, asset categories, employee directory) — everything the rest of the
platform builds on top of.

**Q: Why is there a `tagPrefix` field on Asset Categories already?**
It's there so the upcoming Asset Registry module can generate tags like `AF-0001` per
category without a schema change.

**Q: Why is the permission system a code-based matrix instead of a database table?**
Speed and clarity — it's a single source of truth that's always in sync with the code,
with no cache layer or extra table to manage.

**Q: How does role promotion take effect without logging out?**
`JwtStrategy.validate()` reads the user's role fresh from the database on every request —
see [Authentication & RBAC](#authentication--rbac).

**Q: Can a user pick their own role at signup?**
No — signup always creates an Employee account; only an Admin can promote from the
Employee Directory.

**Q: Where do I find the endpoint list interactively?**
`http://localhost:3001/api/docs` once the backend is running.

**Q: What's the response shape for every endpoint?**
`{ success: boolean, data: <payload> }`, applied consistently across the whole API.

**Q: How are IDs generated?**
Integer autoincrement IDs across every model, chosen for fast, simple joins as new modules
attach relations.

**Q: Why does Postgres run on port 5433 locally?**
So every developer can run their own isolated local database without colliding with a
default Postgres instance already on their machine.

**Q: What's next for the project?**
See [Product Roadmap](#product-roadmap) — Asset Registry, Booking, Maintenance, Audit,
Reports, and Notifications are all designed and ready to build.

---

## License

MIT — as declared in the project's `package.json` files.

---

## Team

Built by:

- **Raja Guru**
- **Prasanna**
- **Tony**
- **Tarakesh**

---

## Acknowledgements

Built with [NestJS](https://nestjs.com), [Prisma](https://www.prisma.io),
[Next.js](https://nextjs.org), [React](https://react.dev), and
[Tailwind CSS](https://tailwindcss.com).

