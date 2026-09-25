# bounds.dev site audit — 2026-09-25

## Scope and result

The initial cleanup removed dormant configuration, simplified three templates, shared photo-tool request data, and corrected project notes. It changed no content, media, public URLs, theme CSS or JavaScript, dependency versions, or deployment. Both Hugo Extended 0.154.5 (the GitHub Pages version in `.github/workflows/hugo.yml`) and local 0.163.3 produced an exact match against their own pre-change full builds: 2,187 relative files each, with no added, removed, or changed bytes.

An authorized follow-up then constrained photo-tool filesystem paths and repaired six broken tag hrefs. The six destination pages already existed; the labels, tag order, and every content and asset file stayed unchanged. Full builds now differ from the initial baseline only in those six hrefs. Local user testing remains a gate before any PR or merge.

The active theme is `themes/bounds-ascii/`. Root `layouts/` overrides its templates. Vendored `themes/LoveIt/` was not edited. `config.toml` contained unused LoveIt parameters; three `enable*` settings were already inside `[markup.goldmark.renderer]`, so their placement remains unchanged. Moving them needs separate behavior review. Local Hugo 0.163.3 reports `languageCode` deprecation; Hugo 0.154.5 builds without that warning. The version difference remains because a direct `locale` substitution would break the pinned build: [Hugo documents `Locale` as new in 0.158.0](https://gohugo.io/methods/site/language/).

The build contains 304 posts, 461 pages, 121 paginator pages, 75 aliases, 622 non-page files, and 877 processed images. The observed main minified CSS is 15,962 bytes; theme JavaScript is 2,702 bytes; dither JavaScript is 1,927 bytes; banner CSS is 407 bytes. These are baseline facts, not performance scores.

## Verification

- `python3 scripts/compare-site-builds.py /tmp/bounds-audit-baseline /tmp/bounds-audit-after-task4` → exact match, 2,187 files. The same command with `baseline-154` and `after-task4-154` also matched all 2,187 files. The guard was also tested against empty/missing directories and synthetic changed, added, and removed files; each difference returned a nonzero exit status.
- `hugo --cleanDestinationDir --destination /tmp/bounds-audit-after-task4 --cacheDir /tmp/bounds-audit-cache-task4` → passed on local 0.163.3. The pinned `/tmp/bounds-hugo-0.154.5/expanded/Payload/hugo` build with separate destination/cache → passed.
- `node --test tools/photo-poster/tests/payload.test.cjs` → 4 passed. These tests ran on the original request code before refactoring and after it. They use the real `requestPreview()` and `createPost()` functions with a stub DOM and synthetic fetch responses. They cover full payload keys and order, both endpoints, empty fields, drafts, duplicate trimmed tags, image order `[2,0,1]`, success and error messages, state preservation/reset, and no-session behavior.
- `node --check tools/photo-poster/static/app.js`, Python compilation with `PYTHONPYCACHEPREFIX=/tmp/bounds-audit-pycache`, and `git diff --check` → passed.
- A local baseline link audit scanned all 579 HTML files, 10,461 internal URL occurrences, and 504 fragments. The build also contains 78 XML files; they were not part of this full link scan. The HTML scan found six broken tag hrefs, with no other missing targets or fragments and no duplicate IDs. This scan is a build-output audit; it does not prove every external link works.
- The parent also built pinned Hugo 0.154.5 with `--minify --environment production` successfully. This checks the Pages build mode in addition to the exact full-build comparisons.

The parent reviewed the local Hugo server in the Codex browser. Checked views: home, About, archive pages 1 and 2, tags, categories, generated category, Somewhere in Nevada photo, Political Ties and Steel generated post, cmux video article, inbox article, old inbox alias, and 404. Archive next/previous links worked. Manual light/dark theme changes and saved choice after reload/navigation worked. The map loaded, zoomed, and changed style with the theme; the skip link moved focus to main content; the typed subtitle completed; the video loaded and played; lazy article images loaded after scroll. Sampled layouts at 320, 390, and 1280 CSS pixels had no document horizontal overflow. No JavaScript error logs were observed on those views. The parent independently repeated both 2,187-file output comparisons and the four photo payload tests, JS syntax check, Python compile, and diff check.

Existing browser findings: theme restyling logged Mapbox's `Unable to perform style diff: Unimplemented: setSprite.. Rebuilding the style from scratch.` warning. The home page loaded both light and dark hero images. About loaded a hidden original portrait (145,988 bytes) as well as the visible responsive hero. The keyboard-focused map canvas matches `:focus-visible` but has computed `outline-style: none`; a visible focus fix is deferred. These observations are baseline behavior and are not caused by this cleanup.

Browser limits for the initial pass: no real photo upload, AI call, or post creation; the JavaScript request tests use synthetic responses. This pass did not test another browser, OS-level theme switching, reduced-motion mode, screen-reader behavior, every external link, or measured Core Web Vitals.

## Authorized follow-up verification

`tools/photo-poster/app.py` now accepts only 32-character lowercase hex session IDs and generated preview/original file names. Its shared path check rejects symlink components below the configured upload root and verifies containment before metadata, media, image, or delete operations. It checks every original name before creating a post output directory. Invalid paths return HTTP 400; a valid missing session or media file still returns 404, and deleting a valid missing session remains idempotent. This guards against invalid requests and existing symlinks; it does not claim protection against a hostile local process racing filesystem changes.

The path tests use temporary upload, content, and outside-sentinel directories, a generated tiny JPEG, and real app functions. They do not read a real `.env`, call OpenAI, or write existing posts. The original app failed the new containment tests; the fix passes all 13. The parent independently tested actual FastAPI HTTP routes with temporary data: unsafe preview/post/description requests returned 400; upload, media, preview, create, and repeated delete succeeded; the decoded JPEG, outside sentinel, and metadata had the expected state. This is a temporary-fixture integration check, not a run against the user's photo data.

The post template now resolves each original tag label through Hugo's [taxonomy `Get` method](https://gohugo.io/methods/taxonomy/get/) and uses the term page's `RelPermalink`. The fixture reproduced the old ampersand link failure, then passed on both Hugo versions with ampersands, lowercase text, frontmatter order, and a repeated tag. The earlier `.GetTerms` approach was rejected because it removed a duplicate and misaligned labels; `.LinkTitle` capitalized a lowercase label. Both full builds contain 2,187 files: six post HTML files have exactly one corrected href each, and the other 2,181 files match the initial baseline byte for byte. The six repaired posts are `treats-tunes-and-tales-2024-01-02`, `arts-and-distant-shores-2023-12-26`, `economic-growth-and-change-2023-12-08`, `puzzled-wordplay-feast-2023-12-22`, `tech-tumult-and-trends-2023-11-20`, and `metropolitan-tussle-2023-12-30`. A second link scan checked 579 HTML files, 10,461 internal URL occurrences, and 504 fragments with no missing targets or duplicate IDs.

The parent clicked all six repaired links from their post pages in the local browser. Each opened the expected taxonomy page with its article. No JavaScript errors or horizontal overflow appeared in the sampled views, including 390 px mobile. The parent also checked the six source posts, all five inbox illustrations after scroll, four photo heroes and maps, and cmux video controls. The browser returned to the home page at its normal viewport. These checks do not cover every browser, screen reader, or external link.

Repeat the focused checks with:

```sh
python3 -m venv /tmp/bounds-photo-test-venv
/tmp/bounds-photo-test-venv/bin/python -m pip install -r tools/photo-poster/requirements.txt
PYTHON_DOTENV_DISABLED=1 OPENAI_API_KEY= /tmp/bounds-photo-test-venv/bin/python -m unittest discover -s tools/photo-poster/tests -p 'test_*.py'
python3 -m unittest discover -s scripts/tests -p 'test_tag_links.py'
PATH=/tmp/bounds-hugo-0.154.5/expanded/Payload:$PATH python3 -m unittest discover -s scripts/tests -p 'test_tag_links.py'
node --test tools/photo-poster/tests/payload.test.cjs
node --check tools/photo-poster/static/app.js
PYTHONPYCACHEPREFIX=/tmp/bounds-audit-pycache /tmp/bounds-photo-test-venv/bin/python -m py_compile tools/photo-poster/app.py tools/photo-poster/tests/test_paths.py
git diff --check
```

The full-build and content audit used Hugo 0.163.3 and the pinned 0.154.5 binary with separate writable cache/destination directories. A local six-href allowlist comparison against the immutable baseline confirmed the exact output delta, and a SHA-256 manifest confirmed all 927 content files unchanged. No test dependency was added to the repository; the temporary venv contains the photo tool's existing requirements.

## Deferred defects and follow-up work

Priority here reflects the current source and baseline audit, not a claim that these defects were introduced by this branch.

1. **P1 — multi-image posts.** `tools/photo-poster/post_generator.py` lines 149–150 emits an `image` shortcode for gallery photos. The active/root templates have no matching shortcode. Zero existing posts use it, so no post needed deletion. A new multi-image post can fail Hugo. Gallery generation remains deferred to the planned photo-tool replacement; the temporary two-image test checks file operations only.
2. **P2 — photo-tool robustness.** `post_generator.py` lines 25–26 escapes quotes but not backslashes or newlines in YAML; `static/app.js` description generation always sends original `image_index: 0` after reorder. Synchronous OpenAI/image work inside async routes can block requests; preview responses can race, and create can submit twice. Unexpected upload/create failures can leave partial files. Python requirements are unbounded. `make photo-poster` force-kills every process on port 8000. Form labels/reorder controls have accessibility gaps, and zero GPS coordinates are treated as missing. These are source findings, not live-service tests.
3. **P2 — content and payload.** 302 of 304 posts lack a frontmatter description, and `meadow-in-santa-cruz` names an absent preview resource. The photo tool writes the description in the body rather than frontmatter. The content tree is 463.3 MiB; 56 exact-hash image groups account for 350.6 MiB of redundant copies. Removing files could break public image URLs. The home/About image loading noted above needs an explicit performance change and measurement.
4. **P2/P3 — browser and source risks.** The map focus outline defect is confirmed in the browser. A synchronous Mapbox head script can block parsing (source risk). The active nav has no `aria-current`; `dither.js` loads globally although current content has no `data-dither`; card images omit intrinsic dimensions, although their fixed thumb box may prevent layout shift. No measured CLS or accessibility compliance is claimed. `content/posts/cleanup.sh` is currently published at `/posts/cleanup.sh`; it is a maintenance deletion script, and the baseline scan found no secret. Move maintenance tools out of content only with an explicit URL decision.
5. **CI.** `.github/workflows/hugo.yml` builds and deploys on main/manual runs, with no PR build gate. Its optional npm install step suppresses errors. Add build-only PR validation in a separate workflow change.

The remaining gate for this branch is local user testing before any PR or merge. The initial cleanup matched every baseline byte; this follow-up changed only six intended hrefs in public output. The deferred defects need separate scoped changes.
