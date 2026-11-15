# bounds.dev - Hugo Blog Project

## Project Overview

- Hugo static site with the active bounds-ascii theme: three site themes picked in the header (light, dark, arcade; saved in `localStorage["bounds-crt"]`, otherwise light/dark follow the system); GitHub Pages uses Hugo Extended 0.154.5
- Personal blog with AI-generated and manual content
- Built-in photo posting tool (FastAPI/Uvicorn app)
- Deployed to GitHub Pages

## Architecture & Key Files

### Hugo Structure

- `config.toml` - Site configuration
- `content/posts/` - Blog posts (directories with index.md)
- `themes/bounds-ascii/` - Active theme. Light and dark are `css/main.css` plus the main JS bundle (`theme.js`, `analytics.js`, `site.js`, `games.js`).
  Arcade is an add-on that loads only for the arcade theme: `css/arcade.css` (every rule scoped under `:root[data-theme="arcade"]`; `main.css` is disabled while it applies) and `js/arcade.js` (`fx.js` + `arcade-skin.js`, built in `partials/arcade-assets.html`). `theme-init.js` (inline) writes both before first paint for a saved arcade choice; `arcade-skin.js` adds the arcade-only pieces (HUD, pause button, hero, bezels, high scores, chase lane, coin slot, GAME OVER 404) to production's markup and removes them on a switch away. Never put arcade markup, sprites or the Jersey 25 font into light/dark templates
