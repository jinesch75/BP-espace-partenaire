# Espace partenaire

Web app to manage training courses, partners, trainers and trainees. Built to run entirely on **Railway** (Next.js app + Railway PostgreSQL), with no external services.

It supports **two ways in**: real **password login** (`/login`) for the manager, partners and trainers, and a **demo mode** (`/`) where anyone can click straight into any role without an account — handy while your team tests.

## Demo accounts

All seeded accounts use the password **`biergerpakt`**.

- **Manager:** `manager@espace.lu`
- **Partners:** `<partnername>@espace.lu` — e.g. `ona@espace.lu`, `akademieeupen@espace.lu` (the email is the partner name lowercased, no spaces).
- **Trainers:** `firstname.lastname<id>@espace.lu` (look up exact emails in the Trainees/Trainers tables, or just use demo mode for trainers).

Change these before any real use.

---

## What's inside

- **Next.js 14** (React, App Router) — one service, frontend + backend together.
- **PostgreSQL** via Prisma (`prisma/schema.prisma`).
- **Seed data** (`prisma/seed-data.json`): 10 fictional partners (one is ONA), 5 trainers each, courses across H2 2026, 7 topics, 8 badges, and 100 trainees. All made-up for testing.

Roles and what they see:

- **Manager (you):** dashboard, all courses (set population / topics / badges / catalogue visibility), trainee database.
- **Partner:** their own courses (create single / multi-session / recurring-weekly, duplicate, set status), their trainer list. **ONA** also assigns trainees and sees places left.
- **Trainer:** read-only list of the courses/sessions they run, with the roster.

---

## Run it locally

1. Install [Node.js 18+](https://nodejs.org).
2. In this folder: `npm install`
3. Copy `.env.example` to `.env` and put a PostgreSQL connection string in `DATABASE_URL` (a local Postgres, or your Railway one).
4. Create the tables and load the test data: `npm run db:setup`
5. Start: `npm run dev` → open http://localhost:3000

---

## Deploy to Railway

1. Push this folder to a GitHub repository.
2. In Railway: **New Project → Deploy from GitHub repo**, pick the repo.
3. In the project, **+ New → Database → PostgreSQL**. Railway sets the `DATABASE_URL` variable automatically.
4. Pick the **EU (Amsterdam) region** for the service and the database (GDPR — the trainee data should stay in the EU).
5. Railway builds and deploys automatically (`npm run build` then `npm start`).
6. **One time only**, create the tables and load the test data. Open the app service's **shell / command** in Railway and run:

   ```
   npm run db:setup
   ```

   This runs `prisma db push` (creates the tables) then the seed (idempotent — it skips if data already exists, so it's safe to run again).

After that the app is live. Every later `git push` redeploys automatically; you do **not** need to re-run `db:setup` unless the schema changes.

---

## Useful scripts

- `npm run dev` — local development
- `npm run build` / `npm start` — production (what Railway uses)
- `npm run db:push` — apply the schema to the database
- `npm run db:seed` — load the fictional test data (idempotent)
- `npm run db:setup` — push schema **and** seed in one go

---

## Features

- Password login + demo mode (above).
- **Partner:** create/edit courses (single, multi-session, recurring-weekly), full session editing (add/remove/edit each session), duplicate a course, course status, manage trainers, trainer double-booking warning, `.ics` calendar export.
- **Manager:** dashboard, all-courses editor (population, topics, badges, catalogue visibility) with filters, trainee database, **Excel export**, **audit log**.
- **ONA:** assign trainees to its courses with places-left.
- **Trainer:** read-only schedule of assigned courses + roster, `.ics` export.
- **GDPR:** trainee national number encrypted at rest (`ENCRYPTION_KEY`); audit log of logins and changes; EU hosting.

## Known next steps (not built yet)

- The Biergerpakt trainee-registration interconnection (trainees register externally and flow in).

> The national numbers in the seed data are **fictional**. Set a real `ENCRYPTION_KEY` in Railway before loading any real trainee data.
