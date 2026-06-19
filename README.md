# Teacher Classroom OS

A Thai-language classroom administration SaaS for teachers and school
admins: student records, attendance (incl. QR check-in), behavior &
gamification (XP/coins/leaderboard/reward shop), academics, health,
classroom finance, and more.

## Tech stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS v3 + hand-written shadcn/ui-style components (Radix UI primitives, class-variance-authority, tailwind-merge)
- **Animation:** Framer Motion
- **Forms:** React Hook Form + Zod
- **State:** Zustand (auth store)
- **Tables:** TanStack Table v8
- **Charts:** Recharts (via shadcn `ChartContainer` pattern)
- **Backend/DB/Auth:** Supabase (Postgres + Row Level Security, `@supabase/supabase-js`, `@supabase/ssr`)
- **Deploy target:** Vercel

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL/keys
npm run dev
```

### Set up the database

This repo includes hand-written SQL migrations (no Supabase CLI required,
but using it is recommended):

```bash
# If you use the Supabase CLI and have linked a project:
supabase db push          # applies supabase/migrations/*.sql
supabase db seed          # or: psql ... -f supabase/seed.sql
```

Or apply the files manually in order via the Supabase SQL editor:

1. `supabase/migrations/20250101000001_extensions_enums.sql`
2. `supabase/migrations/20250101000002_core_users_schools.sql`
3. `supabase/migrations/20250101000003_attendance.sql`
4. `supabase/migrations/20250101000004_behavior_gamification.sql`
5. `supabase/migrations/20250101000005_academic.sql`
6. `supabase/migrations/20250101000006_health.sql`
7. `supabase/migrations/20250101000007_finance.sql`
8. `supabase/migrations/20250101000008_tier3_modules.sql`
9. `supabase/migrations/20250101000009_rls_policies.sql`
10. `supabase/seed.sql` (sample Thai school/teachers/students data — note:
    direct inserts into `auth.users` may be restricted on hosted Supabase;
    see comments in the file)

After applying migrations, regenerate accurate types instead of relying on
the hand-written `src/lib/supabase/types.ts`:

```bash
npx supabase gen types typescript --project-id <your-project-id> > src/lib/supabase/types.ts
```

### Deploying to Vercel

1. Push this repo to GitHub/GitLab.
2. Import the project in Vercel.
3. Add the environment variables from `.env.example` (at minimum
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy. `npm run build` is the default build command and works out of
   the box (see "Build status" below).

## npm scripts

| Script | Status |
| --- | --- |
| `npm run dev` | Works |
| `npm run build` | Works — verified passing (see below) |
| `npm run start` | Works (after `build`) |
| `npm run lint` | Works — `next lint` (ESLint + `eslint-config-next`), no warnings/errors |
| `npx tsc --noEmit` | Works — passes with zero errors |

There is no separate `typecheck` script defined in `package.json`; use
`npx tsc --noEmit` directly (this is what was run to verify the build
below).

### Build status (verified)

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (25/25)
```

The build succeeds even with **no Supabase environment variables set**,
because all data-fetching pages are dynamically rendered (`ƒ` in the route
list) rather than statically generated — they call `createClient()` from
`@/lib/supabase/server` per-request. Static marketing-style pages
(`/login`, `/register`, Tier 3 placeholder pages, `/`) are pre-rendered as
static (`○`). If you want stricter guarantees, set real Supabase env vars
before building so any accidental static-generation-time queries surface
real errors instead of being silently skipped.

## Implementation status (honest breakdown)

### Tier 1 — fully working (real Supabase CRUD, real forms, real tables)

- **Dashboard** (`/dashboard`): live summary cards, 7-day attendance trend
  chart, performance trend chart, quick actions. All data from real
  Supabase queries (`src/lib/queries/dashboard.ts`).
- **Students** (`/students`, `/students/[id]`): TanStack Table list with
  search, create/edit dialog (RHF + Zod), and a detail page with tabs
  (ข้อมูลส่วนตัว / ผู้ปกครอง / สุขภาพ / ผลการเรียน) backed by real joined
  queries.
