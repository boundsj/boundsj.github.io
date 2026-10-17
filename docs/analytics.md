# Analytics (GA4) on bounds.dev

Property: `G-LT0HKHY2J5` (`config.toml` → `params.analytics.google.id`). This branch changes code only. Nothing here needs a GA admin change to work; the admin steps at the end are optional and make the custom parameters show up in standard reports.

## When analytics runs

`layouts/partials/google-analytics.html` emits the GA snippet only in **production builds** (`hugo`, not `hugo server`) with `params.analytics.enable = true`. Even then, at runtime the snippet does nothing unless `location.hostname` is in `params.analytics.hosts` (`www.bounds.dev`, `bounds.dev`). So:

| Where | `gtag.js` requested? | Events |
| --- | --- | --- |
| www.bounds.dev (GitHub Pages) | yes | sent to GA4 |
| `hugo server`, `make serve`, `make preview` (LAN or tailnet) | no (the snippet isn't in the page) | dev mode |
| A local production build served from `localhost` or a LAN IP, or any mirror | no (blocked by the host check) | dev mode |

**Dev mode** means `themes/bounds-ascii/assets/js/analytics.js` still classifies every interaction but keeps it in the browser. Each event is logged to the console as `[analytics:dev] <name> {params}` and appended to `window.__boundsAnalytics`. The first entry is a `page_view` showing the sanitized page context the live snippet would send.

## Privacy rules

- Page context is sanitized **before** the first `config` call. `page_location` is `origin + pathname`, so query strings and fragments are never sent. On the 404 page it is the fixed `https://www.bounds.dev/404.html`, with `page_title` `404`. `page_referrer` is `origin + pathname` for same-site referrers and the origin alone for other sites.
- The 404 page sets `<meta name="referrer" content="origin">`, so a mistyped URL doesn't travel on as the next page's referrer.
- Events never carry email addresses (`email_click` has no address), visitor-typed text, query strings or fragments. `link_path` on outbound links is the path of a link Jesse wrote, with the query and fragment removed.
- Parameter values are capped at 100 characters, GA4's limit.
- GA4 doesn't log or store IP addresses, so the old `anonymizeIP` setting was dead config and has been removed.

## Page-level context

| Field | Set by | Values |
| --- | --- | --- |
| `content_group` | `gtag('config')` on every page | `home`, `writing`, `photos`, `bots`, `archive`, `about`, `taxonomy`, `error`, `page` |
| user property `site_theme` | `gtag('set', 'user_properties')` before `config`, and again on every theme change | `light`, `dark`, `green`, `amber` |

`content_group` comes from `themes/bounds-ascii/layouts/partials/content-group.html` (also on `<body data-content-group>`). Single posts follow their channel: `photos` category → `photos`; `generated` → `bots`; any other category → `writing`.

## Events

All names and parameters are snake_case. Reused parameters mean the same thing in every event.

| Event | Fires on | Parameters |
| --- | --- | --- |
| `select_content` (GA4 recommended) | Choosing a specific post: listing rows, the latest-post title or hero, writing entries, older/newer links, the lightbox's "open post", and links to `/posts/<slug>/` inside article text | `content_type` (`writing`, `photo`, `bots`, or `post` when a link inside article text doesn't say), `content_id` (post slug), `ui_location` |
| `nav_click` | Index-level navigation: header nav, status-bar footer, channel chips, back links, door buttons, 404 buttons, tag/category chips, "all posts", pager, "↑ top", other internal links | `nav_item` (`home`, `writing`, `photos`, `posts`, `about`, `bots`, `tags`, `categories`, `top`, `page`), `ui_location` |
| `theme_change` | A theme pill press that changes the theme | `theme_from`, `theme_to` |
| `outbound_click` | A link to another site, except the social profiles | `link_domain` (no `www.`), `link_path`, `ui_location` |
| `social_click` | GitHub, X/Twitter, LinkedIn profile links | `social_network` (`github`, `x`, `linkedin`), `ui_location` |
| `email_click` | Any `mailto:` link | `ui_location` |
| `rss_click` | Any link to an `index.xml` feed | `ui_location` |
| `read_progress` | The article body reaches 25, 50, 75 and 100% read, once each per page view | `percent` (number), `content_type`, `content_id`, `engaged_seconds` (number) |
| `photo_open` | The lightbox opens, or pages to another photo | `content_id`, `ui_location` (where it opened, or `lightbox` when paging), `method` (`click`, `next`, `prev`, `key`) |
| `native_video_start` | First play of each `<video>` in a post, per page view | `content_id`, `video_name` (file name), `video_trigger` (`user`, `autoplay`) |
| `code_copy` | A code block's copy button | `content_id`, `code_language` |
| `motion_toggle` | The pause/play button on an animated hero | `content_id`, `state` (`paused`, `playing`) |
| `page_not_found` | The 404 page loads | none |

