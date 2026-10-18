"""Photo generator output contracts, independent of whitespace and page layout."""
from datetime import datetime, timezone
from pathlib import Path
import re
import sys
import unittest

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from post_generator import build_markdown


class GeneratorTests(unittest.TestCase):
    def test_photo_frontmatter_exif_and_gallery(self):
        date = datetime(2026, 1, 2, 12, 30, tzinfo=timezone.utc)
        markdown = build_markdown(
            title='Photo "title"', description="  A photo caption.  ",
            tags=["photos", "travel"], category="photos", draft=False,
            exif={"camera": "Camera", "focal_length": "35 mm", "aperture": "f/4", "iso": "100",
                  "gps": {"lat": 37.25, "lon": -122.5}},
            gallery_images=["second.jpeg", "first.jpeg"], date=date)
        _, frontmatter, body = markdown.split("---", 2)
        fm = yaml.safe_load(frontmatter)
        self.assertEqual(fm["title"], 'Photo "title"')
        self.assertEqual(fm["description"], "A photo caption.")
        self.assertEqual(fm["date"], date)
        self.assertIs(fm["draft"], False)
        self.assertEqual(fm["tags"], ["photos", "travel"])
        self.assertEqual(fm["categories"], ["photos"])
        self.assertEqual({r["name"]: r["src"] for r in fm["resources"]}, {
            "featured-image": "featured-image.jpeg", "featured-image-preview": "featured-image-preview.jpeg"})
        self.assertTrue(fm.get("featuredImageAlt") or fm["description"])
        rows = [[c.strip() for c in line.strip("|").split("|")]
                for line in body.splitlines() if line.startswith("|")]
        self.assertEqual(rows[0], ["Attribute", "Value"])
        self.assertEqual(dict(rows[2:]), {"Camera": "Camera", "Focal Length": "35 mm", "Aperture": "f/4", "ISO": "100"})
        self.assertEqual(re.findall(r"!\[.*?\]\((.*?)\)", body), ["gallery/second.jpeg", "gallery/first.jpeg"])
        self.assertIn("lng=-122.500000 lat=37.250000", body)


if __name__ == "__main__":
    unittest.main()
