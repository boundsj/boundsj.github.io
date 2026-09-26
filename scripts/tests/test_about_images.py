"""Check the About image render hook with real Hugo page resources."""

import base64
from html.parser import HTMLParser
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[2]
HOOKS = ROOT / "layouts/about/_markup"
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6ioAAAAASUVORK5CYII="
)


class Images(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []

    def handle_starttag(self, tag, attrs):
        if tag == "img":
            self.images.append(dict(attrs))


class AboutImageTests(unittest.TestCase):
    def test_only_about_featured_duplicate_is_omitted(self):
        with tempfile.TemporaryDirectory(prefix="bounds-about-images-") as directory:
            source = Path(directory)
            layouts = source / "layouts/_default"
            layouts.mkdir(parents=True)
            (layouts / "single.html").write_text("{{ .Content }}")
            (layouts / "list.html").write_text("{{ .Title }}")
            (source / "config.toml").write_text('baseURL = "https://example.invalid/"\n')
            if HOOKS.exists():
                shutil.copytree(HOOKS, source / "layouts/about/_markup")
            for route in ("about", "posts/probe"):
                bundle = source / "content" / route
                bundle.mkdir(parents=True)
                (bundle / "portrait.png").write_bytes(PNG)
                (bundle / "other.png").write_bytes(PNG)
                (bundle / "index.md").write_text(
                    '+++\ntitle = "Fixture"\n'
                    '[[resources]]\nname = "featured-image"\nsrc = "portrait.png"\n'
                    '+++\nLead text.\n\n![Portrait](portrait.png)\n\n'
                    f'![Portrait again](/{route}/portrait.png)\n\n'
                    '![Other **alt**](other.png "Other title")\n\nTail text.\n'
                )
            output = source / "rendered"
            command = ["hugo", "--source", str(source), "--destination", str(output),
                       "--cacheDir", str(source / "cache"), "--cleanDestinationDir"]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            about = (output / "about/index.html").read_text()
            feed = ET.parse(output / "index.xml")
            description = next(
                item.findtext("description") for item in feed.findall("./channel/item")
                if item.findtext("link").endswith("/about/")
            )
            feed_images = Images()
            feed_images.feed(description)
            self.assertEqual([image["src"] for image in feed_images.images],
                             ["portrait.png", "https://example.invalid/about/portrait.png", "other.png"])
            rendered_feed = (output / "index.xml").read_bytes()
            parsed = Images()
            parsed.feed(about)
            self.assertEqual(parsed.images, [{"src": "other.png", "alt": "Other alt", "title": "Other title"}])
            self.assertIn("Lead text.", about)
            self.assertIn("Tail text.", about)
            self.assertEqual(about.count("<p></p>"), 2)
            ordinary = Images()
            ordinary.feed((output / "posts/probe/index.html").read_text())
            self.assertEqual(len(ordinary.images), 3)
            # Compare the whole feed against Hugo's default image rendering.
            shutil.rmtree(source / "layouts/about/_markup")
            baseline = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(baseline.returncode, 0, baseline.stdout + baseline.stderr)
            self.assertEqual((output / "index.xml").read_bytes(), rendered_feed)


if __name__ == "__main__":
    unittest.main()
