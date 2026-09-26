# Map focus, image loading, and gallery repair

Jesse authorized all three fixes on 2026-09-26. Keep the existing design, all 927 content files, all assets, and theme preference semantics. GPT-6 Sol xhigh implements this exact plan on `codex/site-cleanup-audit` with one local commit per coherent task and a Hugo build before each commit. The parent reviews and tests locally. No push, PR, merge, or deployment. Do not modify `themes/LoveIt/`. The future photo upload system is separate; do not redesign the current tool.

Baseline HEAD: `f259f153514c577707c07923906914396042fe1b`. Fresh full builds: `/tmp/bounds-sept26-baseline-163` and `/tmp/bounds-sept26-baseline-154`. Existing content SHA256 manifest: `/tmp/bounds-followup-content-manifest.json`. Parent dev server on port 1313 must remain running.

## 1. Map focus

Observed red case: from Somewhere in Nevada, press Tab on the back-to-posts link. The active element is `canvas.mapboxgl-canvas`, matches `:focus-visible`, but computed outline style is `none`. The general stylesheet targets `.mapbox:focus-visible`, which is not the focused element.

- In active `themes/bounds-ascii/assets/css/main.css`, after the general focus rules, add `.mapbox .mapboxgl-canvas:focus-visible { outline: 3px solid var(--border); outline-offset: -3px; }`. This stays inside Mapbox's clipped container and uses existing light/dark tokens.
- Do not add tabindex, change map interactions, or alter Mapbox dependencies. Parent will check keyboard Tab, focus border screenshots in both themes, mouse click behavior, and zoom buttons. Do not add unrelated control styling unless the actual browser check requires it.

## 2. Avoid unused image requests

Observed red case: both home `.field-signal` image elements have `complete=true` and nonzero naturalWidth. About has both a visible responsive portrait and a loaded `display:none` original JPEG (145,988 bytes).

### Home

- In root `layouts/partials/banner.html`, retain generation of the same six image resources (720/1440 desktop WebP, 768x640 mobile crop per theme). Replace two `<picture>` elements with the same empty `aria-hidden` `.field-signal` div.
- Pass the six generated resource URLs to `assets/css/field-signal.css` through Hugo `resources.ExecuteAsTemplate` before minify/fingerprint. Use a stable generated target path (e.g. css/field-signal.css) and a simple dict of light/dark small/desktop/mobile URLs. No new JavaScript state or changes to theme.js/pre-paint logic.
- CSS uses background positioning center, no-repeat, size cover, same width/aspect-ratio and 540px breakpoint. Light/default and `.crt` each select their own `background-image: image-set(url(small) 1x, url(desktop) 2x)` with ordinary desktop URL fallback before image-set. Inside mobile media rule select each existing crop URL. Preserve selector specificity so mobile overrides both modes.
- Browser loads only the winning computed background; it follows the existing `.crt` class on first load, manual switch, and OS change. Script-free paper fallback must still display artwork. Do not preload both images or add lazy loading.
- References: https://gohugo.io/functions/resources/executeastemplate/ and https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/image/image-set . Confirm both Hugo versions compile the pipeline.

### About

- Add a type-scoped image render hook `layouts/about/_markup/render-image.html` that omits only the image whose destination equals the featured resource's RelPermalink or its basename (current relative featured-image.jpeg). Resource alias `featured-image` means blindly resolving Destination via GetMatch may miss it. Resolve the existing featured resource first.
- Preserve standard image rendering (destination, plain alt text, optional title) for other images. Keep the empty paragraph wrapper and existing hide rule for now, so text/margins stay unchanged. Do not edit `content/about/index.md` or delete any original asset; metadata still references it.
- Add a small Hugo fixture or build-output regression using the actual render hook: one featured image, one unrelated image, ordinary text. Show the current duplicate before adding the hook; then require omission only of the duplicate and preserved text/other image. Run on 0.154.5 and 0.163.3.

## 3. Gallery generator

- In `tools/photo-poster/post_generator.py`, replace the unsupported image shortcode output with standard Markdown `![](gallery/photo-N.jpeg)` for each supplied gallery filename. Separate images with blank lines so each is a block. Keep image order and all frontmatter/description/EXIF/map/single-image behavior unchanged. Names are generated internally by the existing app.
- Write regression tests first: run actual `build_markdown` with a fixed date, no gallery and multiple gallery images. A temporary minimal Hugo project must copy actual active/root layouts/config/assets or sufficient real dependencies and include generated image files, then build the generated post using real Hugo. Old generator must fail with missing shortcode; fixed output must build and contain every image in order with existing asset targets. Also cover optional map output or preserve it by an exact single-image golden expectation. Do not test source-string presence alone. Use temp files only, no OpenAI or user-content writes.
- No new gallery interaction framework, shortcode implementation, or upload redesign. Existing post bodies continue unchanged.

## 4. Validation and documentation

- Run the Python photo test suite, four existing Node payload tests, tag fixture and new Hugo fixture tests on pinned/current Hugo, syntax/compile checks, full builds on both versions, and pinned `--minify --environment production` build. Reuse existing `/tmp/bounds-photo-test-venv`; no dependency updates required.
- Compare every generated file to the fresh baseline. Expected differences: main CSS fingerprint references in HTML, actual main CSS focus rule, home banner markup/CSS, About duplicate image omission, corresponding generated stylesheet file names. Existing post HTML bodies, feeds, media bytes, aliases, metadata, and content remain unchanged; investigate any other delta. Do not weaken exact comparison script. Content manifest must still match all 927 files.
- Parent browser: desktop/mobile home light/dark and persisted choice on reload, only current background requested before toggle, correct alternate after toggle, no missing artwork; About one portrait request and unchanged text/layout; map outline visible/unclipped in both modes; sample named posts and internal links; synthetic new gallery post in local fixture browser. Use fresh local origins/access logs if resource timing is unavailable in browser inspection.
- Update audit report with exactly verified results and limits after parent supplies browser evidence. Mark these three defects fixed; retain other unrelated deferred findings. Provide temp evidence and commit SHAs. Stop for Jesse's local test.
