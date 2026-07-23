# FitBridge — rebuild progress

## Milestone 1 — Backend & Supabase (DONE, this commit)

**Goal:** make auth + data actually work, and make sure a runtime error can never
show a blank white page again.

### What was built
- **Real Supabase project wired** (`fit bridge`, `wurkhgxhrqqhdzjzmawy`).
  - `src/lib/supabase.js` — client with public URL + publishable key baked in as a
    fallback (overridable via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
- **Database schema** (`supabase/migrations/`):
  - `profiles`, `workouts`, `weight_logs` tables.
  - Row Level Security on all three (own-row read/write; public profiles readable
    for future leaderboard).
  - Trigger auto-creates a profile row on signup.
  - Security advisors: **0 warnings** (search_path pinned, trigger fns locked from RPC).
- **Auth rewritten** (`src/state/AppState.jsx`) — real `signUp` / `signIn` /
  `signOut` / session restore, replacing the old fake localStorage auth. Same public
  API + state shape, so no consumer components broke.
- **Data persistence** — profile, workouts and weight logs now read/write Supabase.
  Onboarding seeds a demo training history into the account so the dashboard is alive.
- **No more blank page:**
  - `src/components/ui/ErrorBoundary.jsx` wraps the whole app — any render error now
    shows a recoverable screen with a Reload button.
  - Auth pages show real loading + mapped error banners (verified in a browser: a
    failed sign-in shows an inline error, it does **not** white-screen).
  - `PageShell` waits for the session to resolve before redirecting.
- **Deploy:** root `vercel.json` builds `trial-client` and adds the SPA rewrite, so
  the repo deploys correctly even when Vercel's root is the repo root.

### Verified
- `npm run build` ✅  · `npm run lint` ✅ (only pre-existing warnings)
- Browser drive-through of home → login → submit: renders at every step, graceful
  error on unreachable backend (sandbox blocks outbound to Supabase).

### Not verifiable in this sandbox
- A *successful* login round-trip (sandbox blocks outbound HTTPS to supabase.co).
  This will work on Vercel / locally where the network is open.

### One dashboard toggle you may want
- Supabase → Authentication → Providers → Email → **turn off "Confirm email"** for a
  frictionless demo (otherwise new signups must click an email link first — the app
  already handles both cases: it shows a "check your inbox" screen when confirmation
  is on).

---

## Milestone 2 — Visual rebuild (BLOCKED on design approval)

Per the brief's §1 hard gate, the visual layer (real logo, Strava-style dark UI,
exact muscle map, design tokens) does **not** start until the design plan is approved.
Design plan posted in chat — waiting on "approved".

Screens, in intended order once approved:
1. Design tokens + Button system + logo asset
2. Landing / Home
3. Auth (login/register/onboarding)
4. Dashboard (Strava feed)
5. AI Coach
6. Ranking + **muscle heat map** (match reference image exactly)
7. Profile
