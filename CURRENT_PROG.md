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

### Round 3 — crash root-caused + user requests (done + pushed)
- **Crash fixed for real.** The production "l is not a function" was ScrollToTop's
  `useEffect(() => window.scrollTo(0,0), ...)` returning scrollTo's result to React
  as a cleanup — fatal on browsers where scrollTo returns a value. Reproduced by
  stubbing scrollTo, fixed with braces, verified old-crashes/new-survives.
  Production sourcemaps enabled.
- **Username-only auth** (no email anywhere), animated **multi-exercise stickman**
  (squat / push-up / bicep curl with dumbbells, real rep counter, drag-to-orbit),
  **real-video demo slot** (`public/media/demo-pushups.mp4`, frame fits the video),
  hero stats row removed (no fake-looking numbers), TalkBridge-style logo pill +
  bigger nav logo, Features/How-it-works nav links, warmer non-glare light mode,
  natural Vietnamese copy, **avatar upload** (Supabase storage bucket + RLS,
  camera button on profile + edit modal).

### Round 4 — bug fixes + fake-data purge (done + pushed)
- Stickman animates on ALL machines (reduced-motion now only stops auto-rotation
  — this was why Windows/Alienware saw it frozen). Chips can no longer stretch.
- Demo-video section always visible (elegant placeholder until the file exists).
- Real /terms page (EN/VI); register links go there — loophole closed.
- Forgot-password removed; @fitbridge.app shown as a fixed suffix on username
  fields; professional placeholders.
- Fake data fully purged: leaderboard = real public profiles from the DB only
  (score/streak persisted, migration 0004); mockData.js deleted; achievements
  computed from real workouts incl. per-exercise clean-form badges.
- Profile right-column overflow fixed for scaled laptop displays.

---

## ROUND 6 — full roadmap build (items 1–7 + logout) — DONE + pushed

All seven roadmap items plus a logout feature were built on this branch:

1. **Coach** — honest empty-session report (0 reps → "no reps detected", no
   fabricated score, no save); live GOOD-FORM / FIX badge while exercising;
   **sequence builder** (queue exercises with rep/hold targets, auto-advance +
   auto-save through the queue, "Exercise N of M" + up-next).
2. **Run tracking** — real Geolocation runs (distance/time/pace/calories),
   start/pause/resume/finish, per-km/mi splits, Strava-style animated orange
   route trail (pure SVG, no external tiles). `runs` table (migration 0005),
   run history, /run route + nav + dashboard action.
3. **Social** — `posts`/`follows`/`kudos` tables (migration 0006, RLS by
   visibility). /feed page: composer sharing a text update or your latest
   workout/run with real stats, public/followers scope, kudos, delete own
   posts. Follow/Following toggle on the leaderboard.
4. **Nutrition** — `meals` table + owner-scoped `meal-photos` bucket
   (migration 0007) + `kcal_target`. /nutrition page: per-day
   breakfast/lunch/dinner/snack log, calorie ring + macro bars vs real
   Mifflin-St Jeor targets, 7-day calorie chart, photo capture → calorie
   estimate via the `analyze-meal` edge function (free OpenRouter vision, key
   server-side) with graceful manual-entry fallback, Notification-API reminder.
   > The edge function is in the repo but NOT deployed to your project — deploy
   > it and set `OPENROUTER_API_KEY` to turn on AI photo estimates. Until then
   > manual entry works.
5. **Body map v2** — one continuous anatomical silhouette (mirrored half-body
   point list → smooth Catmull-Rom outline) with every muscle clipped inside
   it, front + back, orange heat gradient.
6. **UI/UX** — Cluely glow ring already on every Button; added a magnified
   liquid-glass **bottom dock** nav for mobile (active tab lifts/scales).
7. **Compare slider** — landing before/after draggable divider (mouse/touch/
   keyboard), locale-aware speech bubbles, orange/glass. Drop photos at
   `public/media/compare-before.jpg` + `compare-after.jpg`.
8. **Logout** — desktop avatar dropdown (Profile + Sign out) + mobile drawer.
   Also: achievement toasts on unlock; contribution graph + streaks re-keyed
   to the user's LOCAL calendar day.

### Still needs you
- Deploy `supabase/functions/analyze-meal` + set `OPENROUTER_API_KEY` for AI
  meal photos (optional; manual entry works without it).