- `scripts/sprites.mjs` - Sprite shapes; writes the committed `themes/bounds-ascii/assets/sprites.svg` and `sprites.json` (`make sprites`). `/arcade/` shows sprites with `partial "sprite.html"`; the arcade theme builds them in JS (`window.boundsArcade.sprite`)
- `content/arcade/_index.md` + `themes/bounds-ascii/layouts/arcade/list.html` - `/arcade/` (Bounds Invaders), in every theme: its cabinet is always dark (`css/arcade-cabinet.css`, scoped to `#cabinet`), the page around it follows the theme. A section page, not a post: `outputs: ["html"]`, so no feed and no listing; it embeds the newest 30 posts per channel as a JSON island
- `themes/bounds-ascii/assets/js/games/` - One file per game (`invaders.js` on `/arcade/`, `squash.js` on the arcade theme's 404 only). **Lazy-loading rule:** a game is never bundled and never in a `<script src>`; its fingerprinted URL is in `data-game-src`, and `js/games.js` (main bundle: the loader and high scores) fetches it when the start button is pressed. Games are opt-in, keyboard and touch operable, silent by default, and pause on blur, hidden tab and scroll-away
- `themes/LoveIt/` - Vendored theme (NEVER modify directly)
- `layouts/` - Root overrides that take precedence over theme templates
- `static/` - Static assets
- `public/` - Generated site (gitignored)

### Development Tools

- `Makefile` - Common tasks
  - `make serve` - Draft-enabled Hugo dev server on :1313, bound to 0.0.0.0, writing to ignored `.preview/` (makes missing GIF-hero WebPs first)
  - `make preview` - Draft-enabled tailnet/LAN preview on :1314 under `/bounds-preview/`, writing to ignored `.preview/`
  - `make post SLUG=…` - Scaffold a writing post from `archetypes/writing/`
  - `make test` - Production build plus the small Python/Node contract suite (setup: `scripts/tests/README.md`)
  - `make check` - Private hosts, GIF-hero WebPs, a fresh sprite sheet, and a production build with post checks
  - `make webp` - Make or refresh animated WebPs for GIF heroes (libwebp)
  - `make sprites` - Regenerate the sprite sheet after editing `scripts/sprites.mjs` (Node), then commit both outputs
  - `make photo-poster` - FastAPI/Uvicorn app on :8000; first kills processes on that port and installs Python requirements
- `tools/photo-poster/` - FastAPI app for creating photo posts with EXIF

## Development Workflow

### Starting Development

```bash
make serve           # Hugo development server
make photo-poster    # Photo posting tool
```

### Hugo Commands

```bash
hugo --cleanDestinationDir    # Build site
hugo server -D --destination .preview  # Dev server with drafts; keep public/ for production
python3 scripts/compare-site-builds.py BASELINE_DIR NEW_BUILD_DIR  # Check every generated file
```

### New post checklist

Every post is a bundle: `content/posts/<slug>/index.md` plus its images. Every build runs post checks (`themes/bounds-ascii/layouts/partials/post-checks.html`) and prints a `[post-check]` line for each finding. **Missing content only warns, even in production and deploys**: a missing description, hero alt text, or social card. Fix these before asking for review; they never block a deploy. **Only broken references fail a production build** (`hugo`, `make check`, the Pages deploy): a `resources` or `images` entry naming a file that isn't in the bundle, or a GIF/WebP/SVG file used as the social card. `hugo server` and drafts only warn about those too, so drafting is never blocked. The 292 generated limericks (category `generated`) are exempt.

#### Writing posts

1. **Scaffold:** `make post SLUG=my-post-slug` creates `content/posts/my-post-slug/index.md` from `archetypes/writing/index.md`, with every field explained. Keep `draft: true` until it's ready.
2. **Front matter:**

   | Field | Required? | Notes |
   | --- | --- | --- |
   | `title` | yes | |
   | `date` | yes | With a timezone offset, e.g. `2026-10-17T09:00:00-07:00` |
   | `description` | **yes** (warns if missing) | One or two plain sentences, about 160 characters at most. Used for search results, social previews and `~/writing` |
   | `tags` | yes (warning) | Lowercase; reuse existing tags (`/tags/`) |
   | `categories` | yes | `["dev"]` usually. Anything but `photos`/`generated` puts the post in `~/writing` |
   | `summary` | optional | One-line RSS teaser. Without it, Hugo uses the opening text (or everything before `<!--more-->`, so don't put `<!--more-->` first) |
   | `resources` → `featured-image` | optional | The hero shown on the post, home and archive: `- name: featured-image` / `src: hero.png` |
   | `featuredImageAlt` | **yes if there's a hero** (warns if missing) | What the image shows, for screen readers |
   | `featuredImageCaption` | optional | Shown under the hero on the post page |
   | `featuredImageStill` | optional, GIF heroes only | A PNG/JPEG frame for reduced motion. Without it, the GIF's first frame is used |
   | `featuredImageMobile` | optional | A separate hero composition for screens up to 600px wide (art direction), e.g. a portrait GIF whose labels stay readable on a phone. A GIF gets its own WebP like the main hero |
   | `featuredImageMobileStill` | optional, with a GIF `featuredImageMobile` | The phone hero's reduced-motion frame. Without it, the phone GIF's first frame is used |
   | `images` | see step 4 | Social card. The first entry is used for Open Graph, Twitter/X and structured data |

   Don't add `lightgallery` or `featuredImagePreviewCrop`: those are LoveIt-only, ignored, and warned about.
3. **Hero image** (optional): JPEG, PNG, SVG or GIF in the bundle, named in `resources`. Hugo makes responsive WebP sizes of JPEG/PNG heroes, so keep a sensible original (about 2,000 px wide is plenty).
   - **GIF heroes:** `make serve` and `make preview` create `<hero>.webp` next to the GIF automatically when libwebp is installed (`brew install webp`); `make webp` does it on demand. **Commit the `.webp` and `scripts/gif-heroes.lock`** with the GIF. The site serves the WebP (typically 25–65% of the GIF), with the GIF as fallback. If you forget, the Pages deploy makes it and flags it, and `make check` fails until it's committed.
4. **Social card:**
   - Hero is GIF or SVG → add a dedicated card: a 1200×627 PNG/JPEG in the bundle, listed as `images: ["social-card.png"]`. Without one, previews fall back to the site card and the build warns. A GIF, WebP or SVG file listed as the card fails the build, because those don't unfurl reliably.
   - Hero is JPEG/PNG and no `images` → the build frames the whole hero into a 1200×627 card automatically (never cropped), so routine posts need nothing.
   - No hero and no `images` → the site card (`static/social-default.png`).
   - Make a dedicated card for posts meant for Hacker News, LinkedIn or another launch, for major or evergreen technical articles, and whenever the hero is a poor preview. Card rules: PNG or JPEG, exactly 1200×627 (warned otherwise), under 5 MB (warned), legible at feed size, exact spelling and punctuation in any rendered text. Keep it separate from the hero when their ideal aspect ratios differ.
5. **Large diagrams** (optional): `{{< zoom-figure src="summary.svg" full="detail.svg" fullMobile="detail-mobile.svg" alt="…" fullAlt="…" label="…" caption="…" >}}` shows a compact image at the prose width that opens the detailed one in a viewer (fitted to the screen, with an actual-size toggle; a plain link without JavaScript). Bundle files only.
6. **Verify locally** (step-by-step below), then ask Jesse to review on the preview.

#### Photo posts

1. Create them with the photo tool (`make photo-poster`). It writes the bundle: `featured-image.jpeg`, `featured-image-preview.jpeg`, any gallery images, the caption, an EXIF table and a map. The caption goes in front matter as `description` and in the body before `<!--more-->`.
2. Check the front matter it wrote: `title`, a caption-based `description` (required), `tags` (warned if empty; e.g. `sf`, `street`, `nature`, `travel`) and `categories: ["photos"]`. No `images` is needed: the photo is framed into the social card automatically. `featuredImageAlt` is optional for photo posts, since the caption serves as alt text.
3. If you edit a photo post by hand: keep the caption as the first paragraph followed by `<!--more-->` (the lightbox and contact sheet use it), and keep the `resources` names matching real files (a missing file fails a production build).
4. Verify locally as below.

#### Verify locally before asking Jesse

1. `make check`: private-host scan, GIF-hero WebPs, and a production build with the post checks. It must end with "All checks passed".
2. `make preview`: open the tailnet link on a phone and on desktop. Check the post in light, dark and arcade, the hero (animated normally; a static poster or first frame under reduced motion, even without JavaScript, with no playback controls), the home page (the newest post shows once, with its hero), and `~/writing` or `~/photos`.
3. Run `make test PYTHON_BIN=/path/to/test-venv/bin/python` for contract coverage (setup and coverage: `scripts/tests/README.md`). It builds production output and checks all published posts; no browser/server is needed. Do not restore fixed post/count assertions, screenshot matrices, DOM layout snapshots or dev-analytics event/path classification checks.
4. Social preview: the built page's `og:image` should be the card you expect; check it in the page source of the `make preview` build.

## Code Patterns & Conventions

### Theme Customization

- Light and dark must keep looking and behaving like production; change them in `main.css` and the templates. Arcade changes go in `arcade.css` / `arcade-skin.js` and must not touch the light/dark rendering path.
- Arcade: Jersey 25 for titles, headings, nav, buttons and scores, **18 px and up only** (arcade theme and the `/arcade/` cabinet only). Colors are the Arcade Night tokens at the top of `arcade.css` (all pairs checked for WCAG AA); do not add new color pairs without checking contrast.
- Arcade motion runs only with `<html data-motion="on">`; `still` (reduced motion, more contrast, forced colors, or the header's pause button, saved in `bounds-motion`) stops everything, and every resting state is final. No ambient motion or tilt inside `.post-content`.

**CRITICAL:** Never modify files in `themes/LoveIt/`
- Override in `layouts/` instead
- Hugo merges overrides automatically
- Preserves ability to update theme

### Testing

- Use `make test` for API and built-output contracts; see `scripts/tests/README.md` for dependencies and coverage.
- Keep tests focused on public contracts and derive post membership/order from published content, without fixed titles or counts.
- Use visual-debug for frontend issues and manual preview review for layout/theme changes.
- Run `make check` and always build before committing: `hugo --cleanDestinationDir`

### Photo Posts

- Generated via photo-poster tool
- Include EXIF data, GPS coordinates
- Active templates display post images inline; older lightgallery frontmatter is inactive
- Maps rendered below EXIF table

## AI Assistant Guidelines

### When Working on Content

1. Follow existing post structure in content/posts/
2. Use proper Hugo frontmatter
3. Run the contract suite (`make test`; see `scripts/tests/README.md`)
4. Verify build succeeds

### When Modifying Theme/Layout

1. Create overrides in layouts/, never modify themes/LoveIt/
2. Test responsive design
3. Check with visual-debug skill
4. Verify dark mode compatibility

### When Working on Tools

- photo-poster is a Python FastAPI/Uvicorn app
- Uses virtual environment (.venv/)
- Install deps from requirements.txt

### Common Pitfalls

- DON'T modify themes/LoveIt/ - use layouts/ overrides
- Hugo caches aggressively - use --cleanDestinationDir if issues
- The local Hugo version can differ from Pages 0.154.5 and currently warns about languageCode deprecation
- Port 1313 must be free for server
- photo-poster kills port 8000 before starting (see Makefile)
- Previews for other devices: use `make preview` (port 1314, `/bounds-preview/`, ignored `.preview/` output). Keep all dev/preview output out of `public/` so production builds and tests stay isolated. It prints a tailnet HTTPS link and a LAN link, and removes the tailnet path when stopped. If a phone can't open the tailnet link, check iCloud Private Relay first.
- Never commit tailnet hostnames or IPs; `make check-private-hosts` runs in the Pages workflow and fails the deploy.

## Available Skills

- **smoke-test** - Build Hugo site, start server, test key pages with Playwright MCP
- **visual-debug** - Debug frontend issues with browser automation
- **figma-implementer** - Convert Figma designs to code (agent, not skill)

## Project Context

- Personal blog: mix of manual posts and AI-generated content
- Some posts are limericks from NYT headlines
- Photo posts feature GPS maps and EXIF data
- Content license: CC BY-NC 4.0
