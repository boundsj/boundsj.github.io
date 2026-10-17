"""Build tiny sites on the real templates. Missing content (description, hero alt, a card for a
GIF/SVG hero) only warns, even in production; broken references fail production builds and only
warn in development; a post without `images` gets a framed 1200×627 card from its hero."""

import re
import shutil
import struct
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JPEG_HERO = ROOT / "content/posts/hermit-crab/featured-image-preview.jpeg"
GIF_HERO = ROOT / "content/posts/rescue82-making-a-choplifter-style-game-for-apple-vision-pro/preview.gif"
CACHE = Path(tempfile.gettempdir()) / "bounds-post-checks-cache"


def site(posts):
    """A temp site that links the real layouts, theme, assets and config, with the given posts."""
    source = Path(tempfile.mkdtemp(prefix="bounds-post-checks-"))
    for name in ("layouts", "themes", "assets", "static", "archetypes", "config.toml"):
        (source / name).symlink_to(ROOT / name)
    for slug, (front_matter, files) in posts.items():
        bundle = source / "content/posts" / slug
        bundle.mkdir(parents=True)
        (bundle / "index.md").write_text(f"---\n{front_matter}\n---\nA caption.\n<!--more-->\nBody text.\n")
        for name, src in files:
            shutil.copyfile(src, bundle / name)
    return source


def build(source, environment="production"):
    out = source / "public"
    result = subprocess.run(
        ["hugo", "--source", str(source), "--destination", str(out), "--environment", environment,
         "--cacheDir", str(CACHE), "--cleanDestinationDir"],
        capture_output=True, text=True)
    return result, out


VALID = '''title: "Valid post"
date: 2026-10-01T10:00:00-07:00
description: "A valid post."
tags: ["test"]
categories: ["dev"]
resources:
  - name: featured-image
    src: hero.jpeg
featuredImageAlt: "A hermit crab in a tide pool."'''


class PostCheckTests(unittest.TestCase):
    def tearDown(self):
        shutil.rmtree(self.source, ignore_errors=True)

    def test_valid_post_builds_and_gets_a_framed_social_card(self):
        self.source = site({"valid": (VALID, [("hero.jpeg", JPEG_HERO)])})
        result, out = build(self.source)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertNotIn("[post-check]", result.stdout + result.stderr)
        html = (out / "posts/valid/index.html").read_text()
        card = re.search(r'og:image" content="https://www.bounds.dev(/posts/valid/[^"]+\.jpe?g)"', html).group(1)
        data = (out / card.lstrip("/")).read_bytes()
        i = 2
        while data[i + 1] not in (0xC0, 0xC2):
            i += 2 + struct.unpack(">H", data[i + 2:i + 4])[0]
        height, width = struct.unpack(">HH", data[i + 5:i + 9])
        self.assertEqual((width, height), (1200, 627))
        self.assertIn('og:image:width" content="1200"', html)

    def test_missing_content_only_warns_even_in_production(self):
        incomplete = VALID.replace('description: "A valid post."\n', "").replace('featuredImageAlt: "A hermit crab in a tide pool."', "")
        self.source = site({"incomplete": (incomplete, [("hero.jpeg", JPEG_HERO)])})
        result, out = build(self.source)
        log = result.stdout + result.stderr
        self.assertEqual(result.returncode, 0, log)
        for message in ("no `description`", "has no `featuredImageAlt`"):
            self.assertIn(message, log)
        self.assertNotIn("ERROR", log)
        self.assertTrue((out / "posts/incomplete/index.html").exists())

    def test_gif_hero_without_card_or_webp_only_warns(self):
        gif_post = VALID.replace("src: hero.jpeg", "src: hero.gif")
        self.source = site({"gif": (gif_post, [("hero.gif", GIF_HERO)])})
        result, out = build(self.source)
        log = result.stdout + result.stderr
        self.assertEqual(result.returncode, 0, log)
        self.assertIn("can't be framed into a social card", log)
        self.assertIn("GIF hero has no hero.webp yet", log)
        self.assertIn('og:image" content="https://www.bounds.dev/social-default.png"', (out / "posts/gif/index.html").read_text())

    def test_broken_references_fail_production_but_only_warn_in_development(self):
        broken = VALID.replace("src: hero.jpeg", "src: hero.jpeg\n  - name: diagram\n    src: missing-diagram.png") + '\nimages: ["missing-card.png"]'
        self.source = site({"broken": (broken, [("hero.jpeg", JPEG_HERO)])})
        result, _ = build(self.source)
        log = result.stdout + result.stderr
        self.assertNotEqual(result.returncode, 0)
        for message in ('`resources` names "missing-diagram.png"', '`images` names "missing-card.png"'):
            self.assertIn(message, log)
        dev, _ = build(self.source, "development")
        self.assertEqual(dev.returncode, 0, dev.stdout + dev.stderr)
        self.assertIn("(fails a production build)", dev.stdout + dev.stderr)

    def test_gif_social_card_fails_production(self):
        self.source = site({"gif-card": (VALID + '\nimages: ["card.gif"]', [("hero.jpeg", JPEG_HERO), ("card.gif", GIF_HERO)])})
        result, _ = build(self.source)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('social card "card.gif" is gif', result.stdout + result.stderr)

if __name__ == "__main__":
    unittest.main()
