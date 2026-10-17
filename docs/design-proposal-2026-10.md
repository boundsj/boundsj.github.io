# bounds.dev redesign proposal: "Field Signal TUI" (2026-10)

Status: **draft v1, before review.** It responds to `docs/design-audit-2026-10.md`. The review log at the end records reviewer critiques and decisions.

## Concept

The Field Signal hero already shows the site's two halves, joined by connector lines and square amber nodes: **field** (photographs, a topo map, a camera frame) and **signal** (a `>_` terminal). The redesign treats bounds.dev as a friendly TUI workstation with two first-class channels: `~/writing` (signal) and `~/photos` (field). The bot limericks remain as a third, quieter channel. The visual vocabulary comes from the hero and from modern TUIs (lazygit, btop, k9s, Charm's Bubble Tea and Lip Gloss): titled panels, a status bar, a colored selection bar, color-coded kinds, and square signal nodes.

Fun and dorky comes from TUI details: a theme change that wipes across the page from the pill, rows that light up like a selected list item, a footer status bar, a 404 that reads like a shell error, and a hero that "scans in" with pulsing signal nodes. Ease comes from plain words. Every control is a visible link or button with a 44 px touch target on phones and at least 24 px on desktop. No keyboard shortcuts are required.

## Retained (Jesse's established preferences)

