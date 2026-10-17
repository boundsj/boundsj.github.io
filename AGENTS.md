# bounds.dev - Hugo Blog Project

## Project Overview

- Hugo static site with the active bounds-ascii theme; GitHub Pages uses Hugo Extended 0.154.5
- Personal blog with AI-generated and manual content
- Built-in photo posting tool (FastAPI/Uvicorn app)
- Deployed to GitHub Pages

## Architecture & Key Files

### Hugo Structure

- `config.toml` - Site configuration
- `content/posts/` - Blog posts (directories with index.md)
- `themes/bounds-ascii/` - Active theme
- `themes/LoveIt/` - Vendored theme (NEVER modify directly)
- `layouts/` - Root overrides that take precedence over theme templates
- `static/` - Static assets
- `public/` - Generated site (gitignored)

### Development Tools

- `Makefile` - Common tasks
  - `make serve` - Draft-enabled Hugo dev server on :1313, bound to 0.0.0.0 (makes missing GIF-hero WebPs first)
  - `make post SLUG=…` - Scaffold a writing post from `archetypes/writing/`
  - `make check` - Private hosts, GIF-hero WebPs, and a production build with post checks
  - `make webp` - Make or refresh animated WebPs for GIF heroes (libwebp)
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
hugo server -D                # Dev server with drafts
python3 scripts/compare-site-builds.py BASELINE_DIR NEW_BUILD_DIR  # Check every generated file
```

### New post checklist

Every post is a bundle: `content/posts/<slug>/index.md` plus its images. Production builds (`hugo`, `make check`, the Pages deploy) run build-time post checks (`themes/bounds-ascii/layouts/partials/post-checks.html`). An **error fails the build**; a warning doesn't. `hugo server` and drafts only warn, so drafting is never blocked. The 292 generated limericks (category `generated`) are exempt.

#### Writing posts

1. **Scaffold:** `make post SLUG=my-post-slug` creates `content/posts/my-post-slug/index.md` from `archetypes/writing/index.md`, with every field explained. Keep `draft: true` until it's ready.
2. **Front matter:**

   | Field | Required? | Notes |
   | --- | --- | --- |
   | `title` | yes | |
   | `date` | yes | With a timezone offset, e.g. `2026-10-17T09:00:00-07:00` |
   | `description` | **yes (error)** | One or two plain sentences, about 160 characters at most. Used for search results, social previews and `~/writing` |
   | `tags` | yes (warning) | Lowercase; reuse existing tags (`/tags/`) |
   | `categories` | yes | `["dev"]` usually. Anything but `photos`/`generated` puts the post in `~/writing` |
   | `summary` | optional | One-line RSS teaser. Without it, Hugo uses the opening text (or everything before `<!--more-->`, so don't put `<!--more-->` first) |
   | `resources` → `featured-image` | optional | The hero shown on the post, home and archive: `- name: featured-image` / `src: hero.png` |
   | `featuredImageAlt` | **yes if there's a hero (error)** | What the image shows, for screen readers |
   | `featuredImageCaption` | optional | Shown under the hero on the post page |
   | `featuredImageStill` | optional, GIF heroes only | A PNG/JPEG frame for reduced motion. Without it, the GIF's first frame is used |
   | `images` | see step 4 | Social card. The first entry is used for Open Graph, Twitter/X and structured data |

   Don't add `lightgallery` or `featuredImagePreviewCrop`: those are LoveIt-only, ignored, and warned about.
3. **Hero image** (optional): JPEG, PNG, SVG or GIF in the bundle, named in `resources`. Hugo makes responsive WebP sizes of JPEG/PNG heroes, so keep a sensible original (about 2,000 px wide is plenty).
   - **GIF heroes:** `make serve` and `make preview` create `<hero>.webp` next to the GIF automatically when libwebp is installed (`brew install webp`); `make webp` does it on demand. **Commit the `.webp` and `scripts/gif-heroes.lock`** with the GIF. The site serves the WebP (typically 25–65% of the GIF), with the GIF as fallback. If you forget, the Pages deploy makes it and flags it, and `make check` fails until it's committed.
4. **Social card:**
   - Hero is GIF or SVG → a dedicated card is **required** (error): a 1200×627 PNG/JPEG in the bundle, listed as `images: ["social-card.png"]`. GIF, WebP and SVG cards are errors (they don't unfurl reliably).
   - Hero is JPEG/PNG and no `images` → the build frames the whole hero into a 1200×627 card automatically (never cropped), so routine posts need nothing.
   - No hero and no `images` → the site card (`static/social-default.png`).
   - Make a dedicated card for posts meant for Hacker News, LinkedIn or another launch, for major or evergreen technical articles, and whenever the hero is a poor preview. Card rules: PNG or JPEG, exactly 1200×627 (warned otherwise), under 5 MB (warned), legible at feed size, exact spelling and punctuation in any rendered text. Keep it separate from the hero when their ideal aspect ratios differ.
5. **Verify locally** (step-by-step below), then ask Jesse to review on the preview.

#### Photo posts

1. Create them with the photo tool (`make photo-poster`). It writes the bundle: `featured-image.jpeg`, `featured-image-preview.jpeg`, any gallery images, the caption, an EXIF table and a map. The caption goes in front matter as `description` and in the body before `<!--more-->`.
2. Check the front matter it wrote: `title`, a caption-based `description` (required), `tags` (warned if empty; e.g. `sf`, `street`, `nature`, `travel`) and `categories: ["photos"]`. No `images` is needed: the photo is framed into the social card automatically. `featuredImageAlt` is optional for photo posts, since the caption serves as alt text.
3. If you edit a photo post by hand: keep the caption as the first paragraph followed by `<!--more-->` (the lightbox and contact sheet use it), and keep the `resources` names matching real files (a missing file is a build error).
4. Verify locally as below.

#### Verify locally before asking Jesse

1. `make check`: private-host scan, GIF-hero WebPs, and a production build with the post checks. It must end with "All checks passed".
2. `make preview`: open the tailnet link on a phone and on desktop. Check the post in light and dark, the hero (pause/play for GIFs), the home page (the newest post shows once, with its hero), and `~/writing` or `~/photos`.
3. Optional: `scripts/browser-checks/` (see its README) runs the page matrix, UI, reduced-motion and analytics checks against the preview.
4. Social preview: the built page's `og:image` should be the card you expect; check it in the page source of the `make preview` build.

## Code Patterns & Conventions

### Theme Customization

**CRITICAL:** Never modify files in `themes/LoveIt/`
- Override in `layouts/` instead
- Hugo merges overrides automatically
- Preserves ability to update theme

### Testing

- Use smoke-test skill after content changes
- Use visual-debug skill for frontend issues
- Always build before committing: `hugo --cleanDestinationDir`

### Photo Posts

- Generated via photo-poster tool
- Include EXIF data, GPS coordinates
- Active templates display post images inline; older lightgallery frontmatter is inactive
- Maps rendered below EXIF table

## AI Assistant Guidelines

### When Working on Content

1. Follow existing post structure in content/posts/
2. Use proper Hugo frontmatter
3. Test with smoke-test skill
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
- Previews for other devices: `make preview` prints a tailnet HTTPS link and a LAN link, and removes the tailnet path when stopped. If a phone can't open the tailnet link, check iCloud Private Relay first.
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
