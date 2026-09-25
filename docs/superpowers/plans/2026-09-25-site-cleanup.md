# Site Cleanup Implementation Plan

> **For agentic workers:** Use the subagent-driven-development review workflow. The user specifically selected one GPT-6 Sol agent at xhigh reasoning to implement all mechanical work with frequent local commits. Parent owns decisions and browser testing. This user direction takes precedence over per-task agent replacement or an extra plan-approval pause.

**Goal:** Improve maintainability without any change to public site behavior, appearance, content, routes, media, metadata, or photo-tool request semantics.

**Architecture:** Keep Hugo, the custom bounds-ascii theme, root layout overrides, and the FastAPI photo tool. Remove dormant configuration and duplicate implementation only. Use exact file-set and byte comparison of full builds as the public-site regression gate.

**Tech Stack:** Hugo Extended (Pages 0.154.5, installed local 0.163.3), Go templates, CSS, plain JavaScript, Python/FastAPI.

**Spec:** The user's request in this task: audit the entire site, make no functional changes, have Sol xhigh implement exact instructions and frequent local commits, then parent review and browser testing; stop for local user testing before a PR or merge. This file records that bounded design and its implementation details.

## Global Constraints

- Work only in the existing worktree `/Users/jesse/.codex/worktrees/7500/bounds.dev`.
- Create local branch `codex/site-cleanup-audit` from current HEAD `44f02e0f3d4d0cb29456085f3fc929b9e4d10357`. No push, PR, merge, or deployment.
- No edits to `themes/LoveIt/`, content, static images/fonts, CSS, frontend theme/dither JavaScript, dependency versions, or deployment workflow.
- Preserve public files exactly, including generated HTML whitespace, RSS, sitemap, aliases, image bytes/names, analytics, map options, and asset hashes.
- Preserve all photo-tool request bodies, field order, timing, endpoints, messages, state resets, and error handling.
- No third-party calls from tests. Do not start the photo tool with real credentials or create real posts.
- Do not resolve the deferred defects listed below. Their fixes need a behavior change.
- Build before each implementation commit. Keep each logical change in a separate commit. Use `git diff --check`.

## Review Focus

- Configuration removal must not affect built-in feeds or social metadata: compare every emitted byte under both Hugo versions.
- HTML formatting must not add text-node spaces around links, dates, or tags: exact output comparison.
- Image fallback selection must preserve small originals and the 480/960/1440-width selection: compare all image outputs; inspect three width boundary cases from the source.
- Photo payloads must preserve empty values, false/true draft, trimmed tags, duplicate tags, and reordered image IDs: exercise the real preview/create functions with stubbed fetch.
- Existing theme state and map restyling must remain intact: parent tests browser controls, reload, navigation, mobile layout, and map loading. Theme scripts stay byte-identical.

## Task 1: Add the output comparison guard

**Files:** Create `scripts/compare-site-builds.py`; commit this plan with the guard.

- [ ] Create the branch. Confirm the starting tree has only this plan as an untracked change.
- [ ] Implement a dependency-free Python CLI taking exactly two build-directory paths. Reject missing directories and empty builds. Recursively compare sorted relative file paths and SHA-256 bytes. Report added, removed, and changed files (bounded readable output plus exact totals), and exit nonzero for any difference. Do not normalize or ignore any file.
- [ ] Run against identical baseline directories, then temporary synthetic fixtures with one changed byte, one added file, and one removed file; confirm failures are detected. Missing/empty directories must fail. Avoid a framework or checked-in snapshot archive.
- [ ] Run a full Hugo build and commit `test: add exact site build comparison guard`.

Baselines already prepared by parent: `/tmp/bounds-audit-baseline` (local 0.163.3) and `/tmp/bounds-audit-baseline-154` (Pages 0.154.5). Never write into either baseline. The pinned binary is `/tmp/bounds-hugo-0.154.5/expanded/Payload/hugo`; official package checksum was verified. Parent may still be completing its baseline: verify build is complete before comparison.

## Task 2: Remove inactive LoveIt configuration

**Files:** `config.toml` only.

