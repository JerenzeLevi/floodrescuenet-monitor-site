<div align="center">

<img src="assets/app-icon.png" alt="FloodRescueNet Monitor" width="104" height="104" />

# FloodRescueNet Monitor — Website

**Detect. Deploy. Rescue.**

Marketing and legal site for the **FloodRescueNet Monitor** Android app — the
companion to an ESP32-based automated flood-response system built as an
undergraduate thesis at Saint Columban College.

![status](https://img.shields.io/badge/status-live-brightgreen)
![license](https://img.shields.io/badge/license-Proprietary%20·%20All%20Rights%20Reserved-red)
![build](https://img.shields.io/badge/built%20with-HTML%20·%20CSS%20·%20JS-38bdf8)
![host](https://img.shields.io/badge/deploy-Vercel-black)
![build step](https://img.shields.io/badge/build%20step-none-informational)

</div>

---

## Purpose

Google Play requires every published app to link a public **privacy policy** and a
support site. This repository is that site: a single-page landing experience plus
standalone **Privacy Policy** and **Terms & Conditions** pages, hosted for free and
linked from the Play Store listing.

It is a plain static site — no framework, no build step, no backend, no database,
no tracking. The 3D prototype page runs a local demonstration in the browser.

## Pages

| Path | Purpose |
|------|---------|
| `/` &nbsp;(`index.html`) | Landing — hero, overview, features, how-it-works, developer profiles, support |
| `/simulator/` | Interactive tabletop 3D demonstration; local state only, no hardware or app connection |
| `/privacy.html` | Full Privacy Policy (effective 9 September 2026) — the URL given to Google Play Console |
| `/terms.html` | Terms & Conditions |
| `/api` | 🦍 Honeypot — see [Security](#security) |

## Design & tech

- **Type:** static HTML / CSS / vanilla JS
- **Fonts:** Sora + Space Grotesk (Google Fonts)
- **Motion:** [GSAP](https://gsap.com) + ScrollTrigger, **self-hosted** in `js/vendor/` (no third-party CDN)
- **Theme:** dark, gradient accents (teal → cyan → blue), rain/water `<canvas>` ambience
- **Intro:** full-screen water **splash preloader** (`assets/splash.mp4`) with the
  app icon; lifts after `DOMContentLoaded` + 2.6 s, respects `prefers-reduced-motion`,
  and has CSS + JS failsafes so it can never trap the page
- **Responsive:** verified at 1280×800 and 390×844

Open `index.html?keepsplash` to freeze the splash for screenshots.

## Structure

```
.
├── index.html              # landing page
├── privacy.html            # Privacy Policy  (Play Store link)
├── terms.html              # Terms & Conditions
├── api/
│   └── index.html          # honeypot decoy page
├── assets/
│   ├── app-icon.png        # official app icon → logo + favicon
│   ├── splash.mp4          # preloader video
│   ├── nope.png            # honeypot image
│   └── jerenze|aenon|sarah.png
├── css/
│   └── style.css           # shared by all pages
├── js/
│   ├── main.js             # motion system, canvas, reveals
│   ├── preloader.js        # splash logic (kept external for CSP)
│   └── vendor/             # self-hosted GSAP + ScrollTrigger
├── vercel.json             # security headers + honeypot rewrites
├── PROGRESS.md             # Gantt chart + session log
├── LICENSE                 # proprietary — All Rights Reserved
└── README.md
```

## Security

The site is static with no server-side forms, auth, cookies, or storage. The prototype
page has local simulation controls; they do not transmit readings or commands.
`vercel.json` sets:

- a strict **Content-Security-Policy** (`script-src 'self'`, `frame-ancestors 'none'`, …)
- **HSTS** (2-year, preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- `Referrer-Policy`, `Permissions-Policy` (camera / mic / geolocation / etc. all denied), COOP / CORP

GSAP is self-hosted, so there are **no third-party scripts**.

### Honeypot

`GET /api` — and `/admin`, `/wp-admin`, `/wp-login.php`, `/.env`, `/config.json`,
`/phpinfo.php` — all rewrite to `api/index.html`, a static page that returns a blunt
"401 Unauthorized · there is no API here." There is nothing behind these paths;
they exist only to answer scanners.

## Local development

No tooling required. Serve the folder with any static server:

```bash
python -m http.server 8747
# → http://localhost:8747
```

Edit the HTML / CSS / JS directly. Bump the `?v=` query on `style.css` /
`main.js` / `preloader.js` when you change them, to bust caches.

## Deployment

Hosted on **Vercel** (free Hobby plan), project **`floodrescuenet-monitor-site`**.

1. Import this repository at <https://vercel.com/new>.
2. Framework preset: **Other**. Build command: **none**. Output directory: repo root.
3. `vercel.json` is applied automatically (headers + rewrites).
4. Rename the project domain to something clean, then give Google Play Console:
   `https://<project>.vercel.app/privacy.html`

Updating the site = push to `main`; Vercel redeploys automatically.

## Project tracker

[`PROGRESS.md`](PROGRESS.md) holds a live **Gantt chart** and a per-session log of
what was done. Update it every working session.

## Team — Soul Grievers

| Role | Name |
|------|------|
| Project Manager | **Jerenze Levi T. Omandam** |
| System Programmer | Aenon John S. Abay |
| Quality Assurance | Sarah G. Giamat |

College of Computing Studies · Saint Columban College · Pagadian City, Philippines
Support: **omandamjerenze@gmail.com**

## License

**Proprietary — All Rights Reserved.** See [`LICENSE`](LICENSE).

This code and design are published for review only. You may **not** copy, fork,
reuse, modify, redeploy, or redistribute any part of this repository — code,
content, assets, or design — without prior written permission from the copyright
holders. Contact **omandamjerenze@gmail.com**.

© 2026 Jerenze Levi T. Omandam and the Soul Grievers research team.

## Tabletop simulator integration

- Open `/simulator/` from the main navigation, hero or footer. `/simulator` also resolves to the same page.
- Assets are served from `/simulator/` on the same origin using bundled scripts, without an iframe, external scripts or changes to security policy.
- The homepage and simulator share the Monitor logo, fonts, colors, and desktop/mobile navigation. The prototype link is marked as the current page; the other links lead back to the corresponding homepage section.
- Uses Three.js r128; its notice and MIT license are in `simulator/THIRD_PARTY_NOTICES.md`.
- Drag to orbit, use + / − to zoom, inspect components, and raise the simulated water to exercise automatic deployment. Manual mode waits for a button command.
- The simulator intentionally stays deployed after water falls. Reset represents manual inspection and repacking. This differs from the proposed automatic retract behavior described elsewhere on the marketing site.
- Android/Firebase integration remains future work: this repository does not contain the mobile app, its authentication configuration or its database contract.
- Run `node tests/simulator.test.cjs` for route, asset, CSP and state checks. A live browser/Vercel check is still required after publication.
