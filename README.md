# Asset Management System

Monorepo mirroring the HRM stack: **NestJS 11 + Prisma 5** API and **Next.js 16 (App Router) + React 19** frontend. Domain = asset tracking (assets, categories, vendors, assignments, maintenance).

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

# 2. Database
docker compose up -d db          # or point apps/backend/.env at your own Postgres
npm --prefix apps/backend run prisma:generate
npm --prefix apps/backend run prisma:migrate    # creates tables
npm --prefix apps/backend run prisma:seed       # admin@asset.com / Admin@123 + sample data

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

## Default login

```
admin@asset.com / Admin@123
```
