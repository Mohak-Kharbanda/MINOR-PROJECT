# SPMS — Student Project Management System (Frontend)

Frontend for the Batch B13 minor project, built to match the tech stack in the
project synopsis: **React.js (Vite)**, **HTML5**, and **Modern CSS (Tailwind)**.

This is a fully working prototype UI for all three roles (Student, Faculty,
Admin). Since the Node.js/Express/MongoDB backend described in the synopsis
hasn't been built yet, this app uses a small mock data layer
(`src/lib/seed.js` + `src/context/DataContext.jsx`) backed by the browser's
`localStorage`, so every screen is clickable and the data persists across
reloads. Swapping this for real `fetch`/`axios` calls to your Express API
later is a drop-in replacement — see **"Connecting to the real backend"**
below.

## Getting started in VS Code

1. Unzip this folder and open it in VS Code (`File → Open Folder…`).
2. Open a terminal in VS Code (`` Ctrl+` ``) and install dependencies:

   ```bash
   npm install
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open the printed URL (usually `http://localhost:5173`) in your browser.

You'll need **Node.js 18+** installed. Check with `node -v`.

## Demo logins

Use the role tabs on the login page. Click **"Fill demo &lt;role&gt; credentials"**
to auto-fill, or use these directly:

| Role    | Email               | Password     |
|---------|---------------------|--------------|
| Student | khushal@nie.ac.in   | student123   |
| Faculty | poornima@nie.ac.in  | faculty123   |
| Admin   | admin@nie.ac.in     | admin123     |

New students can also self-register from the login page ("Create an account").

## What's included

- **Student**: dashboard of your projects, create-project flow (pick a
  guide + team members), project detail page with a 3-column task board,
  file "upload" (submission log), team & feedback view.
- **Faculty**: pending-approval queue (approve/reject with feedback),
  active-project tracking, mark completed projects and assign marks.
- **Admin**: manage users (students/faculty/admin) and departments,
  read-only view of every project and its status.
- Role-based routing/guards, matching the synopsis's **JWT + RBAC**
  requirement (mocked here — see below).

## Project structure

```
src/
  context/
    AuthContext.jsx     # login / register / logout (mock JWT)
    DataContext.jsx      # projects, tasks, files, users, departments
  components/            # Navbar, Layout, Modal, Badge, StatCard, ProtectedRoute
  pages/
    Login.jsx, Register.jsx
    student/              # StudentDashboard, ProjectDetail, CreateProjectModal
    faculty/              # FacultyDashboard
    admin/                # AdminDashboard
  lib/seed.js             # demo data + localStorage helpers
```

## Connecting to the real backend

Once the Express API is live, replace the bodies of the functions in
`AuthContext.jsx` and `DataContext.jsx` with calls to your REST endpoints,
e.g.:

```js
// AuthContext.jsx
async function login(email, password, role) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });
  if (!res.ok) return { ok: false, error: (await res.json()).message };
  const { token, user } = await res.json();
  localStorage.setItem("token", token); // attach as Bearer token on future requests
  setCurrentUser(user);
  return { ok: true, user };
}
```

The component tree, routing and UI won't need to change — only the data
layer. You can also point Vite's dev server at your API during development
by adding a proxy in `vite.config.js`:

```js
server: {
  proxy: { "/api": "http://localhost:5000" }
}
```

## Tech notes

- **Styling**: Tailwind CSS utility classes; shared button/input/card
  styles live in `src/index.css`.
- **Routing**: `react-router-dom` v6.
- **State**: React Context + `useState`, persisted to `localStorage` so
  refreshing the page doesn't lose demo data. Clear it with
  `localStorage.clear()` in the browser console to reset to the seed data.