- [ ] Preserve all root Hugo settings, `[author]`, markup/highlight/Goldmark settings, pagination, and every menu entry.
- [ ] Keep the three existing `enableRobotsTXT`, `enableGitInfo`, and `enableEmoji` entries in their CURRENT nested TOML table. They are accidentally under `markup.goldmark.renderer`; moving them would change behavior. Add a brief comment that their placement is retained pending separate review.
- [ ] Retain these params and their exact values: `title`, `description`, `images`; `author.name/email/link`; `footer.since/license`; `home.profile.title/subtitle`; every current `page.mapbox` key; `analytics.enable/google.id/anonymizeIP`.
- [ ] Remove only the other unused LoveIt params sections and stale LoveIt version comments. Keep empty parent tables only where TOML structure requires them. Do not change baseURL, languageCode, license HTML, map token/styles, dates, or analytics behavior.
- [ ] Build to new `/tmp/bounds-audit-after-*` directories under both Hugo versions. Compare each to its matching baseline with the Task 1 guard; both must be exact. If any value affects output, restore that value, explain why, and rerun.
- [ ] Commit `refactor: remove inactive legacy theme configuration`.

## Task 3: Simplify templates with unchanged rendered output

**Files:** `layouts/partials/post-card.html`, `themes/bounds-ascii/layouts/partials/post-row.html`, `layouts/partials/responsive-image.html`.

- [ ] Reformat the one-line card and archive-row markup into readable logical blocks. Use Go template whitespace control at boundaries so generated bytes remain EXACT. Do not rename classes or alter semantic attributes/values.
- [ ] In responsive-image, compute `$fallbackWidth := int (math.Min 960 $image.Width)` once. While iterating the existing unique width list and constructing the unchanged srcset, keep the resized resource whose requested integer width equals `$fallbackWidth`. Use it for fallback src, removing the redundant Resize call. Preserve width order, q82/webp, dimensions, loading default, and the non-raster branch. No general image framework.
- [ ] Compare all output files against each matching baseline under both Hugo versions. If readable formatting cannot keep exact whitespace, reduce its scope rather than add fragile string postprocessing.
- [ ] Commit `refactor: simplify image and card templates without output changes`.

## Task 4: Deduplicate photo-tool request data

**Files:** `tools/photo-poster/static/app.js`, `tools/photo-poster/app.py`, `tools/photo-poster/ai_service.py`; create `tools/photo-poster/tests/payload.test.cjs`.

- [ ] First add characterization tests using Node's built-in test/assert/vm modules. Run the actual app.js in a small DOM stub, with a fake fetch recording calls and returning synthetic preview/create responses. No package install, browser automation library, network, or real post files.
- [ ] Exercise actual `requestPreview()` and `createPost()` for populated and empty form values, drafts false and true, tag input ` alpha, , beta ,alpha ` (expect duplicates preserved), image order `[2,0,1]`, preview state preservation, successful create state reset, failure messages, and no-session no-fetch behavior. Assert complete serialized payload keys and values, POST endpoints and content-type. Verify tests pass on current implementation before refactor.
- [ ] Add `buildPostPayload()` beside `parseTags()`. Return the current object in the exact key order: session_id, title, description, tags, category, draft, image_order. Replace both duplicate object literals with calls at exactly their current positions. Do not clone or reorder imageOrder or normalize extra fields.
- [ ] Remove unused `Optional` from app.py and unused `Any`/`Dict` imports from ai_service.py only after verifying references. Correct the AI docstring's sentence-count claim to match the existing 1–2 sentence prompt; do not alter the prompt or model.
- [ ] Run `node --test tools/photo-poster/tests/payload.test.cjs`, `node --check tools/photo-poster/static/app.js`, Python compilation using a temporary pycache, full Hugo build, exact output comparison, and diff check.
- [ ] Commit `refactor: share photo post payload construction`.

## Task 5: Correct project notes and record the audit

**Files:** `README.md`, `AGENTS.md`, `CLAUDE.md`, `README-AI-SETUP.md`, create `docs/audits/2026-09-25-site-audit.md`.

