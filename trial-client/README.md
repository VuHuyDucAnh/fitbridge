# FitBridge — client

Train smart. Move well. FitBridge is a browser-based fitness app that counts
your reps and checks your form in real time with on-device pose tracking, then
turns each session into progress you can see and share.

## Features

- **AI Coach** — pick a movement, train on camera, and get live rep counting +
  form cues via MediaPipe Pose (runs entirely on-device). Each session ends with
  a full report: calories, reps, sets, form score, what to fix, and your next
  session. Optional **Beast Mode** shows short, clean motivational callouts.
- **Dashboard** — weekly volume, calories, streak and form-score trends, plus a
  weekly weight check-in.
- **Ranking** — a full-body muscle heat map driven by your training volume; tap
  a muscle for suggested exercises. Leaderboard, tiers, and share-to-story.
- **Profile** — GitHub-style training-activity graph, achievements, and body
  metrics that stay **private by default** (you choose what to show/share).
- **Onboarding** — a guided setup (metrics, level, goal, gender, privacy).

## Design system

- Central design tokens in `src/index.css` (light + dark). No raw hex in
  components — change the palette in one file.
- Light / Dark / System themes with no first-paint flash, `prefers-color-scheme`
  live updates, and synced `<meta name="theme-color">`.
- Full **Vietnamese / English** i18n (`src/i18n`), Vietnamese as first-class with
  diacritic-safe type (Be Vietnam Pro + Plus Jakarta Sans).
- Liquid-glass surfaces on floating chrome, Cluely-inspired hover-glow controls,
  reduced-motion support, and AA-minded contrast (accent fills use
  `--accent-strong` for body-size white text).

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # production build
npm run preview  # preview the build
npm run lint     # oxlint
```

State persists to `localStorage`; the camera stream never leaves the device.