- **Attendance** (`/attendance`, `/attendance/qr`, `/attendance/kiosk`):
  daily attendance list with status badges, a QR-token generation page
  that writes to `qr_tokens` and renders a QR image pointing at the kiosk
  URL, and a kiosk check-in page that writes real rows to `attendance` +
  `attendance_logs`.
  - **Important:** the kiosk page's camera/QR-scanning UI
    (`src/components/attendance/camera-placeholder.tsx`) is a **visually
    labeled placeholder only** — it does not access the camera or decode
    QR codes. It contains a TODO comment explaining exactly how to wire up
    `@zxing/browser` to make it work. Manual student-code entry is the
    only real, working check-in path right now.
- **Behavior & Gamification** (`/behavior`, `/leaderboard`,
  `/reward-shop`): logging positive/negative behavior writes
  `behavior_records` + `xp_transactions` and updates `students.xp`; the
  leaderboard is a sortable/filterable TanStack Table over live student
  XP/coins; the reward shop lists `reward_shop_items` and redeeming writes
  a `coin_transactions` row and decrements `students.coins`.

### Tier 2 — real pages, real Supabase queries, simpler CRUD

- **Academic** (`/academic`): lists subjects and recent scores via real
  joined queries. No score-entry form yet (read-only list).
- **Health** (`/health`): lists recent health records via a real joined
  query. No create/edit form yet (read-only list).
- **Finance** (`/finance`): shows account balances and a real transaction
  list via joined queries. No transaction-entry form yet (read-only list).

### Tier 3 — scaffold only (route + page shell + TODO, DB schema exists)

`/lunch`, `/home-visits`, `/sdq`, `/documents`, `/communication`,
`/reports`, `/settings` all render a shared `ComingSoon` component listing
planned features and the backing table names. **No queries are wired up.**
The corresponding tables (`meal_records`, `home_visits`,
`sdq_assessments`, `documents`, `announcements`, `notifications`,
`audit_logs`) already exist in the migrations for when these are built
out.

### AI features — stubs only, not fabricated

`src/lib/ai/index.ts` contains typed function signatures only
(`generateStudentSummary`, `analyzeAttendancePattern`,
`analyzeBehaviorTrend`, `analyzeAcademicPerformance`,
`summarizeHomeVisit`, `generateCertificate`, `writeReport`,
`detectRisk`). Every function throws
`new Error("Not implemented: wire X to an LLM provider")`. **None of them
call a real LLM, use an API key, or fake a working response.** Wire these
up to e.g. the Anthropic API with a server-side key when ready.

## Known gaps / TODOs

- **QR camera scanning is not implemented.** `camera-placeholder.tsx` is a
  static UI stand-in with a TODO for `@zxing/browser` — do not assume the
  kiosk can actually scan anything yet.
- **No AI/LLM integration is wired up anywhere** — see `lib/ai/index.ts`.
- Tier 2 pages (academic/health/finance) are read-only lists; no
  create/edit forms yet.
- Tier 3 pages are route shells only; no data layer.
- `src/lib/supabase/types.ts` is hand-written (not generated from a real
  Supabase project) and covers Tier 1/2 tables plus enough of Tier 3 to
  compile; regenerate it with the Supabase CLI once linked to a real
  project for full accuracy.
- `supabase/seed.sql` inserts into `auth.users` directly inside a
  `DO` block for convenience in local/self-hosted Postgres — this is
  likely to be **restricted on hosted Supabase** (which manages
  `auth.users` itself). If seeding against hosted Supabase, create users
  via the Auth Admin API or dashboard first, then insert the
  application-level `users`/`teachers`/`students` rows referencing those
  IDs.
- RLS policies (`20250101000009_rls_policies.sql`) follow the intended
  5-role model (super_admin/school_admin/teacher/parent/student) but have
  not been exercised against a live Supabase project with real auth
  sessions — review and test them before relying on them in production.
- No automated tests exist yet.
- Middleware only enforces *authentication* (logged in vs. not) on
  protected route prefixes; per-row *authorization* is expected to be
  enforced by RLS policies, not the middleware.
