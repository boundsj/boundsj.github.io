# Art for "Building with Grok Bot in the Outer Loop"

Sources for every image in `content/posts/building-with-grok-bot/`. Edit a script, run `./build.sh`, then
review on `make preview` (or any draft-enabled `hugo server`).

| Script | Makes (in the post bundle) |
| --- | --- |
| `hero.py` | Desktop hero: `grok-bot-hero.gif` (1200×600, 140 frames at 80 ms, loops) and `grok-bot-hero-poster.png` |
| `hero_phone.py` | Phone hero (≤ 600px wide): `grok-bot-hero-phone.gif` (600×750 design at 1.5×) and `grok-bot-hero-phone-poster.png` |
| `fleet.py` | `router-before.svg` / `ceo-after.svg` and their `-mobile` versions |
| `botons.py` | `botons-setup.svg` and `-mobile`: what I can set up per Boton (brain/model, role and instructions, tools, workflow), grounded in the Botons docs |
| `summary.py` | `summary-before.svg`, `summary-after.svg`, `summary-botons.svg`: compact inline versions (600px canvas, labels >= 21px) that open the full diagrams through the `zoom-figure` shortcode |
| `chart.py` + `gateway-usage.json` | Gateway usage chart: `usage-summary.svg` inline, `usage-detail.svg` and `-mobile` in the viewer (PNG copies in `out/`). Every number comes from the JSON snapshot (Nov 12, 2026) and is checked by assertions; colours validated with the dataviz palette checker |
| `social.py` | `social-card.png` (1200×627, via `render.py`) |
| `lib.py` | Shared palette, Iosevka measuring/subsetting, and drawing primitives |
| `render.py` | Rasterizes SVGs through Chrome, the way the post shows them |
| `shots.py` | Screenshots of the draft on a running preview (phone, tablet, desktop; Night and Day) |

`gif-heroes.py` then makes the `.webp` for both GIFs and updates `scripts/gif-heroes.lock`. Commit them with the GIFs.

Every figure is first person: the human is labelled ME. Both heroes share one timeline: router (pings pile up on me), handoff (a Grok Bot powers on and the tangle
becomes gateway wiring), CEO (the bot handles the threads; one critical decision comes back to me), and a
power-off that lands back on frame 0. The figures embed a subset of the site's Iosevka, so they render
the same everywhere as `<img>`.

## Setup

Needs Python 3.11+, Google Chrome, `ffmpeg`, ImageMagick (`magick`), and libwebp (`brew install webp`).

```sh
uv venv /tmp/bgb-art && uv pip install --python /tmp/bgb-art/bin/python -r requirements.txt
PYTHON=/tmp/bgb-art/bin/python ./build.sh            # or: ./build.sh figures | ./build.sh hero
```

Playwright drives the installed Chrome (`channel="chrome"`), so `playwright install` isn't needed.
Intermediate frames and renders go to `out/`, which git ignores.