- [ ] Correct stale facts: active theme bounds-ascii; retained vendored LoveIt must never be edited; root layout overrides take precedence; GitHub Pages pins Hugo Extended 0.154.5; local version can differ and currently produces languageCode deprecation warnings. Photo tool is FastAPI/Uvicorn, not Flask.
- [ ] Preserve unrelated user/agent guidance and content/social-card requirements. Document existing make commands accurately, full build/check commands, and the two-directory comparison usage. Do not silently modify Makefile behavior.
- [ ] Fix README-AI-SETUP troubleshooting: `.cursor/agents` and `.cursor/skills` are real canonical directories; `.claude/` and `.codex/` contain symlinks to `../.cursor/...`. Correct Windows example to create a consuming tool junction pointing at `.cursor`; no `.ai/` target.
- [ ] Write an audit report with confirmed findings, source references, safe changes, deferred work, scope limits, exact test commands/results, and remaining user test gate. Parent will supply browser results for a final evidence commit. Clearly distinguish observed browser facts from source-only risks.
- [ ] Build and run checks; commit `docs: align site guidance and record modernization audit`.

## Confirmed audit facts and deferred work

Public site baseline: 304 posts; 461 generated pages plus 121 paginator pages, 75 aliases, 622 non-page files, 877 processed images. Main minified CSS 15,962 bytes; theme JS 2,702; dither JS 1,927; banner CSS 407. Local and CI versions differ. Dependencies are not upgraded in this change.

- **P1 photo tool:** app.py joins unchecked session_id at lines 52–53 and recursively deletes the resulting path at 112–115. Inputs can escape the session directory. Record an urgent follow-up; do not run an exploit or change path behavior here.
- **P1 photo tool:** post_generator.py lines 149–150 emits an `image` shortcode for multiple images, but active/root templates provide no such shortcode. Current posts do not use it. New multi-image posts can fail Hugo.
- **P2 photo tool:** quote-only YAML escaping at post_generator.py 25–26 mishandles backslashes/newlines; description request app.js 95–96 always uses original index 0 after reorder; sync OpenAI/image calls inside async routes block; preview responses can race and create can submit twice; unexpected upload/create failures leave partial files; requirements are unbounded; Makefile kills every process on port 8000 with SIGKILL; form labels and reorder controls have accessibility gaps; zero GPS values are treated as absent. These are source findings, not live-service tests.
- **P2 config:** three Hugo feature flags are in the wrong TOML table. Moving them changes output. Keep placement this round.
- **P2 content:** 302 of 304 posts lack a description. One meadow-in-santa-cruz preview resource declaration points to an absent file. Photo tool writes description only in body, not frontmatter. No content edits this round.
- **P2 payload size:** audit found 463.3 MiB content and 350.6 MiB of redundant exact image copies in 56 hash groups. Removal could break public image URLs. Keep originals.
- **P2 browser confirmed:** homepage loads both light and dark hero image variants; About loads the hidden original portrait (145,988 bytes) in addition to the visible responsive hero. Keep resource behavior here; revisit with explicit performance scope.
- **P2 source risk:** synchronous Mapbox head script can block parsing; map canvas keyboard focus may be invisible because global outline removal does not include the canvas. Parent checks focus locally.
- **P3:** active nav lacks aria-current; dither.js loads globally although current content has no data-dither; card image has no width/height but fixed thumb box may prevent layout shift. Do not claim measured CLS or accessibility compliance.
- **CI:** no PR build gate; deployment runs on main/manual only; unused optional npm install step suppresses errors. Retain deployment configuration and record build-only PR validation as follow-up.

Reference for future version work: https://gohugo.io/methods/site/language/ (Locale was added in 0.158.0, so replacing LanguageCode blindly breaks the 0.154.5 build). Hugo caches resource transformations already; avoid another general cache abstraction.

## Parent review and user handoff

Parent reviews each logical commit and the whole branch, checks output parity itself, and tests home/About/posts/taxonomies/pagination/photo map/technical post/video/404 in the local browser. Test both themes, persistence, keyboard navigation, and desktop/narrow widths. Save local evidence under `/tmp/bounds-audit-evidence`. Leave a Hugo dev server running for the user. Update Linear REB-453 with plan and final evidence; status remains In Review pending user testing. No claim that all deferred site issues are fixed or that the site is perfect.
