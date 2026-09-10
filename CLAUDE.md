# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # dev server (Turbopack) on http://localhost:3000
npm run build   # production build
npm start       # serve the production build
npm run lint    # next lint — no ESLint config is committed, so this prompts to create one
```

There is no test setup in this repo. `npx tsc --noEmit` is the fastest correctness check.

## Environment

Client (public, already in use): `NEXT_PUBLIC_FIREBASE_*` — read in `src/firebase/config.ts`.

Server (required by every API route): `FIREBASE_SERVICE_ACCOUNT_B64` and `ADMIN_TOKEN_SECRET`. See `DESPLIEGUE.md` for how to generate them and for the mandatory deploy order (code before Firestore rules).

Without `.env.local` the app builds and the geofence still evaluates — `cargarSedes` falls back to the static sede list — but every Firestore read/write fails at runtime.

## Architecture

Gym attendance and equipment tracker for Universidad de Cartagena, on the Next.js **Pages Router** with MUI v7. UI language is Spanish — keep new labels, messages and data values in Spanish.

Mixed client/server: pages talk to Firestore directly with the client SDK for **reads**, while attendance writes and all admin mutations go through API routes using `firebase-admin`. That split is the whole security model — Firestore rules (`firestore.rules`) deny client writes to `history`, `sedes` and `config`, and the Admin SDK bypasses rules by design.

### Sedes are the core data model

`src/data/sedes.ts` holds the six locations (3 Cartagena campuses + 3 centros tutoriales) with coordinates and per-sede geofence radius. **`Sede.nombre` is frozen**: it is persisted literally into `history.branch` and `gymEquipment.sede`, and those fields are compared by exact equality (daily dedupe, equipment filter). `"Piedra de Bolivar"` has no accent on purpose — changing it orphans every historical record. New records also write `sedeId`; code that filters must tolerate old docs, e.g. `r.sedeId ? r.sedeId === s.id : r.branch === s.nombre`.

The static file is the source of truth for identity; Firestore `sedes/{id}` holds only operational overrides (lat, lng, radius, active) editable from `/sedes`. If that read fails, the static values win — the geofence never becomes unusable because of a config problem.

**Cartagena campuses are 77–461 m apart.** San Pablo↔Zaragocilla is 77 m, which no GPS can separate; that is why radii are 250 m there and 2000 m at the centros tutoriales, and why `/` asks the user to confirm when several perimeters overlap (recorded as `registroAmbiguo`).

### Two user flows

1. **Gym member (public)** — `register.tsx` → `index.tsx` → `success.tsx`. Identity is `localStorage["id"]` (the national ID). `index.tsx` acquires GPS via `useGeolocalizacion`, resolves candidate sedes with `src/lib/geo.ts`, then POSTs to `/api/asistencia`, which **recomputes the geofence server-side** and reads the user's own record rather than trusting the client's copy.
2. **Admin** — `login.tsx` POSTs to `/api/admin/login`; bcrypt runs on the server and the session is an HMAC token in an httpOnly cookie (`src/lib/adminToken.ts`). `localStorage["adminAuth"]` survives only as a non-authoritative UI hint; `useAdminSession` reconciles it against `/api/admin/session` so an expired cookie doesn't leave admin menus visible with silent 401s. Every mutating route starts with `requireAdmin`.

### Timezone

`src/lib/fechas.ts` anchors every day/month window to Colombia (fixed UTC-5, no DST). API routes run in UTC on Vercel, so `dayjs().startOf("day")` there would split a Colombian day in two and let a user register twice. Never compute attendance windows without this helper.

### Firestore collections

- `users` — one doc per member; `userType` is `estudiante | docente | administrativo`. Uniqueness of `id`/`studentCode` is enforced by pre-write queries, not document ids (so it races).
- `history` — attendance, denormalized, plus geo audit fields: `sedeId`, `lat`, `lng`, `precisionMetros`, `distanciaMetros`, `sedesCandidatas`, `registroAmbiguo`, `geoVerificado`, `origenValidacion`.
- `gymEquipment` — inspection records, Spanish field names, `fechaRevision` as a `YYYY-MM-DD` string.
- `sedes`, `config/geofence` — geofence overrides, written only by `/api/admin/sedes`.
- `admin` — `usuario` + bcrypt hash; closed to clients by the rules.

### Shared pieces

- `src/lib/geo.ts` — pure Haversine + candidate resolution, imported by both the browser and the API routes. GPS accuracy is added to the radius, capped by `toleranciaParaRadio`, with a hard reject above 500 m.
- `src/lib/firebaseAdmin.ts` — **server only**; importing it from a page breaks the build. Exposes a lazy `obtenerDbAdmin()` so `next build` survives missing credentials.
- `src/hooks/usePaginatedFirestore.ts` — loads the whole filtered range into memory and slices client-side; exposes `allData`. Filter and export from `allData` rather than adding Firestore queries — it costs no reads and needs no composite index.
- `src/components/BarrasCategoria.tsx` — single-series bars for `/bienestar`; every bar is directly labeled so identity never depends on color alone.
- Import alias `@/*` → `./src/*` exists but the codebase uses relative imports.
