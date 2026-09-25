# Authorized audit follow-up

**Scope:** Follow Jesse's follow-up on the site audit. GPT-6 Sol with xhigh reasoning implements the changes below on `codex/site-cleanup-audit`, with one local commit per coherent task. The parent reviews source and browser behavior. Do not push, open a PR, merge, or deploy.

## Boundaries

- Preserve every existing content file, image, post, route, tag label, and tag order. The content audit will provide a SHA256 manifest in `/tmp/bounds-followup-content-manifest.json`.
- The missing `image` shortcode is emitted only by the old photo tool's multi-image generator. Existing posts do not use it. There is no affected post to delete. Keep that generator change for Jesse's planned photo-tool replacement; do not extend this task into repairing its other behavior.
- Do not change map keyboard focus, duplicate image loading, theme appearance, dependencies used by the site, deployment, or any other deferred audit item. Do not edit `themes/LoveIt/`.
- Old upload-session compatibility is not required. Current sessions use `uuid.uuid4().hex` IDs and generated file names.

## Task 1: Constrain photo-tool paths

**Files:** `tools/photo-poster/app.py`, focused Python regression tests under `tools/photo-poster/tests/`, and a test dependency file only if necessary.

Root cause: `_session_dir()` joins an unchecked request value to `UPLOAD_DIR`. The same path is read, written, served, and recursively removed. Media names and stored names from session JSON also reach the filesystem without containment checks.

1. Add tests first using temporary upload, content, and outside-sentinel directories. Exercise the actual app functions or HTTP routes with real filesystem operations. Do not touch real uploads/content, read a real `.env`, or call OpenAI. If app dependencies are needed, install into `/tmp/bounds-photo-test-venv`; do not alter the user's global environment. Set `PYTHON_DOTENV_DISABLED=1` and empty AI credentials before importing the app.
2. Require session IDs to match `[0-9a-f]{32}` exactly. Reject malformed IDs with HTTP 400 before any filesystem side effect. Keep HTTP 404 for well-formed missing sessions/media. Keep idempotent deletion for a well-formed missing session.
3. Centralize containment in a small path helper, then use it for every session metadata, preview, and original-image read/write/delete path. Reject symlink components below the trusted configured upload root; verify resolved targets remain below the intended session/subdirectory. Reject absolute names, traversal, separators, and unexpected generated names. Use current generated forms `preview-[1-9][0-9]*.jpeg` and `upload-[1-9][0-9]*.(jpg|jpeg|png|heic|heif)`. `session.json`, `originals`, and `previews` are fixed internal names. The configured upload root itself is trusted.
4. Check original input paths before creating a post output directory, so a rejected stored path cannot leave a new partial post. Preserve normal upload/preview/create/delete behavior and payloads. Let path-validation HTTP 400 propagate through description generation rather than being remapped to 404. Do not change unrelated failure handling or AI behavior.
5. Meaningful regressions: malformed/absolute/traversal IDs cannot read/write/delete an outside sentinel; valid upload, media, preview and deletion work; symlinked session, metadata file, preview/original directory or file cannot escape; forged metadata names are rejected before AI/image processing/post output; missing valid paths return expected status; failed validation leaves outside sentinel and content intact. Use a tiny generated JPEG for the normal flow. No test against real user data.
6. This is containment against invalid requests and pre-existing symlinks, not a claim of immunity to a hostile local process racing filesystem changes. Avoid a new storage framework or broad refactor.
7. Run all new Python tests, the existing four Node payload tests, Python compilation, `git diff --check`, and `hugo --cleanDestinationDir` with a writable cache before committing. Full site output should still exactly match the prior baseline for this task.

## Task 2: Use actual tag-page links

**File:** root `layouts/_default/single.html`; focused rendered-output regression test if practical.

Root cause: applying `urlize` to tag text does not reproduce Hugo's taxonomy URL for ampersands. Six current links have the wrong URL; their destination pages already exist.

1. First add a focused test that builds a tiny Hugo fixture using the actual single template and checks that tag href targets exist. Cover ampersands, original display spelling/case, and frontmatter ordering. Run it against the old template and record the expected failure. Use stdlib Python/Hugo; avoid new test frameworks.
2. Resolve tags through `.GetTerms "tags"` and use each term's `.RelPermalink`. Hugo documents that GetTerms follows frontmatter order: https://gohugo.io/methods/page/getterms/ . Preserve original `.Params.tags` labels explicitly (index original labels by term index) if `.LinkTitle` changes capitalization. Preserve HTML whitespace and every other rendered byte. If taxonomy resolution removes a term and would misalign indices, stop and report evidence rather than silently changing labels.
3. Expected public output changes are exactly one tag href on each of six posts: `treats-tunes-and-tales-2024-01-02`, `arts-and-distant-shores-2023-12-26`, `economic-growth-and-change-2023-12-08`, `puzzled-wordplay-feast-2023-12-22`, `tech-tumult-and-trends-2023-11-20`, and `metropolitan-tussle-2023-12-30`.
4. Compare all outputs to `/tmp/bounds-audit-baseline` on local Hugo 0.163.3 and `/tmp/bounds-audit-baseline-154` on pinned Hugo 0.154.5. There must be no added/removed files, only those six href substitutions. Do not weaken `scripts/compare-site-builds.py`; a separate temporary comparison can assert the explicit six-difference allowlist.
5. Build before committing. Keep the test and fix in one coherent commit after observing red then green.

## Task 3: Record results

Update `docs/audits/2026-09-25-site-audit.md` to separate the initial byte-identical refactor from this explicitly authorized follow-up. Mark path and tag fixes complete after evidence exists. Clarify that zero existing posts use the missing shortcode, all content is preserved, and gallery generation remains deferred. Do not claim browser results before the parent provides them. Include repeatable test commands and any test-only dependency setup. Build and diff-check before the documentation commit.

## Parent acceptance

- Independently run the regression suites and both Hugo builds; check exact six-file output differences and unchanged content manifest.
- Review every changed path operation and reject unnecessary scope.
- In the local browser, follow affected tag links and inspect the preserved inbox, teaching-agents, and personal-photo posts at desktop/mobile widths. Keep the preview running on port 1313 for Jesse.
- Independent final code review; Sol fixes any concrete findings and commits them.
- Update REB-453 with evidence and leave it In Review for Jesse's local testing. No PR, push, merge, or deployment.
