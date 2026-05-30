# Training Course Management Platform — Architecture Plan (v1)

*Draft for review — updated May 29, 2026. Nothing is built yet; this is the blueprint we agree on before coding.*

---

## 1. What we're building

A web application where:

- **Partners** can create their own space (self-register), log in, and manage the courses they organize — including assigning a trainer to each course or session.
- **You (the manager)** run a central admin panel: you see every partner's courses and set each course's population, topics, badges, and whether it's visible in the public catalogue.
- **Trainees** are stored in a database. Only **ONA** assigns trainees to its courses manually; every other partner and you see only the trainees who registered themselves (that external registration is a later phase). Trainee self-service accounts are not built in v1.

Each partner sees only their own data. You see everything.

---

## 2. Technology & hosting (Railway-native, no external services)

Everything runs on Railway with no third-party SaaS:

- **App:** Next.js (single service — React frontend and backend API in one app). Simplest thing to deploy and maintain on Railway, and flexible enough for the partner dashboard, multi-session layout, and your admin panel.
- **Database:** PostgreSQL (Railway's built-in managed Postgres plugin).
- **ORM:** Prisma (schema in one file, handles migrations).
- **Authentication:** self-hosted (email + password), added later. **For now, a quick-access "demo mode"** lets your team click straight into any role (manager, a partner, ONA, a trainer) without creating accounts — see the role note below.
- **Region:** Railway EU (Amsterdam), to keep data in the EU for GDPR.
- **Deploy flow:** push to GitHub → Railway auto-deploys. You already have both accounts.

---

## 3. User roles

| Role | How created | Can do |
|------|-------------|--------|
| **Manager (you)** | Seeded at setup | See all courses; set each course's population, topics, badges, and catalogue visibility; change any course's dates; manage the trainee database |
| **Partner** | **Self-registers** (creates own space); you can also create one | One login per partner. Manage own courses & sessions; manage own trainer list; (ONA only) assign trainees to courses |
| **Trainer** | Created by their partner (as a trainer record); login added later | See the courses/sessions they've been assigned to, with all details and who's registered (read-only) |
| **Trainee** | *Later phase* | Self-register and sign up for courses via the **Biergerpakt** catalogue — not built in v1 |

One login per partner organization.

**Demo / quick-access mode (for testing now):** instead of creating accounts, the entry screen offers buttons to jump straight into any role — Manager (you), a chosen Partner, ONA, or a chosen Trainer — so your team can click around and test every view. Real password login per partner, per trainer, per ONA-manager, and for you (top manager) is added in a later phase; the data model already stores logins so this is just switching demo mode off.

---

## 4. Data model (the core)

```
Partner ──< Trainer
Partner ──< Course ──< Session >── Trainer
                 │
                 ├──< CourseTopic >── Topic
                 ├──< CourseBadge >── Badge
                 └──< TraineeAssignment >── Trainee   (ONA only)
```

**Partner** — id, name, login (email + password), `manages_trainees` flag (true only for ONA), timestamps.

**Trainer** — id, partner_id (owner), first name, last name, optional email. Trainers are **private to each partner**. The dropdown shows only that partner's trainers; adding one manually saves it here so it appears in the dropdown next time. (Your "database behind the scenes that updates continuously.")

**Course** — id, partner_id, title (free text), **description** (free text, written by the partner), type (`SINGLE` or `MULTI`), **status** (`DRAFT`/`OPEN`/`COMPLETED`/`CANCELLED`), **population** (`POP1`/`POP2`/unset — set only by you), **`visible_in_catalogue`** flag (set only by you — hidden until you publish it), timestamps. Optional recurrence metadata (weekday/time) kept for reference when a series was auto-generated.

**Session** — id, course_id, sequence number (1, 2, 3…), date, start time, end time, `is_online` (yes/no), location/address (when not online), **`teams_link`** (when online), **`places_available`** (capacity for that session — the "places left" figure is computed and shown only on **ONA** courses, where trainees are assigned in-app), trainer_id. A **single-event** course has one session; a **multi-session** course has several. Date, time, location/online, Teams link, capacity and trainer all live at the session level, so each session of a multi-session course has its own details.

**Topic** — 7 predefined topics (generic for now). **CourseTopic** links a course to one or many topics. Set by you only.

**Badge** — 8 predefined badges (Badge 1–8 for now). **CourseBadge** links a course to one or many badges. Set by you only.

**Trainee** — id, family name, first name, social security number (encrypted at rest). v1 builds the table but starts **empty**; it gets populated when we do the Biergerpakt interconnection later.

**TraineeAssignment** — links a trainee to a course, with the course date stored on it. **Only ONA** uses this. It powers both views: "which trainees are in this course" and, on each trainee's record, "which courses (and dates) they've been assigned to."

---

## 5. Screens & features

### Partner space
- **Sign-up & login** — a partner creates their own space, then logs in to their dashboard.
- **Course list** — all their courses, showing title, type, population & catalogue-visibility (read-only, set by you), topics & badges (read-only), and per session: date, time, location or "Online" (with Teams link), places available, and trainer. Multi-session courses show each session as its own clearly-labelled block.
- **Create / edit course** — enter title and a **description**; choose **single event**, **multiple sessions**, or **recurring weekly**; for each session set date, time slot, location with an online toggle (online reveals a Teams meeting link field, hides the address), number of places, and a trainer from the dropdown **or added inline**.
- **Recurring weekly helper** — pick weekday, time, location and trainer once; choose to end after a **number of sessions** *or* on an **end date**; the app generates one multi-session course with all the sessions filled in. Every generated session stays individually editable, and dates can be changed later (no locking).
- **Duplicate a course** — clone an existing course and its sessions in one click to set up the next term, then adjust dates.
- **Course status** — each course is Draft / Open / Completed / Cancelled, so old and cancelled courses are clearly marked.
- **Calendar export (.ics)** — download a calendar file per course/session to add dates to Outlook/Google. Fully self-hosted.
- **Trainer double-booking warning** — alert if a trainer is assigned to two overlapping sessions.
- **Trainer list** — view/add their own trainers (each partner starts with 5 trainers in the test data).
- **(ONA only) Assign trainees** — on ONA's courses (DAPA1–DAPA5, WELCOME), manually add trainees from the database; see who is assigned to each course and **how many places are left** per session.

### Trainer space
- **My courses** — a list of every course/session the trainer is assigned to (a course appears here if any of its sessions names this trainer), sorted by date, with past and upcoming clearly separated.
- **Course detail** — for each course: title, description, type, topics/badges, and every session's date, time, location or "Online" (with the Teams link), and capacity.
- **Who's registered** — the list of trainees registered for the course, with a count and the places-left figure. (Populated for ONA courses now via manual assignment; for other partners it fills in once external registration is connected.)
- Read-only: trainers view their schedule and rosters but don't edit courses.

### Manager admin panel (you only)
- **Partners** — see all partners, create one if needed, set the ONA "manages trainees" flag.
- **All courses** — every partner's courses; for each, set **population**, assign **topics** (1 or many of 7), assign **badges** (1 or many of 8), and toggle **catalogue visibility** (hidden vs published). You can also change any course's dates.
- **Trainee database** — view trainees and each one's assigned courses/dates (populated later).
- **Topics & badges** — manage the 7 topics and 8 badges (rename once defined).
- **Dashboard & filters** — overview counts (courses per population, per topic, fill rate on ONA courses) and filtering/search across all courses (by partner, population, topic, date, status, visibility).
- **Excel export** — export courses and ONA's trainee assignments for your records.
- **Audit log** — record who changed what, for GDPR accountability.

---

## 6. GDPR & security

"SSN" = the **social security number** in the trainee record — sensitive personal data, so:

- Host in Railway's EU region; database stays in the EU.
- Social security numbers **encrypted at rest**, visible only to the manager and ONA. Other partners never see them.
- Passwords hashed (argon2/bcrypt); HTTPS everywhere (Railway default); secure session cookies.
- Strict per-partner data isolation enforced in the backend on every request, not just in the UI.
- Data-minimization and support for deleting a trainee on request. We should confirm the legal basis for storing SSNs before go-live.

---

## 7. Suggested build order (delivered as one v1)

1. Project skeleton, database schema, **demo quick-access role switcher**, EU deployment to Railway.
2. Partner space: courses + sessions (single, multi, and recurring-weekly), online/Teams-link toggle, per-session capacity, trainer dropdown with inline add, duplicate-course, course status.
3. Manager admin: all-courses view with population, topics, badges, catalogue-visibility toggle, dashboard/filters, Excel export, audit log.
4. Trainee database (empty) + ONA trainee assignment + places-left on ONA courses.
5. Trainer space: my-courses, course detail, who's-registered.
6. Calendar export, trainer double-booking warning.
7. Real password login (partner / trainer / ONA / top manager), turning off demo mode.
8. GDPR hardening (SSN encryption, access checks) and a final review pass.

---

## 8. Decisions locked in

- Partners self-register; one login per partner; you can also create partners.
- Trainee table starts empty, populated at the Biergerpakt interconnection (future).
- Only ONA assigns trainees manually; others and you see self-registered trainees (future).
- No locking — partners and you can change dates anytime.
- Topics/badges stay generic for now.
- Online sessions carry a Teams meeting link; capacity is per session; catalogue visibility is a manager-controlled checkbox per course.
- Recurring weekly courses generate one multi-session course, ending by session count or end date.
- Trainers get a read-only space showing their assigned courses/sessions and who's registered.
- v1 ships with a demo quick-access role switcher (no accounts); real per-account password login comes later for partner, trainer, ONA-manager, and top manager.

### Still to confirm before go-live
- Legal basis / consent record for storing social security numbers (GDPR).

---

## 9. Additional features — decisions

> Status: all "Confirmed for v1" items below are now **built** in the app, along with password login and SSN encryption. See README "Features".

**Confirmed for v1** (now folded into the sections above):

- Duplicate a course
- Course status (Draft / Open / Completed / Cancelled)
- Calendar export (.ics)
- Manager dashboard & filters
- Trainer double-booking warning
- Excel export
- GDPR audit log
- "Places left" — **only on ONA courses** (other partners' trainees register externally, so remaining places can't be computed there)

**Dropped — handled by the external program:**

- Attendance & completion tracking
- Confirmation emails

**Still open / optional:** interface language (German/French toggle) — say the word if you want it.

---

## 10. Programmes récurrents et éditions (planifié)

**Besoin :** un même cours (ex. DAPA 1) est proposé plusieurs fois dans l'année — chaque fois avec ses propres séances (séance 1, 2, 3). Des participants font le cycle de janvier, d'autres celui de février.

**Solution retenue — trois niveaux :** *Programme → Édition → Séance*.

- **Programme** (ex. « DAPA 1 ») : la définition récurrente. Créé par un **partenaire**. Porte les informations partagées, définies par l'**administrateur** : étape DPI, catalogue (principal / DPI), type d'activité (principal/secondaire/tertiaire), domaine de la loi (principal/secondaire/tertiaire), badges. **Toutes ses éditions héritent** de ces informations.
- **Édition** (= l'« activité » actuelle, un cycle daté : « DAPA 1 – janvier ») : créée par le partenaire avec ses propres **séances**, son **statut** (Brouillon/Ouvert/…) et ses **participants**. Une édition peut aussi être **autonome** (sans programme) pour un événement ponctuel — comportement actuel conservé.
- **Séance** : une date (inchangé).

**Participation & présence :** le participant s'inscrit à une **édition**. La présence est marquée **par séance** (présent/absent). Une édition est **« complétée »** quand le participant a assisté à toutes ses séances. La grille DPI affiche ✓ quand le participant a complété une édition du programme (ou via le marquage manuel).

**Modèle de données :**

- Nouveau `Programme` : `name`, `partnerId`, `dpiStep?` (DAPA1…BIENV ou aucun), + les champs admin partagés (catalogue, type ×3, domaine ×3, badges).
- `Course` (= édition) reçoit `programmeId?` (nul = activité autonome). Les champs admin se lisent depuis le programme quand l'édition y est rattachée ; sinon ils restent sur l'édition.
- Nouveau `Attendance` (présence par séance) : `traineeId`, `sessionId`, `status`.
- La règle « à compléter » et les statistiques (par type/domaine principal) passent au niveau **programme**.

**Impact sur l'UI :**

- **Partenaire** : crée un programme, puis ajoute des éditions (chacune avec ses séances) sous ce programme.
- **Administrateur** : définit le catalogue / type / domaine / badges / étape DPI **sur le programme** (l'alerte « à compléter » suit les programmes).
- **DPI – Gérer un participant** : on choisit l'**édition** (le cycle mensuel) à affecter ; la correspondance avec les colonnes DAPA se fait via `dpiStep` du programme (plus par le titre).
- **Statistiques** : agrégées par programme.

**Migration (seed) :** créer les 6 programmes DPI (DAPA 1–5, Bienvenue) et rattacher les activités DAPA/Bienvenue existantes comme premières éditions.

**Phasage proposé :**
1. Modèle `Programme` + rattachement des activités ; déplacement des champs admin vers le programme ; correspondance DPI par `dpiStep`.
2. Présence **par séance** + logique de complétion ; mise à jour du ✓ de la grille DPI.
3. UI partenaire pour programmes & éditions ; champs admin du programme + alerte « à compléter » au niveau programme.