- The four-mode pill sits just right of `bounds.dev` and stays small, rounded, with a sliding glow. Refinements: the glow takes the active theme's signal color, it stretches slightly while sliding, and theme changes use a View Transition wipe. Labels stay `lt dk grn amb` with their existing accessible names and tooltips.
- Iosevka Latin subsets everywhere and Iosevka Aile for post prose, all self-hosted. No new font files, no CDN, no VT323, no IBM Plex Mono.
- The subtitle typing animation and its cursor stay as they are. The full string moves into a screen-reader-only span, and the typed span becomes `aria-hidden` (audit #15). No other cursor or typing effects.
- The home page shows the latest post once, with its title, date and full hero image, and no box. Rows have no dividers, use regular-weight titles, and show ls-style dates and read times. The latest post never appears twice.
- Tight spacing and no awkward wrapping on phones.
- About keeps its og/twitter tags, `socialTitle`, TED image, and `bounds@mail.grokbot.com`.

### Proposed changes to established choices (flagged for Jesse)

1. **Nav:** `~/posts ~/tags ~/categories ~/about` becomes `~/writing ~/photos ~/posts ~/about`. Tags and categories stay reachable from `/posts/` (channel chips and a tags link) and from the footer. *Reason:* audit #1–3. Photos and writing need front doors, and taxonomy is low-value nav for first-time visitors.
2. **Photo rows show `photo` instead of `1 min`** in the read-time column, in every listing. *Reason:* audit #12. Writing rows keep their read times.
3. **Archive hero:** on `/posts/` page 1, the latest post's hero gets its title and a link, as on the home page, and rows start from the second post. *Reason:* audit #4. This keeps the recent decision to show a visual on the archive but fixes the orphan image and the duplicate row.
4. **Scanlines move off the content.** The 5% line texture becomes a page-background pattern behind content, never over photos or text. *Reason:* audit #7.
5. **Rounded panels:** new TUI panels and buttons use a 6 px radius, like Lip Gloss rounded borders. Photos and heroes keep square edges. *Reason:* modern TUI language. The baseline system said "radius 0 everywhere", though the pill is already rounded.

## Visual language

### Color: signal channels per theme

New tokens are layered on the existing ink/paper and CRT tokens, which are unchanged. Each kind of content gets a signal color for glyphs, labels, panel titles, selection bars and the progress bar. Body text stays `--fg-1`. Color is never the only cue: each kind also has a text label (`writing`, `photo`, `bots`).

| Token | light (paper) | dark (color CRT) | green (P1) | amber (P3) |
| --- | --- | --- | --- | --- |
| `--sig-write` (cyan) | `#08606C` | `#5FD7E6` | `#38E25B` | `#FFB23E` |
| `--sig-photo` (amber, from the hero nodes) | `#7F4A00` | `#FFB547` | `#A6F7B4` | `#FFD592` |
| `--sig-bots` (magenta) | `#A3236F` | `#FF7AC6` | `#2BC650` | `#E99A2C` |
| `--sig-ok` (green) | `#1A6B2E` | `#5BE37A` | `#38E25B` | `#FFB23E` |

Light and dark are the color modes. Green and amber stay faithful monochrome phosphor, so every channel maps to a brightness step of the phosphor. All values are at least 4.5:1 on all three backgrounds of their theme, and at least 4.5:1 on their own 16% selection tint (checked with the WCAG formula; values are final after M1 verification).

### Components

- **Panel (`.tui-panel`)**: a 1 px border and 6 px radius, with the title set into the top border (`╭─ ~/photos ─────╮`). It is built with CSS (an absolutely positioned title on the panel background), so it is real text, not box-drawing glyphs.
- **Selection bar**: on a row's hover or focus, a tinted background in the row's signal color slides in from the left, a `▌` marker appears, and the title underlines. Text stays `--fg-1`.
- **Kind label**: `writing`, `photo` or `bots` in small signal-colored text, with a square node glyph `■` borrowed from the hero.
- **Buttons**: bracketed labels such as `[ browse photos → ]` with a 1 px border, 6 px radius, and at least 44 px tall on touch screens. Pressing moves the button 1 px (a hard press).
- **Status bar footer**: one row with tmux-like segments: `bounds.dev` · `writing` `photos` `posts` `about` · `rss` `email` `github` · `↑ top`. Every segment is a plain, visible link. It wraps to two rows on phones. Copyright and license stay below it.
- **Code blocks**: a panel title with the language (`bash`, `text`, `yaml`) and a `[ copy ]` button that changes to `[ copied ]` for 1.5 s. Without JavaScript the button is absent.
- **Chips**: tag and category chips become real links with a 44 px touch area on phones.

### Typography

Unchanged families and weights. Section heads (`$ recent posts // ls -lt`) keep the prompt idiom. Uppercase tracked micro-labels are reduced to the byline and the status bar, so they stop reading as noise.

## Motion system

Tokens: `--dur-1: 120ms` (hover and press), `--dur-2: 220ms` (state changes), `--dur-3: 420ms` (entrances), `--ease-out: cubic-bezier(.22,1,.36,1)`, and `--ease-step: steps(6, end)` for scanner-like effects. Only `transform`, `opacity`, `clip-path` and `background-color` animate. Nothing animates layout.

| Moment | What happens | Notes |
| --- | --- | --- |
| Page entrance | Main sections rise 6 px and fade in, 40 ms apart, at most 6 steps | CSS only, `animation-fill-mode: both`. Content is visible if the CSS fails. |
| Hero scan-in | On the home page, the Field Signal art reveals top to bottom behind a thin bright scanline (about 700 ms, stepped) | Once per session (`sessionStorage`), skipped for reduced motion |
| Signal nodes | Small squares overlaid on the hero's amber nodes glow gently in sequence on a 4 s loop | Opacity only. Paused off-screen (IntersectionObserver) and when the tab is hidden. Separate node coordinates for the desktop image and the 6:5 mobile crop. |
| Theme switch | Circular View Transition wipe from the pressed pill (about 380 ms). The pill glow slides with a slight stretch. | Falls back to an instant switch where unsupported or with reduced motion |
| Rows | The selection bar slides in (120 ms) | Hover and focus look the same |
| Links | The underline draws from left to right (160 ms) | Body links in prose stay plainly underlined |
| Doors and panels | Lift 2 px on hover. Photo thumbnails inside the photos door shift apart slightly. | |
| Photo tiles | Reveal on scroll (fade and 8 px rise). On hover the image scales to 1.04 inside its frame. | IntersectionObserver adds the class. Without JavaScript, everything is visible. |
| Lightbox | `<dialog>` scales from 0.96 and fades in (200 ms) | |
| Read progress | A 3 px bar in the post's signal color at the bottom edge of the sticky header | `transform: scaleX`, updated with rAF on scroll. With reduced motion it still updates, but without easing. |
| Copy button | Label swaps to `copied` | |

`prefers-reduced-motion: reduce` disables every animation and transition: entrances render in their final state, there is no scan-in, nodes are static, view transitions are skipped, and the lightbox opens instantly. The typed subtitle keeps today's reduced-motion behavior.

## Information architecture

### Header

Top row: `bounds.dev` and the pill (unchanged). Nav: `~/writing  ~/photos  ~/posts  ~/about` as visible links. Below 640 px they become a second row of equal-width tabs, each 44 px tall. The header stays sticky. On phones its total height is cut from 104 px to about 92 px by tightening padding, not by hiding nav.

### Home (`/`)

1. Field Signal hero (scan-in and nodes)
2. Name, typed subtitle, social links. On phones the links read `github · x · linkedin · email · rss`, in full words, at least 44×44 px.
3. **Two doors** side by side (stacked on phones under 360 px):
   - `╭─ ~/writing ─╮`: "Notes on agents, tools, games and the terminal", `6 posts`, `[ read the writing → ]`
   - `╭─ ~/photos ─╮`: a strip of 4 recent photo thumbnails (square, about 18 KB WebP each), `10 photos`, `[ browse photos → ]`

   The doors show no post titles, so the latest post still appears only once.
4. `$ latest`: the latest post, once, with title, date, read time and full hero. No box (as today).
5. `$ recent posts // ls -lt`: the next 6 rows with kind labels.
6. `[ all posts → ]` and the status bar footer.

### `/writing/`

New section page, built from `content/writing/_index.md` with `outputs: [html]`. It lists every post in categories `dev` or `technology`, newest first, as `man`-style entries: title, a date · read time · kind line, the frontmatter `description`, and tag chips. There are no thumbnails, so the page stays fast and text-forward. A footer line links to the bot limericks and the full archive.

### `/photos/`

New section page (`content/photos/_index.md`): a **contact sheet**. It is a responsive grid with 2 columns on phones and 3–4 on desktop. Each tile is a frame numbered like a film strip (`01A`), with the date and title. Thumbnails are Hugo-processed WebP (`Fill 600x600`, about 30–60 KB). Tapping a tile opens an accessible `<dialog>` lightbox. It shows a larger WebP (about 1600 px wide, `srcset`), the title, the date, the caption, `[ ← prev ] [ next → ]`, `[ open post → ]` and `[ close ]`. Esc, backdrop click and the close button all dismiss it. Focus returns to the tile, and arrow keys page through photos as an optional extra. Without JavaScript, tiles are plain links to the posts. The page renders no GIF.

### `/posts/` (all)

Channel chips at the top: `[ all ] [ writing ] [ photos ] [ bots ] [ tags ]`. They are links to `/posts/`, `/writing/`, `/photos/`, `/categories/generated/` and `/tags/`, so no client-side filtering is needed. Page 1 shows the latest post's hero with its linked title, and the rows start after it (flagged change 3). Rows carry kind labels. The pager uses real buttons, and disabled states are greyed and marked `aria-disabled`.

### Single posts

- Back link: `← ~/writing` or `← ~/photos` depending on the kind (`~/posts` for bots).
- The category chip becomes a link.
- A read-progress bar.
- Code panels with copy buttons (writing posts).
- **Photo posts:** tapping the hero opens the same lightbox. The EXIF table is styled as a TUI panel. Mapbox loads lazily, only when the map nears the viewport (audit #19).
- **Next and previous within the same channel**, at the end of the post, as two large links. Writing posts also get a single "meanwhile in `~/photos`" line with 3 thumbnails, so the two channels cross-link without burying each other.

### 404

`bash: cd: <path>: No such file or directory`, with buttons `[ ~/writing ] [ ~/photos ] [ home ]`. The path comes from `location.pathname`, inserted as text. It is never sent to analytics.

## Analytics plan

### Loading and guards

- `gtag.js` loads only when **all** of these hold: a Hugo production build, `params.analytics.enable`, and at runtime `location.hostname` is in `params.analytics.hosts` (`www.bounds.dev`, `bounds.dev`). The snippet moves after `<meta charset>`.
- In every other case (`hugo server`, `make preview`, local production builds, mirrors), `gtag.js` is never requested. A tiny `analytics.js` event layer still runs in **dev mode**. It logs each event to the console as `[analytics:dev] event_name {params}` and appends it to `window.__boundsAnalytics` for automated checks. Nothing leaves the browser.
- `?analytics_debug=1` on the production host adds `debug_mode: true` to the GA config and to events, for GA DebugView.
- The dead `anonymizeIP` setting is removed. GA4 never stores IP addresses.

### Page-level context (on `gtag('config')`)

- `content_group`: `home`, `writing`, `photos`, `bots`, `archive`, `about`, `taxonomy` or `error`. This lets GA4 split writing traffic from photo traffic in standard reports without custom dimensions.
- `theme` (user property `site_theme`): the theme active at page load.

### Events

All names and parameters are snake_case. Parameters are reused across events. No event carries PII, free text typed by users, query strings or email addresses.

| Event | When | Parameters |
| --- | --- | --- |
| `select_content` (GA4 recommended) | Click on any post link in a listing, door, next/prev or the 404 page | `content_type` (`writing`, `photo`, `bots`), `content_id` (post slug), `ui_location` |
| `nav_click` | Header nav, status bar, channel chips, back links | `nav_item` (`writing`, `photos`, `posts`, `about`, `home`, `tags`), `ui_location` (`header`, `footer`, `chips`, `back_link`, `door`, `404`) |
| `theme_change` | A pill press that changes the theme | `theme_from`, `theme_to`, `ui_location: header` |
| `outbound_click` | Any link to another host (except social links) | `link_domain`, `link_path` (no query), `ui_location` (`post_body`, `footer`, …) |
| `social_click` | GitHub, X/Twitter, LinkedIn links | `social_network` (`github`, `x`, `linkedin`), `ui_location` (`home_profile`, `about`, `footer`) |
| `email_click` | `mailto:` links | `ui_location` (no address) |
| `rss_click` | RSS links | `ui_location` |
| `read_progress` | The article body crosses 25, 50, 75 and 100% of its height in view, once each per page view | `percent`, `content_type`, `content_id`, `engaged_seconds` (visible-tab time) |
| `photo_open` | The lightbox opens (grid tile, home door, post hero) or pages within it | `content_id`, `ui_location` (`photo_grid`, `home_door`, `post_hero`, `lightbox_next`, `lightbox_prev`) |
| `video_start` | A native `<video>` in a post starts playing | `content_id`, `video_name` (file basename) |
| `code_copy` | A code copy button | `content_id`, `code_language` |
| `page_not_found` | The 404 page loads | none; GA's `page_location` already holds the path |

These events stay distinct from Enhanced Measurement names (`click`, `scroll`, `file_download`), so turning EM on or off never double-counts them. `docs/analytics.md` will document the schema, the guard, how to verify in dev mode and in GA DebugView, and which parameters Jesse should register as custom dimensions in GA admin: `ui_location`, `content_type`, `content_id`, `percent`, `social_network`, `theme_to`, `nav_item`, `link_domain` and the user property `site_theme`. Registering them is Jesse's admin step; this branch changes code only.

## Performance budget

- CSS stays at or under 26 KB minified, JS at or under 12 KB minified in total across theme, site and analytics.
- No new fonts. No GIFs on new pages; door and contact-sheet thumbnails are WebP.
- Mapbox loads lazily, and `dither.js` loads only on pages that use `data-dither`.
- The home page adds the 4 door thumbnails, about 60–80 KB.

## Milestones (each gets a reviewer pass and a commit)

1. **M1: Foundations and IA shell.** Tokens and signal palette, universal `:focus-visible`, scanlines moved behind content, new nav, status bar footer, target sizes, typed-subtitle accessibility, kind labels and photo rows, `/writing/` and `/photos/` pages (static, no lightbox yet), archive chips and the archive hero fix.
2. **M2: Home and photos.** Doors, contact sheet, lightbox, photo-post hero lightbox, lazy Mapbox, next/prev and cross-links.
3. **M3: Motion and TUI details.** Entrances, hero scan-in and nodes, theme View Transition with pill refinement, selection bars, underline draw, read-progress bar, code panels and copy, the 404 shell error, and the reduced-motion audit.
4. **M4: Analytics.** Runtime guard, `analytics.js` event layer, `data-track` wiring, `content_group`, `docs/analytics.md`, and a headless check that asserts the events in dev mode and that `gtag.js` is never requested off-host.

## Acceptance checks

- The `hugo --cleanDestinationDir` build passes on 0.154.5. `scripts/tests` (About image hooks and tag links) pass. `make check-private-hosts` passes.
- Playwright checks home, `/writing/`, `/photos/`, `/posts/`, a writing post, a photo post, About and 404 at 390 and 1280 in all four themes: no horizontal overflow, no console errors from site code, no standalone target under 24 px (44 px for the main touch controls on phones), and no text-contrast failures in site components.
- Reduced motion: with `reducedMotion: 'reduce'`, computed `animation-name` and transition durations are none or 0 on animated components, the hero has no scan-in, and theme changes are instant.
- Analytics: in dev mode every event above is recorded in `window.__boundsAnalytics` with the documented parameters. No request goes to `googletagmanager.com` or `google-analytics.com` on `localhost` or the preview host, even from a production build.
- Retained behavior: the theme key `bounds-crt` and legacy migration, pre-paint theming, Field Signal light/dark art selection, About og tags and email, RSS at `/index.xml`, existing permalinks and aliases, Mapbox theme restyling, and the home page's single latest post.

## Review log

*(Filled in after each reviewer round.)*
