# AssetFlow — Team Working Rules (read this before writing any code)

> **Audience:** every Claude Code agent + developer working in this repo.
> **Goal:** 3 people build separate modules on separate feature branches and **merge with zero conflicts**.
> Claude Code loads this file automatically each session — follow it exactly.

This repo already ships **Module 1 (Auth) + Module 3 (Organization Setup)**. New work = adding
Modules 4+ (Assets, Allocation, Bookings, Maintenance, Audit, Reports, Notifications). The rules
below exist because a monorepo has a handful of **shared files** that everyone is tempted to edit —
those are where merge conflicts come from. Touch them by the rules and merges stay clean.

---

## 0. Golden rules (the whole file in 6 lines)

1. **One module per feature branch, one owner.** Never work two modules in one branch.
2. **Own your folders; append to shared files.** Never reorder or reformat code you didn't write.
3. **Each dev runs their OWN database.** Never point a feature branch at a teammate's DB.
4. **`schema.prisma`, the RBAC matrix, `app.module.ts`, `AdminSidebar.tsx`, `seed.ts` are shared —**
   edit only inside your module's marked block (see §5).
5. **Rebase on `main` daily.** Small PRs beat big ones.
6. **Copy the existing pattern.** New backend module → clone `departments/`. New screen → clone `(admin)/organization/`.

---

## 1. Branching & git

- Branch from up-to-date `main`: `git checkout main && git pull --rebase && git checkout -b feat/module-04-assets`.
- **Naming:** `feat/module-<NN>-<slug>` (e.g. `feat/module-05-bookings`, `feat/module-07-maintenance`).
- **Never commit to `main`.** Open a PR; at least one teammate reviews.
- **Rebase daily:** `git fetch origin && git rebase origin/main`. Resolving 3 small conflicts today beats 30 at the end.
- **Commit style:** `feat:`, `fix:`, `chore:`, `refactor:`, `docs:` (matches existing history). One logical change per commit.
- **Never touch these in a feature PR** unless the change IS your task: unrelated files, whole-file reformatting, dependency bumps, `.env`, `package-lock.json` churn you didn't cause.
- Do not run `prettier`/`eslint --fix` across files you didn't change — format-only diffs cause phantom conflicts.

---

## 2. Module ownership (agree once, then stay in your lane)

Each module **owns** a private set of files. Suggested split for 3 devs (adjust in your kickoff, then record it here):

| Dev | Modules | Owns (private — no conflicts here) |
|-----|---------|-------------------------------------|
| A | 4 Assets, 5 Allocation/Transfer | `backend/src/assets/`, `backend/src/allocations/`, `frontend/app/(admin)/assets/`, `frontend/components/assets/` |
| B | 6 Bookings, 7 Maintenance | `backend/src/bookings/`, `backend/src/maintenance/`, `frontend/app/(admin)/bookings/`, … |
| C | 8 Audit, 9 Reports, 10 Notifications | `backend/src/audits/`, `backend/src/reports/`, `frontend/app/(admin)/audit/`, … |

**Everything under your module folder is yours** — controllers, services, DTOs, routes, components,
hooks, services, types. Put module types in `frontend/types/<module>.ts`, not in shared type files.

---

## 3. Database — the #1 conflict source, so isolate it

Three people running `prisma db push` against **one** database will overwrite each other's schema.
Don't. Rules:

- **Every dev develops against their own Postgres.** Fastest: `docker compose up -d db` (binds host **:5433**
  per `docker-compose.yml`) and set `apps/backend/.env` →
  `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/asset_management` (also set `DIRECT_URL` to the same).
- **Do NOT commit your local `.env`.** The committed one is a template. Keep your DB URL local with
  `git update-index --skip-worktree apps/backend/.env` (undo later with `--no-skip-worktree`). NestJS reads `.env`.
- The shared remote (`140.245.7.48:5433`) is the **integration/demo** DB — only `main` is applied to it,
  and only by the person merging.
- On your branch, sync with `npx prisma db push` and re-seed. `schema.prisma` is the source of truth;
  `db push` never creates migration files, so there is nothing to conflict on **except the schema file itself** (see §5.1).

---

## 4. Backend conventions (so every module looks the same and merges clean)

Copy `src/departments/` as the template. Every feature module:

- Is a self-contained Nest module: `<name>.module.ts / .controller.ts / .service.ts` + `dto/`.
- Guards every endpoint with `@RequirePermission({ resource, action })` (see §5.2). No inline role checks.
- DTOs use `class-validator`; the global pipe is `whitelist + forbidNonWhitelisted`, so **every field must be declared** or the request 400s.
- Returns plain data — the global interceptor wraps it as `{ success, data }`. Don't hand-roll envelopes.
- Uses `ParseIntPipe` for `:id` params (ids are `Int`). Never select `password`; reuse the `USER_SAFE_SELECT` pattern.
- Business-rule violations throw `BadRequestException` / `ConflictException` with a human message.

---

## 5. Shared touch-points — edit ONLY inside your marked block

These files are unavoidably shared. For each, the rule is the same: **append your module's block, wrapped
in a comment banner, never reorder existing entries.** A conflict here then becomes a trivial "keep both blocks".

### 5.1 `apps/backend/prisma/schema.prisma`
- **Append** your models at the end under a banner:
  ```prisma
  // ===================== Module 5: Bookings (owner: B) =====================
  model Booking { ... }
  ```
