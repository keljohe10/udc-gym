# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # dev server (Turbopack) on http://localhost:3000
npm run build   # production build
npm start       # serve the production build
npm run lint    # next lint — no ESLint config is committed, so this prompts to create one
```

There is no test setup in this repo.

## Environment

Firebase is configured entirely from `NEXT_PUBLIC_FIREBASE_*` env vars read in `src/firebase/config.ts` (`API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`, `MEASUREMENT_ID`). Without a `.env.local` the app builds but every Firestore call fails at runtime.

## Architecture

Gym attendance and equipment tracker for Universidad de Cartagena, built on the Next.js **Pages Router** (`src/pages`) with MUI v7 components. The UI language is Spanish — keep new labels, messages and data values in Spanish.

There is **no server-side code**: no API routes, no `getServerSideProps`, no Firebase Admin usage despite `firebase-admin` being a dependency. Every page is a client component that talks to Firestore directly through the shared `db` singleton in `src/firebase/config.ts`.

### Two user flows, both authenticated via `localStorage`

1. **Gym member (public)** — `register.tsx` → `index.tsx` → `success.tsx`. Identity is just `localStorage["id"]` (the national ID document number). `index.tsx` redirects to `/register?attendance=true` when that key is missing; `register.tsx` reads the `attendance` query param to decide whether to land on `/` or `/success` after signup. The register stepper also short-circuits: if the entered `id` already exists in Firestore, it stores the id and jumps straight to `/`.
2. **Admin** — `login.tsx` → `history.tsx`, `gym-equipment.tsx`, `gym-equipment-list.tsx`. `login.tsx` looks up the `admin` collection by `usuario` and compares the password with `bcryptjs` **client-side**, then sets `localStorage["adminAuth"] = "true"`. Each admin page re-checks that key in a `useEffect` and redirects to `/login`. `Header.tsx` shows the admin nav based on the same key. This is presentation-level gating only — Firestore security rules are the real access control, and admin password hashes reach the browser by design of this scheme.

### Firestore collections

- `users` — one doc per member; `userType` is `estudiante | docente | administrativo`. Students carry `studentCode` + `program`; docentes/administrativos carry `department`. Uniqueness of `id` and `studentCode` is enforced by pre-write queries in `register.tsx`, not by document ids.
- `history` — attendance rows, denormalized copies of the user fields plus `branch` and `createdAt` (`serverTimestamp`). `index.tsx` blocks a second same-day check-in per branch with a day-range query.
- `gymEquipment` — equipment inspection records, all fields in Spanish (`fechaRevision` as a `YYYY-MM-DD` string, `instructor`, `sede`, `elemento`, `estado`, `descripcion`, `acciones`, `observaciones`).
- `admin` — `usuario` + bcrypt `password`.

Compound queries on `history` (equality filters + `createdAt` range + `orderBy`) require matching composite indexes in the Firebase console.

### Shared pieces

- `src/data/branch.ts` — default export `branches` (the three campus names) plus named `EQUIPMENT_LIST`; both drive dropdowns across pages. `src/data/program.ts` is the academic program list.
- `src/hooks/usePaginatedFirestore.ts` — **not** cursor-based: it fetches the entire filtered collection into memory and slices client-side. Fine for a month of attendance, but don't reach for it on unbounded data. Its effect re-runs on `JSON.stringify(filters)`, so pass `filters` as a stable value.
- Excel export in `history.tsx` and `gym-equipment-list.tsx` uses `xlsx` (`json_to_sheet` → `writeFile`) directly in the browser. Note `history.tsx` exports only the current page's rows while `gym-equipment-list.tsx` exports all filtered rows.
- `_app.tsx` renders `CssBaseline` + `Header` globally. There is no MUI ThemeProvider — styling is per-component `sx`. Tailwind is installed via PostCSS but no stylesheet imports it; it is effectively unused.
- Import alias `@/*` → `./src/*` is configured in `tsconfig.json`, though existing files use relative imports.
