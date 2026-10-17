# Browser checks

Headless Playwright checks for the bounds-ascii theme and the analytics layer. They are developer tools, not part of the Hugo build, and they live in their own folder so the Pages workflow's root-level `npm ci` step never sees them.

```sh
cd scripts/browser-checks
npm install && npx playwright install chromium   # once
```

Start a dev server from the repo root first: `hugo server -D --port 1313`. Then run, from this folder:

| Command | What it checks |
| --- | --- |
| `node ui-check.mjs http://127.0.0.1:1313` | Lightbox (modal, focus, Tab wrap, Esc, return focus, prev/next, fits a 390×844 phone), GIF pause/still under reduced motion, autoplay video paused under reduced motion, lazy Mapbox (loads once, survives a theme change before loading, shows a fallback when blocked) |
| `node analytics-dev-check.mjs http://127.0.0.1:1313` | Every event in `docs/analytics.md` fires with the documented parameters in dev mode; no `@`, `?` or `#` in any parameter. The native-video case needs a Chrome with H.264 (`channel: "chrome"`, or set `CHROME_CODECS`). |
| `node analytics-prod-check.mjs <production build dir>` | Build first with `hugo --minify --destination /tmp/bounds-prod`. Serves it as `https://www.bounds.dev` inside the browser, loads the real `gtag.js`, and **records and aborts** every collect request, so nothing is sent. Asserts sanitized payloads, the fixed 404 location, origin-only referrers after a 404, and that the same build on another host requests nothing from Google. |
| `node page-matrix.mjs http://127.0.0.1:1313 /tmp/shots` | Screenshots at 390 and 1280 in all four themes, plus overflow, small targets, text contrast, request weight and console errors per view (`report.json`). Add `--reduced` for reduced motion and `--full` for full-page captures. |

Set `CHROME=/path/to/chrome` to use a different Chromium build.
