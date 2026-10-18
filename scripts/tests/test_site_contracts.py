"""Contracts over production public/ output; no server or browser required."""
import csv
from datetime import datetime
from html.parser import HTMLParser
import io
from pathlib import Path
import re
import subprocess
import unittest
from urllib.parse import unquote, urlsplit

from PIL import Image
import yaml

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"


def frontmatter(path):
    text = path.read_text()
    _, fm, body = re.split(r"^---\s*$", text, maxsplit=2, flags=re.M)
    return yaml.safe_load(fm), body


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.meta, self.links, self.headings, self.pictures, self.images = {}, [], [], [], []
        self.main = self.heading = False
        self.picture = None
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "main":
            self.main = True
        if tag in ("h1", "h2", "h3"):
            self.heading = True
        if tag == "meta":
            self.meta[a.get("property", a.get("name"))] = a.get("content", "")
        if tag == "a" and self.main:
            href = urlsplit(a.get("href", "")).path
            self.links.append(href)
            if self.heading:
                self.headings.append(href)
        if tag == "img":
            self.images.append(a)
        if tag == "picture":
            self.picture = []
        if tag in ("source", "img") and self.picture is not None:
            self.picture.append((tag, a))

    def handle_endtag(self, tag):
        if tag == "main":
            self.main = False
        if tag in ("h1", "h2", "h3"):
            self.heading = False
        if tag == "picture" and self.picture is not None:
            self.pictures.append(self.picture)
            self.picture = None


class SiteContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not (PUBLIC / "index.html").exists():
            raise RuntimeError("Build first: hugo --cleanDestinationDir")
        result = subprocess.run(["hugo", "list", "published"], cwd=ROOT,
                                check=True, capture_output=True, text=True)
        cls.posts = []
        for row in csv.DictReader(io.StringIO(result.stdout)):
            if row["section"] == "posts" and row["kind"] == "page":
                row["url"] = urlsplit(row["permalink"]).path
                row["fm"], row["body"] = frontmatter(ROOT / row["path"])
                cls.posts.append(row)
        assert cls.posts, "No published posts found"

    def test_social_metadata_on_every_published_post(self):
        for post in self.posts:
            with self.subTest(post=post["path"]):
                page = Page(PUBLIC / post["url"].lstrip("/") / "index.html")
                for prefix in ("og", "twitter"):
                    for field in ("title", "description", "image"):
                        self.assertTrue(page.meta.get(f"{prefix}:{field}"), f"{prefix}:{field}")
                    image = urlsplit(page.meta[f"{prefix}:image"])
                    self.assertIn(image.scheme, ("http", "https"))
                    if image.netloc == urlsplit(post["permalink"]).netloc:
                        self.assertTrue((PUBLIC / unquote(image.path).lstrip("/")).is_file(), image.path)

    def test_photo_frontmatter_and_optional_exif_table(self):
        photos = [p for p in self.posts if "photos" in p["fm"].get("categories", [])]
        self.assertTrue(photos)
        for post in photos:
            with self.subTest(post=post["path"]):
                fm = post["fm"]
                for key in ("title", "description"):
                    self.assertIsInstance(fm[key], str)
                    self.assertTrue(fm[key].strip())
                self.assertIsInstance(fm["date"], datetime)
                self.assertIsNotNone(fm["date"].tzinfo)
                self.assertIs(fm["draft"], False)
                self.assertIsInstance(fm["tags"], list)
                self.assertTrue(fm["tags"])
                self.assertTrue(all(isinstance(tag, str) and tag for tag in fm["tags"]))
                self.assertIsInstance(fm["categories"], list)
                self.assertIn("photos", fm["categories"])
                resources = {r["name"]: r["src"] for r in fm["resources"]}
                self.assertIn("featured-image", resources)
                self.assertTrue((ROOT / post["path"]).parent.joinpath(resources["featured-image"]).is_file())
                # Photo captions supply alt text when no explicit hero alt is set.
                self.assertTrue(fm.get("featuredImageAlt") or fm["description"])
                rows = [[c.strip() for c in line.strip().strip("|").split("|")]
                        for line in post["body"].splitlines() if line.lstrip().startswith("|")]
                if rows:
                    self.assertEqual(rows[0], ["Attribute", "Value"])
                    self.assertEqual(len(rows[1]), 2)
                    self.assertTrue(all(re.fullmatch(r":?-+:?", c.replace(" ", "")) for c in rows[1]))
                    values = dict(rows[2:])
                    self.assertIn("Camera", values)
                    self.assertTrue(set(values) <= {"Camera", "Focal Length", "Aperture", "ISO"})
                    self.assertTrue(all(values.values()))

    def test_archive_contains_all_posts_and_latest_is_first(self):
        # hiddenFromHomePage only hides posts on home; /posts/ includes them.
        expected = {p["url"] for p in self.posts}
        archive = Page(PUBLIC / "posts/index.html")
        pages = [archive] + [Page(p) for p in sorted((PUBLIC / "posts/page").glob("*/index.html"))]
        listed = {href for page in pages for href in page.links if href in expected}
        self.assertEqual(listed, expected)
        latest_date = max(datetime.fromisoformat(p["date"]) for p in self.posts)
        latest = {p["url"] for p in self.posts if datetime.fromisoformat(p["date"]) == latest_date}
        self.assertIn(next(h for h in archive.headings if h in expected), latest)
        home_posts = [p for p in self.posts if not p["fm"].get("hiddenFromHomePage", False)]
        newest = max(datetime.fromisoformat(p["date"]) for p in home_posts)
        home_latest = {p["url"] for p in home_posts if datetime.fromisoformat(p["date"]) == newest}
        home = Page(PUBLIC / "index.html")
        self.assertIn(next(h for h in home.headings if h in expected), home_latest)

    def test_animated_heroes_have_native_reduced_motion_stills(self):
        checked = 0
        hero_urls = set()
        for post in self.posts:
            for resource in post["fm"].get("resources", []):
                if resource.get("name") == "featured-image" and resource.get("src", "").endswith(".gif"):
                    url = post["url"] + resource["src"]
                    hero_urls.add(url)
                    page = Page(PUBLIC / post["url"].lstrip("/") / "index.html")
                    self.assertTrue(any(urlsplit(a.get("src", "")).path == url
                                        for a in page.images), post["path"])
        for path in PUBLIC.rglob("*.html"):
            page = Page(path)
            for image in page.images:
                if urlsplit(image.get("src", "")).path in hero_urls:
                    self.assertTrue(any(("img", image) in picture for picture in page.pictures),
                                    f"{path}: animated image needs a native still alternative")
            for picture in page.pictures:
                animated = [a for tag, a in picture if tag == "img" and urlsplit(a.get("src", "")).path in hero_urls]
                if not animated:
                    continue
                checked += 1
                with self.subTest(page=str(path.relative_to(PUBLIC))):
                    # Native picture selection uses the first matching source, even without JS.
                    tag, still = picture[0]
                    self.assertEqual(tag, "source")
                    self.assertEqual(still.get("media"), "(prefers-reduced-motion: reduce)")
                    url = urlsplit(still["srcset"]).path
                    target = PUBLIC / unquote(url).lstrip("/") if url.startswith("/") else path.parent / unquote(url)
                    with Image.open(target) as image:
                        self.assertEqual(getattr(image, "n_frames", 1), 1)
        self.assertGreater(checked, 0, "No animated heroes exercised")


if __name__ == "__main__":
    unittest.main()
