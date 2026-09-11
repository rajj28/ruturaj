# Ruturaj Sonkamble — portfolio

A scroll-driven portfolio: an apple ripens and falls, a statue catches it and
opens his laptop onto a desktop of case studies, bites it, and the sparkles
fall through the sky into the ground a plant grows from.

React 19 + Vite, one Lenis-driven animation loop, three scrubbed videos, a
WebGL dithered sky, and a plant drawn procedurally on canvas.

## Scripts

```bash
npm ci            # install exactly what package-lock.json pins
npm run dev       # local dev server on http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve dist/ locally to check the build
npm run lint      # oxlint
```

## Deploying on Vercel

The repo is ready as-is — `vercel.json` sets the framework, build command and
output directory.

1. Import the project in Vercel (or run `vercel --prod` from this folder).
2. Leave the build settings on their defaults.
3. Optional: for a custom domain, add an environment variable
   `VITE_SITE_URL=https://your-domain.com` so the social cards and canonical
   link use it. Without it, the Vercel production domain is used
   automatically.

What `vercel.json` adds:

- **Caching** — everything in `/assets/` is content-hashed by Vite, so it is
  served with a one-year `immutable` cache (the videos included); the icon,
  social card and manifest get a day with stale-while-revalidate.
- **Security headers** — `nosniff`, `SAMEORIGIN` framing, a strict referrer
  policy, a locked-down permissions policy and HSTS.

`.vercelignore` keeps the source renders and scratch files in the project
root from being uploaded on CLI deploys.

## Where things live

| What | Where |
| --- | --- |
| Scroll choreography (every section) | `src/App.jsx` — the one `useEffect` loop |
| Section lengths | `src/App.css` — `.reel`, `.desk`, `.eat`, `.sky`, `.footer` heights |
| Beat budgets | `src/App.jsx` — `LEAD`…`AWAY`, `SPARK`, `CLOUD`, `FALL`, `GROW` |
| Case studies + diagrams | `src/App.jsx` — `PROJECTS` |
| About, experience, selected work | `src/App.jsx` — `ABOUT`, `EXPERIENCE`, `SELECTED_WORK` |
| The plant | `src/components/plant.js` |
| The sky | `src/components/DitherSky.jsx` |
| Meta, social cards, fonts | `index.html` |

## Media

The three scrubbed clips in `src/assets/` are H.264, CRF 24, a keyframe every
6 frames and no B-frames — small enough to preload, and cheap to seek in both
directions, which is what keeps the scrub smooth. The full-quality originals
are kept in `media-originals/` (not deployed). To re-encode a replacement:

```bash
ffmpeg -i source.mp4 -an -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p \
  -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 -movflags +faststart out.mp4
```
