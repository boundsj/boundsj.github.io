"""Build a small site with the real post template and check its tag links."""

import html
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SINGLE = ROOT / "layouts/_default/single.html"


class TagLinkTests(unittest.TestCase):
    def test_post_tag_links_reach_pages_in_frontmatter_order_with_original_labels(self):
        with tempfile.TemporaryDirectory(prefix="bounds-tag-links-") as directory:
            source = Path(directory)
            layouts = source / "layouts/_default"
            partials = source / "layouts/partials"
            posts = source / "content/posts"
            for path in (layouts, partials, posts):
                path.mkdir(parents=True)
            (source / "config.toml").write_text(
                'baseURL = "https://example.invalid/"\n'
                '[taxonomies]\ntag = "tags"\n'
            )
            shutil.copyfile(SINGLE, layouts / "single.html")
            (layouts / "baseof.html").write_text('{{ block "main" . }}{{ end }}')
            (layouts / "list.html").write_text('{{ .Title }}')
            (partials / "featured-image.html").write_text("")
            (posts / "probe.md").write_text(
                '+++\ntitle = "Probe"\ndate = 2026-01-01\n'
                'tags = ["Art & Culture", "lowercase", "Tech & Business", "Art & Culture"]\n'
                '+++\nFixture post.\n'
            )
            output = source / "rendered"
            result = subprocess.run(
                ["hugo", "--source", str(source), "--destination", str(output),
                 "--cacheDir", str(source / "cache"), "--cleanDestinationDir"],
                capture_output=True, text=True,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            rendered = (output / "posts/probe/index.html").read_text()
            links = re.findall(r'<a class="kc-tag" href="([^"]+)">([^<]+)</a>', rendered)
            self.assertEqual(
                [(href, html.unescape(label)) for href, label in links],
                [
                    ("/tags/art--culture/", "Art & Culture"),
                    ("/tags/lowercase/", "lowercase"),
                    ("/tags/tech--business/", "Tech & Business"),
                    ("/tags/art--culture/", "Art & Culture"),
                ],
            )
            for href, _ in links:
                self.assertTrue((output / href.lstrip("/") / "index.html").is_file(), href)


if __name__ == "__main__":
    unittest.main()
