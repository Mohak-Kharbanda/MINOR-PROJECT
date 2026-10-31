# EduTrack — Student Project Management System

EduTrack is one platform for academic projects, from proposal through final submission and evaluation, replacing scattered emails, spreadsheets and in-person follow-ups.

- **Students** form teams with a join code, propose a project to a faculty guide, plan work on a drag-and-drop task board, upload files (with full version history), track progress ("62% complete") and submit final deliverables.
- **Faculty** see every team they guide with a live progress bar, approve or reject proposals with feedback, open/comment on files, **download a student's file, edit it and upload a revised version with a comment**, return submissions for changes, and enter marks.
- **Admins** manage students, faculty, departments and project records, reassign guides, see **every team ranked by progress**, spot at-risk teams, and review a full audit trail.

Every permission is enforced by the API on every request. The UI only hides what the server would refuse anyway.

---

## Contents

1. [Repository layout](#repository-layout)
2. [Architecture & stack](#architecture--stack)
3. [Quick start (local)](#quick-start-local)
4. [Environment variables](#environment-variables)
5. [Database, seed data & the first admin](#database-seed-data--the-first-admin)
6. [Commands](#commands)
7. [Tests](#tests)
8. [Roles & permissions](#roles--permissions)
9. [Features](#features)
10. [API overview](#api-overview)
11. [Deployment](#deployment)
12. [External services & secrets](#external-services--secrets)
13. [Troubleshooting](#troubleshooting)

---

## Repository layout

```
.
├── spms-shared/        @edutrack/shared — constants, Zod request schemas, response types, progress maths
├── spms-backend/       @edutrack/backend — Express + TypeScript REST API, Mongoose models, tests, scripts
│   ├── src/
│   │   ├── config/        env validation (Zod), MongoDB connection
│   │   ├── models/        User, Department, Team, Project, Task, ProjectFile, AuditLog
│   │   ├── controllers/   auth, users, departments, teams, projects, tasks, files, dashboards, audit
│   │   ├── services/      access control, progress, storage drivers, audit, mailer, bootstrap
│   │   ├── middleware/    auth/RBAC, validation, uploads, rate limits, error handler
│   │   └── routes/        all routes in one readable file
│   ├── scripts/           seed.ts, createAdmin.ts, localDb.ts
│   └── tests/             Jest + Supertest against a real (in-memory) MongoDB
├── spms-frontend/      @edutrack/frontend — React + Vite + TypeScript web app
│   └── src/
│       ├── components/    UI kit (buttons, fields, progress bars, modals…), layout, landing
│       ├── features/      project workspace: overview, task board, files, feedback, actions
│       ├── pages/         landing, auth, student, faculty, admin, shared pages
│       ├── hooks/         TanStack Query hooks for every API resource
│       └── lib/           API client (token refresh), formatting helpers
├── Dockerfile           single container: API + built web app
├── docker-compose.yml   MongoDB + EduTrack
├── render.yaml          Render Blueprint (one web service)
└── .github/workflows/   CI: install, build, test
```

It is an npm-workspaces monorepo, so one `npm install` at the root installs everything.

## Architecture & stack

| Layer | Choice |
|---|---|
| Web app | React 18, Vite 6, TypeScript, Tailwind CSS (CSS-variable design tokens, light/dark), Framer Motion, TanStack Query, React Router 7, lucide icons. Fonts: Bricolage Grotesque, Geist, Geist Mono. |
| API | Node 20+, Express 4, TypeScript, REST, Zod validation, centralized error handling, helmet, CORS, rate limiting |
| Database | MongoDB with Mongoose (indexes + unique constraints) |
| Auth | Short-lived JWT access token (memory only, never localStorage) + rotating httpOnly refresh cookie; bcrypt (12 rounds); token versioning for instant revocation |
| Files | Pluggable storage: **Cloudinary**, **AWS S3 / S3-compatible**, or **local disk**. Files are private; downloads use 5-minute signed URLs issued after an access check |
| Tests | Jest + Supertest + mongodb-memory-server (API), Vitest + Testing Library (web) |

**Deviations from the suggested stack, and why:**
- **Tailwind CSS** for "modern responsive CSS". It was already in the project, and its tokens are CSS variables, so light and dark themes come from one set of components.
- **Single-service production deploy.** In production the API also serves the built web app from the same origin. That means no CORS setup, and the refresh cookie is first-party, so it isn't blocked as a third-party cookie (Safari blocks those, and Chrome is phasing them out). A split deploy (Vercel + Render) is also documented.
- **Local disk storage** is an extra driver for development, tests and single-server/Docker deploys. Cloudinary or S3 is recommended on hosts with ephemeral disks.
- **Real-time:** views refresh by **polling** (every 15–45 s, plus immediately after your own changes). The UI labels this "Auto-refresh · 20s". There are no websockets.

## Quick start (local)

Requirements: **Node.js 20+** (22 recommended) and npm 10+. MongoDB is optional, because the repo can run one for you.

```bash
npm install
```

```bash
cp spms-backend/.env.example spms-backend/.env
```

Edit `spms-backend/.env`: set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to long random strings (see the command in the file). For a local demo, also set `DEMO_MODE=true`.

Start MongoDB, the API and the web app together (the first run downloads a ~66 MB MongoDB binary):

```bash
npm run dev:full
```

In a second terminal, load demo data:

```bash
npm run seed
```

Open **http://localhost:5173**. With `DEMO_MODE=true` the sign-in page lists demo accounts; the password for all of them is `Password123`.

| Role | Email | Scenario |
|---|---|---|
| Admin | `admin@edutrack.test` | everything |
| Faculty | `meera.iyer@edutrack.test` | guides an in-progress and an evaluated team |
| Faculty | `rahul.deshpande@edutrack.test` | has a proposal waiting for review |
| Student | `aarav@edutrack.test` | team leader, project ~50% complete, files with faculty revisions |
| Student | `vihaan@edutrack.test` | at-risk project with overdue tasks |
| Student | `tanvi@edutrack.test` | proposal pending review |
| Student | `nisha@edutrack.test` | rejected proposal to revise |
| Student | `siddharth@edutrack.test` | team without a project yet |

Already have MongoDB (local or Atlas)? Set `MONGODB_URI` and run `npm run dev` instead of `dev:full`.

The API listens on **:4000**, not 5000, because macOS uses port 5000 for AirPlay. In development, Vite proxies `/api` to it.

## Environment variables

All API settings live in `spms-backend/.env` (template: [`spms-backend/.env.example`](spms-backend/.env.example)). They are validated at startup, and the server refuses to boot with weak JWT secrets in production.

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | | `development` / `production` / `test` |
| `PORT` | | API port (default 4000; hosts usually set it) |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | ✅ prod | Two different random strings, 32+ characters |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | | Default `15m` / `7d` |
| `APP_URL` | ✅ prod | Public URL of the web app (used in password-reset links) |
| `CLIENT_ORIGIN` | split deploy | Comma-separated origins allowed by CORS |
| `SERVE_CLIENT` / `CLIENT_DIST_DIR` | | Serve the built web app from the API (default on, `../spms-frontend/dist`) |
| `COOKIE_SAMESITE` / `COOKIE_SECURE` | | `lax` by default; use `none` only when the web app is on another site |
| `ALLOW_STUDENT_SIGNUP` | | `true` lets students self-register (faculty/admin accounts are always admin-created) |
| `DEMO_MODE` | | Shows demo accounts on the sign-in page. **Keep `false` in production** |
| `TEAM_MAX_MEMBERS` | | Team size limit (default 5) |
| `FIRST_ADMIN_NAME` / `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` | | First admin (see below) |
| `STORAGE_DRIVER` | | `cloudinary`, `s3` or `local`. Defaults to whichever is configured, else `local` |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` / `_FOLDER` | cloudinary | From the Cloudinary console |
| `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_ENDPOINT` / `S3_FORCE_PATH_STYLE` | s3 | AWS S3 or R2/B2/MinIO |
| `LOCAL_UPLOAD_DIR` | local | Directory for local uploads (default `uploads`) |
| `SMTP_URL` / `MAIL_FROM` | | Optional email for password-reset links, e.g. `smtps://user:pass@smtp.example.com:465` |
| `AUTH_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_WINDOW_MIN` | | Login/register/reset rate limit (default 20 per 15 min per IP) |

The web app needs one optional variable, `VITE_API_URL` (default `/api`). Set it only when the API is on a different origin and you are not proxying `/api`.

## Database, seed data & the first admin

**MongoDB options**
- `npm run db:local` runs a real MongoDB 7 on `127.0.0.1:27017` with data persisted in `.data/mongo` (development only).
- **MongoDB Atlas** (free M0): create a cluster, add a database user, allow your IP (or `0.0.0.0/0` for cloud hosts), and copy the `mongodb+srv://…` URI into `MONGODB_URI` (add a database name, e.g. `/edutrack`).

Indexes are declared on the models and built automatically. Several rules are enforced by the database itself, not just the code:
- a student can only be on one team (unique multikey index on `Team.members`)
- one project per team (unique `Project.team`)
- unique emails, student IDs, department names and codes
- unique `(project, lineageKey, version)` for file versions

**Seed data:** `npm run seed` loads departments, 1 admin, 4 faculty, 16 students and 7 teams covering every project state, with tasks, versioned files, feedback and activity. It only runs on an empty database; `npm run seed -- --reset` wipes EduTrack's collections first. It refuses to run in production unless `SEED_ALLOW_PRODUCTION=true`.

**First admin (no public admin sign-up exists).** Pick one:
1. **CLI:** run `npm run create-admin -- --email you@college.edu --name "Your Name" --password 'a-long-passphrase-123'` with `MONGODB_URI` pointing at the target database. It does nothing if an admin already exists (`--force` adds another).
2. **Environment bootstrap** (for hosts without a shell, such as Render's free tier): set `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD`. On boot, the server creates that admin **only if the database has no admin at all**. Remove `FIRST_ADMIN_PASSWORD` after the first deploy.

**Password reset.** `POST /auth/forgot-password` always returns the same message, so it can't be used to discover accounts.
- With `SMTP_URL` set, the user is emailed a one-time link (valid 60 min; only a SHA-256 hash of the token is stored).
- Without email, admins can generate a one-time reset link or a temporary password from **Users → ⋯**, and share it through a trusted channel.
- In local development, reset links are also printed in the API log.
- Every reset signs the user out everywhere.

## Commands

Run from the repository root:

| Command | What it does |
|---|---|
| `npm run dev:full` | Local MongoDB + API (watch mode) + web app |
| `npm run dev` | API + web app (bring your own MongoDB) |
| `npm run db:local` | Local MongoDB only |
| `npm run seed` | Demo data (`-- --reset` to wipe first) |
| `npm run create-admin` | First admin from flags or `FIRST_ADMIN_*` |
| `npm run build` | Build shared → API (`spms-backend/dist`) → web app (`spms-frontend/dist`) |
| `npm start` | Run the built API, which also serves the built web app |
| `npm test` | All tests (API + web) |
| `npm run typecheck` | Type-check every workspace |

## Tests

```bash
npm test
```

**API: 55 tests in 7 suites**, run with Jest + Supertest against a **real MongoDB** (mongodb-memory-server), so unique indexes, aggregations and queries are exercised for real.

- **Auth:** registration is student-only (a smuggled `role: "admin"` is ignored), password policy, duplicate emails, identical errors for wrong password and unknown email, deactivated accounts, refresh-cookie rotation and its CSRF header, password change revoking old tokens, sign-out-everywhere, the reset-link flow (single-use), signup toggle, and admin bootstrap.
- **Role permissions:** only admins manage users; no privilege escalation; deactivation and role changes take effect on the very next request; admins can't lock themselves out or remove the last admin; team-progress scoping (admin = all, faculty = theirs, student = refused); audit log is admin-only; malformed ids return 400.
- **Proposal review:** the team is taken from the session, not the request; one project per team; drafts are hidden from faculty; only the **assigned** guide can view, approve or reject; students can't review; rejection requires feedback, then revise and resubmit; approved proposals are locked; final submission requires a deliverable; evaluation only after submission (marks 0–100, evaluator and date recorded); return-for-changes; list scoping; guide reassignment moves access; only admins delete.
- **Task assignment:** no tasks before approval; assignees must be on the project's team; outsiders and faculty can't create tasks; progress and overdue counts update; tasks lock after submission; per-member progress.
- **Files and submission access:** outsiders and unassigned faculty can't list, upload or download; storage keys are never exposed; faculty re-uploads need a comment and create v2 with history; signed downloads work and tampered tokens are rejected; file type and 25 MB size limits; only faculty/admin set review status; after submission students are locked out but faculty can still revise; students can only delete their own uploads.
- **Teams and dashboards:** join codes, duplicate membership blocked in both the API and the database, size limit, add by email, leader-only removal (the removed member's tasks are unassigned), membership frozen after submission, and role dashboards return the right progress.

**Web: 8 tests** (Vitest): progress bar accessibility and clamping, status labels, error messages, date and progress helpers.

The first API test run downloads the MongoDB binary (~66 MB) into `node_modules/.cache`.

## Roles & permissions

| Action | Student (team member) | Faculty (assigned guide) | Admin |
|---|---|---|---|
| Create/join team, add teammates | ✅ (one team) | — | — |
| Propose / edit proposal | ✅ while Draft, Pending or Rejected | — | ✅ edit |
| View project | own team only | assigned projects (not drafts) | all |
| Approve / reject proposal | — | ✅ when Pending Review | — |
| Feedback thread | ✅ reply | ✅ | ✅ |
| Create/assign/update tasks | ✅ teammates only, while Approved/In Progress | read-only | read-only |
| Upload files | ✅ until final submission | ✅ (re-upload needs a comment) | ✅ |
| Final deliverables & submit | ✅ while Approved/In Progress | — | — |
| Set file review status | — | ✅ | ✅ |
| Return submission | — | ✅ | — |
| Evaluate (marks) | — | ✅ after submission | ✅ |
| Reassign guide / delete project | — | — | ✅ |
| Users, departments, audit log | — | — | ✅ |

Project lifecycle: **Draft → Pending Review → Approved / Rejected → In Progress → Submitted → Evaluated**. A rejected proposal is revised and resubmitted. A submission can be returned to In Progress. Progress is the share of tasks marked Done.

## Features

**Everyone**
- Animated landing page, light/dark themes, responsive layouts down to phone width, `prefers-reduced-motion` respected.
- Loading skeletons, empty states, error states with retry, and toasts.
- Account page: change name and password, sign out of all devices.

**Students**
- Team setup: create with a 6-character join code, join by code, add by email, rename, leader removes members, leave team.
- Proposal form (title, description, objectives, tech stack, department, term, guide, deadline); save as draft or send for review.
- Dashboard: progress ring and "X% complete" bar, my open/overdue tasks, files count, days to deadline, upcoming deadlines, per-teammate contribution bars, recent activity.
- Project workspace:
  - **Overview:** lifecycle timeline, evaluation card, review history, details.
  - **Tasks:** Kanban with drag-and-drop and optimistic updates, filters (mine/overdue/search), priority, assignee, due dates, overdue highlighting.
  - **Files:** drag-and-drop upload with progress, version history, previews (PDF, images, text), comments, signed downloads.
  - **Feedback:** chat-style thread with the guide.
  - **Activity:** timeline.
- Final submission checklist.

**Faculty**
- Dashboard: needs-your-attention queue (proposals to review, submissions to mark), every guided team with its progress bar, deadlines, activity.
- Approve or reject with feedback, return a submission, evaluate with marks and notes.
- Files: preview, download, **upload an edited version with a required comment**, mark Accepted or Needs revision.
- Team progress page with search, filters and sorting.

**Admins**
- Overview: users, teams, average progress, overdue tasks, projects-by-status chart, leading teams, at-risk teams, recent activity.
- **All teams by progress:** ranked, searchable, filterable by status and department, paginated.
- Users: search, filters and pagination; create (optionally with a generated temporary password); edit; deactivate/reactivate with confirmation; reset link or temporary password.
- Departments: CRUD with usage counts; deletion is blocked while a department is in use.
- Faculty workload: projects per guide and average team progress.
- Projects: filter by status, department and guide; sort; reassign guide; delete with confirmation.
- Audit log: filterable and paginated, covering account, review, evaluation, file, task and team actions.

## API overview

Base path `/api`. Responses are `{ success, data, message?, pagination? }`; errors are `{ success: false, message, details? }`, where `details.fieldErrors` holds per-field validation messages.

```
GET  /health  ·  GET /meta  ·  GET /departments/public
POST /auth/register | login | refresh* | logout* | forgot-password | reset-password | change-password | logout-all
GET|PATCH /auth/me
GET  /dashboard                                   role-specific summary
GET|POST /departments  ·  PATCH|DELETE /departments/:id                 (admin writes)
GET|POST /users  ·  GET|PATCH /users/:id  ·  POST /users/:id/{deactivate,reactivate,temporary-password,reset-link}   (admin)
GET  /users/faculty  ·  GET /users/faculty-workload (admin)
GET  /teams/mine  ·  POST /teams  ·  POST /teams/join  ·  GET|PATCH /teams/:id
POST /teams/:id/members  ·  DELETE /teams/:id/members/:userId  ·  POST /teams/:id/leave  ·  POST /teams/:id/join-code
GET  /teams/progress                              (faculty: own teams, admin: all; paginated, sortable)
GET|POST /projects                                (role-scoped list with filters/pagination)
GET|PATCH|DELETE /projects/:id
POST /projects/:id/{submit-proposal,review,feedback,submit,return,evaluate}  ·  PATCH /projects/:id/faculty
GET  /projects/:id/{activity,member-progress}
GET|POST /projects/:id/tasks  ·  PATCH|DELETE /projects/:id/tasks/:taskId
GET|POST /projects/:id/files  ·  GET /projects/:id/files/lineage/:key
POST /projects/:id/files/:fileId/comments  ·  PATCH /projects/:id/files/:fileId/review
GET  /projects/:id/files/:fileId/url  ·  DELETE /projects/:id/files/:fileId
GET  /storage/local/:token                        (short-lived signed download, local driver)
GET  /admin/audit-logs                            (admin)
```
`*` requires the `X-Requested-With: XMLHttpRequest` header (CSRF protection for cookie-based endpoints).

## Deployment

Nothing has been deployed by this repository's author. Follow one of the options below with your own accounts.

### Option A: Render (one service, recommended)

1. **MongoDB Atlas:** create a free cluster and a database user. Under Network Access, allow `0.0.0.0/0` (Render has no fixed outbound IPs on the free plan). Copy the connection string and add `/edutrack` before `?`.
2. **Cloudinary:** create a free account and copy the Cloud name, API key and API secret from *Settings → API Keys*. (Render's disk is wiped on every deploy, so local storage won't keep files.)
3. Push this repository to GitHub.
4. In Render: **New → Blueprint**, select the repo. `render.yaml` creates one web service that builds everything and serves the API and web app together.
5. Fill in the secret values Render asks for:
   - `MONGODB_URI`
   - `APP_URL` and `CLIENT_ORIGIN` (both set to your service URL, e.g. `https://edutrack.onrender.com`; you can set them after the first deploy and redeploy)
   - `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD`
   - the three `CLOUDINARY_*` values
   - optionally `SMTP_URL`
   
   The JWT secrets are generated automatically.
6. Deploy, then check `https://<your-service>.onrender.com/api/health`. Sign in with the first-admin credentials, then **delete `FIRST_ADMIN_PASSWORD`** in Render's environment settings.
7. As admin, create departments, then faculty accounts. Students can self-register (or set `ALLOW_STUDENT_SIGNUP=false` and create them yourself).

The free plan sleeps after inactivity, so the first request can take ~30–60 s.

### Option B: Docker (VPS, Railway, Fly.io, or locally)

```bash
cp .env.docker.example .env.docker
```

In `.env.docker`, fill in the two JWT secrets plus `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD`. Then:

```bash
docker compose --env-file .env.docker up --build -d
```

Open `http://localhost:4000` and sign in as the first admin, then clear `FIRST_ADMIN_PASSWORD` in `.env.docker`. Uploads and Mongo data live in named volumes. Behind HTTPS (e.g. Caddy or nginx), remove `COOKIE_SECURE: "false"` from `docker-compose.yml` and set `APP_URL` to the HTTPS URL. On any other container host, build the root `Dockerfile` and provide the same environment variables. (The Dockerfile mirrors a production-only install that was verified locally; Docker itself wasn't available in the environment this was built in.)

### Option C: Split (web on Vercel, API on Render)

1. Deploy the API as in Option A but set `SERVE_CLIENT=false`.
2. Edit [`spms-frontend/vercel.json`](spms-frontend/vercel.json): replace `YOUR-API-HOST.onrender.com` with your API host. Vercel then **proxies `/api`**, so the browser sees one origin and the refresh cookie stays first-party.
3. In Vercel, import the repo with these settings:
   - Root Directory `spms-frontend`
   - Install command `cd .. && npm ci --include=dev`
   - Build command `cd .. && npm run build:shared && npm run build -w @edutrack/frontend`
   - Output directory `dist`
   - Leave `VITE_API_URL` unset (it defaults to `/api`)
4. Set the API's `APP_URL` and `CLIENT_ORIGIN` to the Vercel URL.

If you instead call the API directly from another domain (`VITE_API_URL=https://api…`), also set `COOKIE_SAMESITE=none`. Be aware that some browsers block such third-party cookies, which signs users out on every reload; the proxy setup avoids this.

### Optional: S3 instead of Cloudinary

Create a private bucket (Block Public Access **on**) and an IAM user limited to `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject` on `arn:aws:s3:::<bucket>/*`. Set `STORAGE_DRIVER=s3` and the `S3_*` variables. For Cloudflare R2, Backblaze B2 or MinIO, also set `S3_ENDPOINT` (and `S3_FORCE_PATH_STYLE=true` for MinIO). To preview text files in the browser, add a bucket CORS rule allowing `GET` from your app's origin; downloads work without it.

## External services & secrets

| Service | Needed for | Status in this repo |
|---|---|---|
| MongoDB (Atlas or self-hosted) | everything | **Required.** `npm run db:local` covers development |
| Cloudinary **or** S3 | file storage on hosts without a persistent disk | Integrated; **needs your credentials** (untested here without them). Local disk works out of the box |
| SMTP provider | emailed password-reset links | Optional; without it, admins issue reset links or temporary passwords |
| Render / Docker host / Vercel | hosting | Configs included (`render.yaml`, `Dockerfile`, `docker-compose.yml`, `vercel.json`) |

Secrets live only in environment variables on the server. Nothing in `spms-frontend` sees storage keys, SMTP credentials or JWT secrets. `.env` files are git-ignored; only `.env.example` templates are committed.

## Security notes

- Passwords: bcrypt (12 rounds) with a policy of 8+ characters including letters and numbers. Login timing is equalized, and errors are identical for unknown emails and wrong passwords.
- Tokens: access tokens live 15 minutes in memory only. Refresh tokens are httpOnly cookies scoped to `/api/auth`, rotate on use, and need a custom header (CSRF protection). Password changes, resets, role changes, deactivation and "sign out everywhere" bump a token version that revokes every outstanding token.
- Authorization: role checks on routes plus per-project membership checks in one access service (`services/access.ts`). The user's role is read from the database on every request.
- Input: every body and query is validated with Zod (shared with the web app). Search input is regex-escaped. Malformed ids are rejected, and request bodies are capped.
- Uploads: extension allow-list plus MIME match, 25 MB limit, one file per request, private storage, 5-minute signed links. Inline previews are allowed only for PDF, images and plain text, and locally served files get a sandboxing CSP.
- Headers: helmet with a strict Content-Security-Policy (no inline scripts), HSTS, `frame-ancestors 'none'`, CORS limited to `CLIENT_ORIGIN`, rate limits on credential endpoints and the whole API.
- Audit trail: admin actions, reviews, evaluations (including mark changes), submissions, uploads, team and task changes are recorded with actor, role, time and IP.

## Troubleshooting

- **`EADDRINUSE :5000`, or the API "responds" with AirTunes:** macOS AirPlay uses port 5000. EduTrack defaults to 4000; keep it.
- **`Invalid environment configuration` on start:** the log lists the failing variable. In production, JWT secrets must be 32+ random characters and different from each other.
- **`STORAGE_DRIVER=cloudinary but … are not all set`:** add the three Cloudinary values or change `STORAGE_DRIVER`.
- **Signed out on every page reload:** the refresh cookie isn't reaching the API. Use the single-service deploy or the Vercel `/api` proxy. Over plain `http://` (not localhost), set `COOKIE_SECURE=false`.
- **CORS errors:** only possible in a split deploy without the proxy. `CLIENT_ORIGIN` must exactly match the web app's origin (scheme, host, no trailing slash).
- **`npm run seed` says the database already has users:** run `npm run seed -- --reset`, which wipes EduTrack data.
- **First test run is slow or fails offline:** mongodb-memory-server downloads MongoDB on first use. Run once with internet access; it is cached afterwards.
- **Render deploy fails on `tsc: not found`:** keep `npm ci --include=dev` in the build command, because `NODE_ENV=production` would otherwise skip build tools.
- **Uploaded files disappear after a redeploy:** you're on local storage on an ephemeral disk. Switch to Cloudinary or S3.

The previous version of this project (before this rewrite) is archived in `.backup/original-2026-10-31.tar.gz` (git-ignored).
