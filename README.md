# AssetFlow — Auth, RBAC & Organization Setup (Module 1 + 3)

Monorepo: **NestJS 11 + Prisma 5** API and **Next.js 16 (App Router) + React 19** frontend.

This build covers **Module 1 (Login/Signup)** and **Module 3 (Organization Setup)** from the
AssetFlow scope: JWT auth with no self-elevation, a static role-permission matrix (Admin / Asset
Manager / Department Head / Employee), Departments (hierarchy + heads), Asset Categories with
custom fields, the Employee Directory with **live role promotion (no re-login)**, and a KPI
dashboard. Module 4+ (assets, bookings, maintenance, audits) is intentionally out of scope.

```
asset_management/
├── package.json            # root — concurrently dev/build/start scripts
├── docker-compose.yml      # Postgres 16
└── apps/
    ├── backend/            # NestJS API (port 3001)
    │   ├── prisma/schema.prisma
    │   └── src/
    │       ├── auth/ users/ categories/ assets/ health/
    │       ├── common/ (filters, interceptors, decorators)
    │       ├── config/ prisma/
    │       └── main.ts app.module.ts
    └── frontend/           # Next.js app (port 3000)
        ├── app/ (auth)/login  dashboard/{assets,categories}
        ├── lib/ services/ store/ hooks/ theme/ i18n/ components/ui/
```

## Stack

**Backend:** NestJS 11, Prisma 5 (`@prisma/client`), `@nestjs/jwt` + `passport-jwt`, `class-validator`, `@nestjs/swagger`, `bcrypt`, `pg`. Full HRM dependency set is installed (mailer, schedule, exceljs, minio, supabase, tensorflow/face-api, MCP SDK, …) so the stack stays identical and extensible.

**Frontend:** Next 16, React 19, Tailwind CSS v4, `@tanstack/react-query`, `zustand`, `axios`, `next-intl`, `react-hook-form` + `zod`, `recharts`, `lucide-react`, `sonner`.

## Architecture (scalable patterns)

- **Response envelope** — a global `TransformInterceptor` wraps every success as `{ success, data }`; `AllExceptionsFilter` emits the same shape for errors. Frontend axios unwraps it.
- **Auth** — global `JwtAuthGuard` (APP_GUARD) protects everything; `@Public()` opens login/register/health. `@Roles()` + `RolesGuard` for RBAC. JWT via Passport.
- **Feature modules** — each domain (`auth`, `users`, `categories`, `assets`) is a self-contained Nest module (controller + service + DTOs). Add a new domain by copying the pattern.
- **Prisma** — `@Global` `PrismaModule`; single `PrismaService`.
- **Frontend** — `services/*` (axios) → `hooks/*` (react-query) → `app/*` pages. `zustand` for auth/locale state. Theme provider (light/dark). i18n (en/ar) scaffolded.

## Prerequisites

- Node 20+, npm
- Postgres (use `docker compose up -d db` for a local one on `:5432`)

## Setup

```bash
# 1. Install (run once per app)
npm install
npm --prefix apps/backend install
npm --prefix apps/frontend install

# 2. Database  (apps/backend/.env already points at the shared Postgres)
npm --prefix apps/backend run prisma:generate
npx --prefix apps/backend prisma db push          # sync schema (no migration files)
npm --prefix apps/backend run prisma:seed         # roles, admin, depts, categories, employees

# 3. Run both apps
npm run dev            # BE :3001 + FE :3000 (concurrently)
# or individually:
npm run dev:backend
npm run dev:frontend
```

- Frontend: http://localhost:3000
- API: http://localhost:3001
- Swagger: http://localhost:3001/api/docs

## Environment

`apps/backend/.env` (copy from `.env.example`):

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asset_management
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/asset_management
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
PORT=3001
```

`apps/frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Default logins

```
Admin   admin@assetflow.com   / Admin@123
Others  *.assetflow.com       / Password@123   (e.g. maya.manager@assetflow.com,
                                                 raj.head@assetflow.com, sam.emp@assetflow.com)
```

**Demo flow:** log in as admin → Dashboard (KPIs) → Organization → Employees → **Assign role** on any
Employee → they gain access on their next request with no re-login. Departments enforce a hierarchy
cycle-check and block deactivation while members remain; the last active Admin cannot be demoted.
