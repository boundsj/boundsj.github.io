"""Build generated gallery posts with the real Hugo templates and temp images."""

from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from post_generator import build_markdown  # noqa: E402


ROOT = Path(__file__).resolve().parents[3]
DATE = datetime(2026, 1, 2, 12, 30, tzinfo=timezone.utc)
GALLERY = ["photo-2.jpeg", "photo-1.jpeg"]
GALLERY_SIZES = {"photo-2.jpeg": (1600, 900), "photo-1.jpeg": (900, 1600)}


def build_gallery_fixture(source):
    """Create a synthetic post, copy its real layout dependencies, and run Hugo."""
    theme = source / "themes/bounds-ascii"
    for directory in ("layouts", "assets", "static"):
        shutil.copytree(ROOT / "themes/bounds-ascii" / directory, theme / directory)
    static = source / "static"
    static.mkdir()
    for name in ("favicon-32x32.png", "apple-touch-icon.png"):
        shutil.copyfile(ROOT / "static" / name, static / name)
    for name in ("_default/single.html", "partials/head.html",
                 "partials/featured-image.html", "partials/responsive-image.html"):
        target = source / "layouts" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / "layouts" / name, target)
    # The fixture exercises the post. Other page kinds need no generated content.
    (source / "layouts/index.html").write_text("{{ .Title }}")
    (source / "layouts/_default/list.html").write_text("{{ .Title }}")
    (source / "config.toml").write_text(
        'baseURL = "http://localhost:1316/"\n'
        'title = "Gallery fixture"\ntheme = "bounds-ascii"\n'
        '[params.author]\nname = "Fixture"\n'
    )
    bundle = source / "content/posts/gallery-probe"
    gallery = bundle / "gallery"
    gallery.mkdir(parents=True)
    (bundle / "index.md").write_text(build_markdown(
        title="Gallery probe", description="Synthetic gallery description.",
        tags=["photos"], category="photos", draft=False,
        exif={"camera": "Fixture camera"}, gallery_images=GALLERY, date=DATE,
    ))
    for filename, size, color in (("featured-image.jpeg", (1600, 900), (120, 80, 40)),
                                  ("featured-image-preview.jpeg", (320, 180), (120, 80, 40)),
                                  ("gallery/photo-2.jpeg", GALLERY_SIZES["photo-2.jpeg"], (40, 120, 80)),
                                  ("gallery/photo-1.jpeg", GALLERY_SIZES["photo-1.jpeg"], (80, 40, 120))):
        Image.new("RGB", size, color).save(bundle / filename, format="JPEG")
    output = source / "rendered"
    result = subprocess.run(
        ["hugo", "--source", str(source), "--destination", str(output),
         "--cacheDir", str(source / "cache"), "--cleanDestinationDir"],
        capture_output=True, text=True,
    )
    return result, output


class GalleryImages(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.images = []
        self.paragraph = 0
        self.image_paragraphs = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "img":
            src = attributes.get("src", "")
            if src.startswith("gallery/"):
                self.images.append((src, self.stack[-1]))
                self.image_paragraphs.append(self.paragraph)
        elif tag not in ("meta", "link", "br", "hr", "source", "input"):
            self.stack.append(tag)
            if tag == "p":
                self.paragraph += 1

    def handle_endtag(self, tag):
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()


class GeneratorTests(unittest.TestCase):
    def test_single_image_markdown_and_gps_remain_exact(self):
        generated = build_markdown(
            title="Single photo", description="  A photo description.  ",
            tags=["photos", "travel"], category="photos", draft=False,
            exif={"camera": "Fixture camera", "focal_length": "35 mm",
                  "aperture": "f/4", "iso": "100",
                  "gps": {"lat": 37.25, "lon": -122.5}},
            gallery_images=[], date=DATE,
        )
        self.assertEqual(generated, f'''---
title: "Single photo"
date: {DATE.astimezone().isoformat()}
draft: false
images: ["featured-image.jpeg"]
tags: ["photos", "travel"]
categories: ["photos"]
resources:
- name: featured-image
  src: featured-image.jpeg
- name: featured-image-preview
  src: featured-image-preview.jpeg
lightgallery: true
---
A photo description.
<!--more-->

| Attribute    | Value |
| ------------ | ----------- |
| Camera       | Fixture camera |
| Focal Length | 35 mm |
| Aperture     | f/4 |
| ISO          | 100 |

{{{{< mapbox lng=-122.500000 lat=37.250000 zoom=15 height=20rem width=100% >}}}}
''')

    def test_gallery_builds_with_real_layouts_and_keeps_image_order_and_targets(self):
        with tempfile.TemporaryDirectory(prefix="bounds-gallery-") as directory:
            result, output = build_gallery_fixture(Path(directory))
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            rendered = (output / "posts/gallery-probe/index.html").read_text()
            images = GalleryImages()
            images.feed(rendered)
            self.assertEqual(images.images, [(f"gallery/{name}", "p") for name in GALLERY])
            self.assertEqual(len(set(images.image_paragraphs)), len(GALLERY))
            for src, _ in images.images:
                target = output / "posts/gallery-probe" / src
                with Image.open(target) as image:
                    self.assertEqual(image.size, GALLERY_SIZES[Path(src).name])
            self.assertIn("Synthetic gallery description.", rendered)
            self.assertIn("Fixture camera", rendered)
            self.assertIn('class="kc-hero__media"', rendered)


if __name__ == "__main__":
    unittest.main()
