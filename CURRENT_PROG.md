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

## Milestone 2 — Visual rebuild (IN PROGRESS)

Design plan approved. Working dark-first, Strava-style, pushing per screen.

### Done + pushed
- **Foundation** — retuned tokens to a dark-first, logo-derived palette (near-black
  Strava surfaces + vivid ember orange, AA-safe accent split). Archivo display +
  Be Vietnam Pro body. Logo now loads `/brand/fitbridge-mark.png` with an SVG
  fallback; fixed the wordmark being invisible on dark panels.
- **Muscle heat map** — rebuilt as front + back anatomical figures, muscles glow
  orange by trained volume, all 12 groups selectable. Matches the reference's
  structure/feel (hand-built SVG; a drop-in exact asset can replace it like the logo).
- **Home** — hero rebuilt around the pose-skeleton camera-proof signature
  (TRACKING / reps / live-form / joint-angle chips). Kills the banned centered hero.

### Round 2 — expressive layer (done + pushed)
- **Real data, not fake** — removed the seeded year of demo workouts; app now shows
  only real logged sessions (empty states cover new accounts).
- **Interactive 3D** — the hero pose-skeleton is now a real orbitable 3D figure
  (drag to spin, inertia, idle auto-rotate, pauses off-screen / reduced-motion).
  Pure SVG + math, no WebGL, so it stays crisp and un-AI-looking.
- **Papercut / Vox band** — "how it works" rebuilt as a warm pasted-paper editorial
  insert with layered cut-paper step cards; added `--paper-*` + radius tokens.

> Higgsfield + Motion connectors both have **0 credits**, so no AI media was
> generated (would require a paid top-up). Everything above is hand-built, which
> also better serves the "don't look too AI" goal.

### Remaining screens (next)
- App shell: Strava-style **bottom tab bar** (mobile).
- Dashboard → **activity feed** with workout cards (distance/pace/time, kudos,
  muscle-map thumbnails).
- Auth pages / onboarding polish · AI Coach · Profile · Ranking layout.

### Blocked on you (needed to fully verify + finish)
1. **Deploy the current branch to Vercel and confirm sign-in works** — this is the
   one thing I can't test here (sandbox blocks outbound to Supabase).
2. **Add the logo file** at `trial-client/public/brand/fitbridge-mark.png`.
3. **Supabase → Auth → Email → turn off "Confirm email"** for a frictionless demo.