`ui_location` comes from the nearest `data-ui` attribute in the templates: `header`, `footer`, `home_profile`, `door`, `home_latest`, `home_list`, `archive_latest`, `archive`, `chips`, `pager`, `writing_list`, `photo_grid`, `post_body` (default inside article text), `post_nav`, `post_crosslink`, `post_hero`, `back_link`, `about`, `terms`, `404`, `lightbox`, `page` (anything else). The photo strips use `data-photo-group` for the same purpose (`home_door`, `photo_grid`, `post_crosslink`, `post_hero`).

**Read depth.** The reference is the article body (`.post-content`), not the page. Progress is `(viewport bottom − body top) / body height`, clamped to 0–100%. 100% means the bottom of the body has reached the bottom of the viewport. A post that fits on one screen reports every milestone at load. `engaged_seconds` counts only time with the tab visible.

**Video.** `video_trigger` is `user` when the play happened during a user activation (the native controls, a click or a key), and `autoplay` otherwise. The cmux post's demo video autoplays, so its plays mostly show up as `autoplay`. If a video starts before the deferred script loads, its first play isn't reported.

## Overlap with Enhanced Measurement

The production check on 2026-10-17 saw the live property's tag emit `scroll` and `user_engagement` by itself, so Enhanced Measurement is **on**. Read these pairs together:

| Enhanced Measurement | This site | Use |
| --- | --- | --- |
| `click` with `outbound: true` | `outbound_click` / `social_click` | EM for raw totals; ours for `ui_location` and network |
| `scroll` (90% of the **page**) | `read_progress` (the **article body**) | Ours for reading; EM counts footers and short pages too |
| `video_start` (YouTube embeds only) | `native_video_start` (the site's own `<video>`) | Different names, no double count |
| `page_view` | `page_view` | The same event; ours adds `content_group` and the sanitized location |

No custom event reuses an Enhanced Measurement or reserved name.

## Where the code lives

- `layouts/partials/google-analytics.html`: guard, sanitized page context, `content_group`, `site_theme`, and `?analytics_debug=1`.
- `themes/bounds-ascii/assets/js/analytics.js`: dev/live event layer, link classification (capture phase), video starts, `page_not_found`.
- `themes/bounds-ascii/assets/js/theme.js`: `window.boundsTrack(name, params)`, the hook every module reports through (it dispatches a `bounds:track` DOM event), plus `theme_change`.
- `themes/bounds-ascii/assets/js/site.js`: `photo_open`, `read_progress`, `code_copy`, `motion_toggle`.
- Templates mark links with `data-nav`, `data-content-id`, `data-kind`, `data-social`, `data-ui` and `data-photo-group`. A new link only needs the right attribute to be classified.

## Verifying

- **Dev mode (any local server):** open the console, or run `__boundsAnalytics` in it, and click around. `scripts/browser-checks/analytics-dev-check.mjs` drives every event above and asserts its parameters (see `scripts/browser-checks/README.md`).
- **Production payloads, without sending anything:** `scripts/browser-checks/analytics-prod-check.mjs` serves a production build as `https://www.bounds.dev` from disk inside Playwright, loads the real `gtag.js`, and records and **aborts** every collect request (it also stubs `sendBeacon`). It asserts no PII, query strings or fragments in any payload, the fixed 404 location, origin-only referrers after a 404, and that the same build on another host requests nothing from Google.
- **GA DebugView (live site, optional):** visit `https://www.bounds.dev/?analytics_debug=1`. The query string isn't sent, but it turns on `debug_mode` for that page view, so events appear in Admin → DebugView.

## Optional GA admin steps (Jesse)

Custom parameters show up in Explorations right away, but standard reports need them registered as custom dimensions or metrics (Admin → Custom definitions). Suggested:

| Scope | Name | Parameter |
| --- | --- | --- |
| Event | UI location | `ui_location` |
| Event | Content type | `content_type` |
| Event | Content ID | `content_id` |
| Event | Nav item | `nav_item` |
| Event | Social network | `social_network` |
| Event | Link domain | `link_domain` |
| Event | Theme (to) | `theme_to` |
| Event | Photo open method | `method` |
| Event metric | Read percent | `percent` |
| User | Site theme | `site_theme` |

`content_group` is built in (Reports → Engagement → Pages and screens → Content group); it needs no registration.