- Drop in the two compare-slider photos.
- Deploy the branch to Vercel to confirm the live sign-in round-trip (sandbox
  blocks outbound to Supabase, so that's the one thing untestable here).

---

## ROADMAP — big features queued for next sessions (user-approved direction)

Work top-to-bottom; each item ends with commit + push + this file updated.
Everything must be REAL data through Supabase — no fabricated numbers anywhere.

### 1. Coach session — make it actually work (highest priority)
   - **Real-time form check WHILE exercising**: overlay a live "GOOD FORM / FIX:
     <cue>" badge from `usePoseDetection` joint angles per rep; green when within
     the exercise's flex/extend thresholds, amber with a specific cue when off.
   - **Honest scoring bug**: current session scored ~9.6 with ZERO reps — score
     must be 0 / "no reps detected" when reps===0. Gate the summary on real reps.
   - **End-of-session AI summary that pitches like a real PT**: per-rep form
     breakdown (depth, tempo, symmetry) from the recorded angle series; strengths
     + specific fixes + next-session suggestion. Try a FREE LLM (OpenRouter free
     tier / Groq) via a Supabase Edge Function (key server-side) with a local
     rule-based fallback so it always works.
   - **Exercise history**: every finished session already writes to `workouts`;
     add a per-exercise history view + the session report persisted & re-openable.
   - **"How it's done" stick-figure simulation**: reuse PoseProof to demo the
     movement with the target joint angle visualized on the figure (arc + degrees)
     so users understand camera position / depth.
   - **Sequence builder**: queue exercises (push-up ×12 → squat ×15 → plank 40s);
     session auto-advances through the queue instead of manual single-select.
   - **Start flow**: dark stage + big start button (done) — keep, wire to record.

### 2. Strava-style run tracking (real GPS, DB-backed)
   - Geolocation API: track duration, pace, distance (km/mi per user pref),
     splits, elevation if available. New `runs` table + `run_points` (lat/lng/ts).
   - Route map (Leaflet + OSM tiles, free) with the path drawn in accent orange;
     animated "draw-on" of the trail like Strava. Data analysis (pace chart).

### 3. Social layer (Strava clone, DB works)
   - `posts` (user, workout/run ref, caption, visibility) + `kudos` + `follows`.
   - Feed page = real posts from followed users; "share progress" from profile.
   - RLS mirrors profiles.metrics_public.

### 4. Nutrition + scheduling (the coach persona)
   - `meals` (photo, detected items, kcal + macros, meal slot, date). Photo →
     computer-vision calorie estimate via a FREE vision model (OpenRouter free
     vision / Gemini free tier) behind a Supabase Edge Function (key server-side).
   - Daily 3-meal log, calendar view, Notification API reminders ("hôm nay ăn gì /
     tập gì"), progress charts. Meal + workout plan adapts to goal.

### 5. Body map v2 (looks like one real person)
   - Replace the disjointed regions with ONE continuous anatomical silhouette
     (single body outline; muscles are clipped regions inside it) front + back,
     matching the reference image the user shared (smooth muscular figure, orange
     heat gradient). Likely author as a detailed SVG with `<clipPath>` per muscle.

### 6. MASSIVE UI/UX upgrade — Vox papercut × iOS Liquid Glass, luxury/delicate
   - Apply the collage / Vox paper-cut treatment + orange-red accents + liquid
     glass consistently to EVERY surface (not just the landing "how it works").
   - **Liquid glass everywhere on the nav layer**: refine `.glass`, add a
     magnified dock-style bottom nav on mobile (inspiration: the pasted
     magnified-dock + LiquidGlassCard code — adapt, don't copy).
   - **Cluely-style button hover ring on ALL buttons**: thin elegant glowing
     accent circumference on hover + focus (extend the tokenized `.glow`/Button
     ::after ring to every control; audit page-local buttons).
   - **Route transitions**: glass morph / cross-fade between pages.
   - Must run fully on ALL browsers/machines (Alienware/Chrome, non-mac), no
     mac-only APIs; test at 100% and 125% Windows scaling.

### 7. Cluely-style interactive compare slider (landing "features")
   - Two business-meeting photos (user will supply): left = guy insecure about
     body ("why can't I get jacked?" bubble), right = same guy using FitBridge
     with a POSITIVE bubble. Draggable divider (ew-resize), reveal on drag.
   - Bubble text follows the chosen locale (EN chose → English positive line, VI
     chose → Vietnamese). KEEP the existing Sarah/Minh conversation; ADD this as
     another feature depiction. Use OUR design system (orange/glass), not blue.

### 8. Smaller queued items
   - **Achievement toasts**: fun little congrats notification the moment an
     achievement unlocks (compare prev vs new computeAchievements on data change).
   - **Contribution graph coloring**: the GitHub-style squares must light accent
     on trained days (currently stays dark even with a logged session) — verify
     dateKey timezone alignment.
   - **Profile right column**: Body-metrics + Achievements are cramped/overflow on
     some laptop widths — re-lay-out (already partly fixed; do a proper 2-col →
     stacked responsive audit).
   - Full native-Vietnamese pass over all ~600 i18n strings (ongoing).

### DONE so far (rounds 1–5, all on `claude/fitbridge-rebuild`)
Backend+auth (username/pwd, @fitbridge.app), crash fix (scrollTo), real data /
no mocks, real leaderboard + achievements, avatar upload, muscle map v1, papercut
"how it works", interactive multi-exercise 3D figure (push-up default now,
improved squat/curl), warm light mode, real /terms page, forgot-pwd removed,
register back button, favicon = logo mark, demo video wired (demo-pushup.mp4),
TRACKING chip artifact fixed, camera-stage white-flash fixed.

### Blocked on you (needed to fully verify + finish)
1. **Deploy the current branch to Vercel and confirm sign-in works** — this is the
   one thing I can't test here (sandbox blocks outbound to Supabase).
2. **Add the logo file** at `trial-client/public/brand/fitbridge-mark.png`.
3. **Supabase → Auth → Email → turn off "Confirm email"** for a frictionless demo.
