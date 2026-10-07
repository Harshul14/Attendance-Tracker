# Candidate Attendance Tracker

Tap a candidate's name to mark attendance. Import an Excel file, get a fast touch-friendly attendance board,
and share the live session with other devices. Static site on GitHub Pages + Firebase (Auth + Firestore). No custom backend.

## Features

- Upload `.xlsx` / `.xls`; the file is parsed **in the browser** (SheetJS). Only candidate names are saved.
- Import preview (file, LR03 / LR06 counts) before the session is created.
- One tap cycles **Unmarked → Present (green ✓) → Absent (red ✕) → Unmarked**. Status is always shown as icon + text, never colour alone.
- Live counters (total / present / absent / unmarked / attendance rate), per-section counts, completion bar.
- Search (case- and whitespace-insensitive) combined with All / Present / Absent / Unmarked filters; All / LR03 / LR06 tabs.
- Undo, "mark all visible", reset (with confirmation), export to Excel (`attendance-YYYY-MM-DD.xlsx`, with Summary sheet).
- **Cloud sync**: Firestore real-time listeners, offline queue (IndexedDB cache), status badge: Live / Syncing… / Offline.
- Session sharing via link (`?session=ID&key=SECRET`), recent sessions list, dark mode, responsive layout.

## Excel format

Group headers `LR03` and `LR06` (also `LR 03`, `lr-06`…) can be anywhere on a sheet. Names are read from a
`Name` sub-header column under the group header, or directly below the header if there is no sub-header.

| LR 03 (merged) |            | LR 06 (merged) |            |
|----------------|------------|----------------|------------|
| S No.          | Name       | S No.          | Name       |
| 1              | John Doe   | 1              | Amit Kumar |
| 2              | Jane Doe   | 2              | Priya Sharma |

A simple layout also works:

| LR03 | LR06 |
|------|------|
| John Doe | Amit Kumar |

Blank cells are ignored, names are trimmed, and repeated names are **kept** as separate candidates (a warning is shown).

## Data model (Firestore)

```
sessions/{sessionId}                  name, date, createdAt, createdBy, createdByName, accessKey, groups, counts
sessions/{sessionId}/members/{uid}    key (copy of accessKey), name, joinedAt
sessions/{sessionId}/candidates/{id}  name, group, serial, seq, attendance, updatedAt, updatedBy
```

Each candidate is its own document, so devices update different people without overwriting each other.
Every change writes `attendance`, `updatedAt` (server time) and `updatedBy` (uid). If two people change the same
candidate at once, the last successful write wins and all devices converge to it.

## Security model

Rules are in [`firestore.rules`](firestore.rules). Nothing is publicly readable or writable.

1. You must be signed in (Google or anonymous guest).
2. Only **members** of a session can read it or change attendance.
3. You can only add *yourself* as a member, and only by presenting the session's secret `accessKey`
   (24 random characters ≈ 140 bits, carried in the share link). Guessing a session ID is useless.
4. Candidates are created once by the session owner; afterwards only `attendance`, `updatedAt`, `updatedBy` may change,
   `updatedBy` must be your own uid, and `updatedAt` must be the server time.

Anyone holding the full share link can join – treat it like a password and share it only with your team.

## Privacy

- Excel files are processed locally and never uploaded. Only candidate names + attendance go to **your** Firebase project.
- No analytics, no third-party tracking. The browser stores a small recent-sessions list in `localStorage`
  (session ID, key, name) and Firestore's offline cache in IndexedDB.

## Firebase setup

1. [Firebase console](https://console.firebase.google.com) → **Add project**.
2. **Build → Authentication → Get started** → enable **Google** and **Anonymous** (guest) providers.
3. **Authentication → Settings → Authorized domains** → add `YOUR-USERNAME.github.io` (and `localhost` is there by default).
4. **Build → Firestore Database → Create database** (production mode, choose a region).
5. **Firestore → Rules** → paste the contents of `firestore.rules` → **Publish**
   (or `firebase deploy --only firestore:rules` with the Firebase CLI).
6. **Project settings → General → Your apps → Web app (`</>`)** → copy the config values.
7. Copy `.env.example` to `.env` and fill in the six `VITE_FIREBASE_*` values.

Only the *client* config is used. Never put a service-account / admin key in this project.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # output in dist/
npm run preview
```

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project to the `main` branch.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → New repository secret** – add all six:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
4. Push to `main` (or run the workflow manually). `.github/workflows/deploy.yml` installs, builds and deploys.
5. Open `https://YOUR-USERNAME.github.io/REPOSITORY/`.

The build uses a relative base path, so no repository name needs to be configured.

## Notes

- Offline: attendance stays visible and editable; changes queue in IndexedDB and sync on reconnect. A **first-time** join needs internet.
- Firestore free tier is ample for this use (each device load reads the session's candidate documents once, then only changes).
- `xlsx` is installed from npm (0.18.5). SheetJS publishes newer builds from their own CDN
  (see https://docs.sheetjs.com/docs/getting-started/installation/nodejs) if you prefer to use those.