- **Back-relations on shared models** (`User`, `Department`, `Asset`) are the one place two branches touch
  the same model. Add each back-relation on its **own line** under a per-module banner inside that model, e.g.
  ```prisma
  model User {
    // ... existing fields ...
    // --- Module 5 (Bookings) back-relations ---
    bookings Booking[]
  }
  ```
  When two branches both add a line here, resolve by **keeping both lines** — never delete a teammate's relation.
- Never rename/reorder existing fields or models. Never change an existing model's `@@map` or ids.

### 5.2 RBAC matrix — update **both mirrors in the same PR**
The permission model is a static matrix duplicated on purpose. Keep them in lockstep:
- `apps/backend/src/common/rbac/permissions.enum.ts` — add your `Resource` enum value(s).
- `apps/backend/src/common/rbac/role-permissions.ts` — add each role's actions for your resource.
- `apps/frontend/lib/permissions.ts` — mirror the **exact** same additions.
- Append new `Resource` members at the **end** of the enum; add matrix rows per role. If you forget the
  frontend mirror, buttons/nav won't gate correctly even though the API is safe.

### 5.3 `apps/backend/src/app.module.ts`
- Add your `import` and one entry in the `imports` array. **Keep the list alphabetical** so everyone inserts
  in a predictable place → git auto-merges most of the time.

### 5.4 `apps/backend/src/main.ts` (Swagger)
- Add one `.addTag('<Your Module>', '…')` line next to the others. Trivial, append-only.

### 5.5 `apps/frontend/components/layout/AdminSidebar.tsx`
- Add one entry to the `NAV` array with your route + the `Resource` that gates it. Append at the end.

### 5.6 `apps/frontend/app/(admin)/<your-module>/`
- Your route folder is **private** — no conflicts. The `(admin)/layout.tsx` shell is shared; don't edit it.

### 5.7 Seed — split, don't share one file
- Do **not** pile everyone's seed data into `prisma/seed.ts`.
- Create `prisma/seeds/<module>.ts` exporting `export async function seed<Module>(prisma) { ... }` (idempotent `upsert`).
- Add **one import + one call** to `seed.ts` (append-only). Reuse the seeded roles/depts/users — don't recreate them.

### 5.8 `package.json` (dependencies)
- Announce new deps in the team channel first (avoid two people adding two date libs). Add the dep, run install,
  commit `package.json` **and** the lockfile together in one commit.

---

## 6. Frontend conventions

Copy `components/departments/` + `app/(admin)/organization/` as the template. Every screen:

- Data flow is **`services/<x>Service.ts` → `hooks/use<X>.ts` (React Query) → page/component**. Zustand is for auth only.
- Reuse the UI kit (`components/ui/*`) and shared helpers (`components/common/*`: `PermissionGate`, `ConfirmDialog`,
  `EmptyState`, `StatCard`, `Tabs`, `Table`). **Don't fork the UI kit** — if you need a new shared primitive, add a new
  file with a new name and mention it in your PR.
- Gate every mutating control with `<PermissionGate resource={…} action={…}>`; the server re-checks anyway, this is UX only.
- Style with the Tailwind tokens (`bg-card`, `text-muted`, `border-border`, `text-primary`, `text-danger`, …). No hard-coded hex.
- Every list has loading + empty states; every mutation shows a `sonner` toast; destructive actions use `ConfirmDialog`.

---

## 7. Definition of Done / PR checklist

Before you open a PR, tick all of these:

- [ ] Branch rebased on `origin/main`; conflicts resolved locally.
- [ ] `npm --prefix apps/backend run build` passes (0 TS errors).
- [ ] `npm --prefix apps/frontend run build` passes (0 TS errors, all routes compile).
- [ ] Every new endpoint has `@RequirePermission` + Swagger annotations; verified in `/api/docs`.
- [ ] RBAC change (if any) applied to **all three** files (§5.2).
- [ ] Module registered in `app.module.ts`; nav added to `AdminSidebar.tsx`; seed added under `prisma/seeds/`.
- [ ] Schema additions are append-only under a module banner; no edits to existing models except append-only back-relations.
- [ ] Smoke-tested against your **own** DB (login → your screen → happy path + one rejection path).
- [ ] No stray files: no `.env`, no `node_modules`, no editor config, no format-only diffs.
- [ ] PR description lists which shared files you touched and why.

---

## 8. When you hit a conflict

- 99% of conflicts here are in the shared files of §5 and are **"keep both blocks"** — never resolve by deleting a
  teammate's model, enum value, matrix row, nav item, or back-relation.
- If two modules genuinely need the same new shared model/field, **stop and coordinate** — one person adds it, the other rebases onto it.
- Prisma client out of sync after a rebase: `npx prisma generate` then `npx prisma db push` against your own DB.

---

## 9. Hard "never"s

- Never point a feature branch at the shared remote DB, or run `db push` against it.
- Never edit another module's folder.
- Never reformat / reorder / rename in shared files — append only.
- Never add a role check outside the RBAC matrix; never trust the client for authorization.
- Never commit secrets, `.env`, generated Prisma client, or `node_modules`.
- Never merge a PR that fails either build.

---

*Keep this file current: when the module ownership map (§2) is finalized, edit the table. When a new shared
touch-point appears, document it in §5 so the next person knows the rule.*
