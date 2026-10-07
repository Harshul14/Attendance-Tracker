# Candidate Attendance Tracker

Tap a candidate's name to mark attendance. Import an Excel file, mark people on a fast touch-friendly board,
and share the live session with other devices. A static site on GitHub Pages. **No accounts, no Firebase, no backend of your own, nothing to configure.**

## Features

- Upload `.xlsx` / `.xls`; parsed **in the browser** (SheetJS). Import preview before the session starts.
- One tap cycles **Unmarked → Present (green ✓) → Absent (red ✕) → Unmarked**. Status is shown as icon + text, not colour alone.
- Live counters (total / present / absent / unmarked / rate), per-section counts, completion bar.
- Search + All / Present / Absent / Unmarked filters; All / LR03 / LR06 tabs; undo; mark all visible; reset with confirmation.
- Export to Excel (`attendance-YYYY-MM-DD.xlsx`) with a Summary sheet.
- **Shared sessions** with auto-refresh every ~3 s, an offline queue, and a Live / Syncing… / Offline badge.

## Excel format

`LR03` and `LR06` headers (also `LR 03`, `lr-06`…) may be anywhere on a sheet. Names are read from a `Name` sub-header
column under the header, or directly below the header when there is none. Merged headers such as `LR 03 | (S No. | Name)` work.
Blank cells are ignored; repeated names are kept as separate candidates (a warning is shown).

## How sharing and storage work

- Creating a session stores the candidate list (and later the attendance) as **one encrypted blob** on the free
  [restful-api.dev](https://restful-api.dev) service (no account needed). Nothing else is stored anywhere else.
- Data is encrypted in your browser (AES-256-GCM). The key is in the share link after the `#`
  (`…/?session=ID#k=KEY`). Browsers never send the `#` part to any server, so the storage service only ever sees
  unreadable ciphertext.
- Each device keeps a local copy (localStorage), so a session opens instantly and keeps working offline.
- Every candidate is a "latest change wins" record (`[status, time, who]`). Devices poll the blob, merge, and re-send
  any change that was overwritten by another device's simultaneous write, so no change is lost and all devices converge.
- **The share link is the password.** Anyone with the full link can view and edit; anyone without it can read nothing.
  Share it only with your team.

### Limits to be aware of

- Updates appear within a few seconds (polling), not instantly.
- Timestamps come from device clocks; keep device clocks roughly correct (the default on phones/laptops).
- restful-api.dev is a free third-party service with no uptime guarantee and may delete old data (assume about 3 days).
  **Export to Excel at the end of each session** as your permanent record. Anyone who learns the blob ID (not the key) could
  delete or overwrite it, but cannot read it.
- The first join from a new device needs internet.
- If the sharing service is unreachable, the app offers **"Use this device only"** so attendance can still be taken (no sharing, still exportable).

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # output in dist/
```

## Deploy to GitHub Pages

1. Push this project to the `main` branch of a GitHub repository (public repo for a free account).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` builds and deploys on every push. No secrets are needed.
4. Open `https://YOUR-USERNAME.github.io/REPOSITORY/`.

## Privacy

Excel files never leave your browser. Only the encrypted session blob is sent to restful-api.dev. No analytics, no tracking.
