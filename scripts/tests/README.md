# Contract tests

Run from the repository root with Hugo Extended (Pages uses 0.154.5), Python 3,
Node.js with `node:test`, and libwebp (`brew install webp` or `apt install webp`).
No browser, preview server, npm install, or network access is needed to run tests.
Install the Python dependencies once in an isolated environment:

```sh
python3 -m venv /tmp/bounds-contract-tests
/tmp/bounds-contract-tests/bin/python -m pip install -r requirements-test.txt
make test PYTHON_BIN=/tmp/bounds-contract-tests/bin/python
make check
hugo --cleanDestinationDir
```

`make test` builds production `public/` output before running the suite. It does
not run against drafts or a development server. `make check` remains the review
and deploy preflight, independent of test dependencies.

| Test | Contract |
| --- | --- |
| `test_post_checks.py` | Runs `make check` on isolated sites: missing description, hero alt and SVG social card warn with exit 0; missing resource and image references each fail. |
| `test_site_contracts.py` | Every published post has nonempty og/twitter title, description and image metadata; local card files exist. |
| `test_site_contracts.py` | Published photo front matter has title, description, zoned date, draft boolean, tags, photos category and a real featured-image resource. Explicit alt or the caption supplies alt text. Optional EXIF tables have Attribute/Value columns and Camera plus available Focal Length/Aperture/ISO rows. |
| `test_site_contracts.py` | All published posts appear across `/posts/` pagination; the newest post is the first titled item on the archive and home (date ties allowed). `hiddenFromHomePage` excludes only home entries, not archive entries. |
| `test_site_contracts.py` | Every built GIF hero offers a still as the first native picture source for reduced motion, and the referenced image has one frame. This checks the HTML contract that works without JavaScript. |
| `test_gif_heroes.py` | The real CLI creates animated WebPs for declared and conventionally named synthetic GIF heroes, then its freshness check passes. `make check` separately checks all repository GIF heroes. |
| `analytics.test.cjs` | Executes the production inline snippet and real event script with a recording gtag boundary: search/query and fragments removed, email-bearing campaigns removed, safe campaigns retained, referrers sanitized, mailto addresses omitted and outbound queries removed. |
| `tools/photo-poster/tests/test_generator.py` | Generated photo front matter, EXIF values, GPS coordinates and gallery image order, independent of whitespace and theme markup. |
| `tools/photo-poster/tests/test_paths.py` | Photo upload/media/preview/create/delete contracts and filesystem containment, with temporary files and no AI requests. |
| `tools/photo-poster/tests/payload.test.cjs` | Preview/create API payloads and failure/session behavior. |

The built-output checks use Hugo's `list published` as the publication source,
so they follow its draft, future and expiry rules and do not hardcode posts,
titles or counts. Python uses standard `unittest`, Pillow (already needed by the
photo tool) and PyYAML for real front matter parsing. JavaScript uses Node's
built-in test runner and VM, recording calls without loading Google's code or
sending analytics. That boundary does not verify Google Enhanced Measurement's
own behavior. The motion check verifies native source selection markup and the
still asset, not browser rendering or CSS animation behavior.

For a focused rerun after a build:

```sh
/tmp/bounds-contract-tests/bin/python -m unittest discover -s scripts/tests -v
PYTHON_DOTENV_DISABLED=1 OPENAI_API_KEY= /tmp/bounds-contract-tests/bin/python -m unittest discover -s tools/photo-poster/tests -v
node --test scripts/tests/analytics.test.cjs tools/photo-poster/tests/payload.test.cjs
```

Visual review remains manual when changing the theme: check responsive layouts
and light/dark modes on a preview. Screenshot matrices, fixed post selections,
lightbox navigation assertions and performance measurements are not part of the
contract suite.
