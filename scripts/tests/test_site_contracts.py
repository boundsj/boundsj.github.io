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
        self.uses, self.header_buttons, self.scripts, self.game_srcs, self.stylesheets = [], [], [], [], []
        self.main = self.heading = self.header = False
        self.picture = None
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "main":
            self.main = True
        if tag == "header":
            self.header = True
        if tag == "button" and self.header:
            self.header_buttons.append(a)
        if tag == "script" and a.get("src"):
            self.scripts.append(urlsplit(a["src"]).path)
        if tag == "link" and a.get("rel") == "stylesheet":
            self.stylesheets.append(urlsplit(a.get("href", "")).path)
        if a.get("data-game-src"):
            self.game_srcs.append(urlsplit(a["data-game-src"]).path)
        if tag == "use":
            self.uses.append(a.get("href", ""))
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
        if tag == "header":
            self.header = False
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
                    # Native picture selection uses the first matching source, even without JS, so every
                    # reduced-motion still (an optional phone still, then one for all widths) comes first.
                    stills = []
                    for tag, a in picture:
                        if tag != "source" or "prefers-reduced-motion: reduce" not in a.get("media", ""):
                            break
                        stills.append(a)
                    self.assertTrue(stills, "first picture source must be a reduced-motion still")
                    self.assertEqual(stills[-1].get("media"), "(prefers-reduced-motion: reduce)")
                    self.assertFalse(any("prefers-reduced-motion" in a.get("media", "")
                                         for _, a in picture[len(stills):]))
                    for still in stills:
                        url = urlsplit(still["srcset"]).path
                        target = (PUBLIC / unquote(url).lstrip("/") if url.startswith("/")
                                  else path.parent / unquote(url))
                        with Image.open(target) as image:
                            self.assertEqual(getattr(image, "n_frames", 1), 1)
        self.assertGreater(checked, 0, "No animated heroes exercised")

    def test_every_page_offers_the_three_way_theme_control_in_the_header(self):
        for path in PUBLIC.rglob("*.html"):
            page = Page(path)
            if not page.meta.get("viewport"):
                continue  # alias redirects
            with self.subTest(page=str(path.relative_to(PUBLIC))):
                modes = [b.get("data-theme-mode") for b in page.header_buttons if b.get("data-theme-mode")]
                self.assertEqual(modes, ["light", "dark", "arcade"])
                for b in page.header_buttons:
                    if b.get("data-theme-mode"):
                        self.assertEqual(b.get("type"), "button")
                        self.assertIn(b.get("aria-pressed"), ("true", "false"))
                        self.assertTrue(b.get("aria-label"))

    def test_arcade_files_load_only_for_the_arcade_theme(self):
        """Light/dark markup never links the arcade stylesheet, script, sprites or display font;
        only /arcade/ (whose cabinet is arcade-styled in every theme) links its cabinet sheet and
        shows sprites. The arcade theme's own files are named for the pre-paint script only."""
        checked = 0
        for path in PUBLIC.rglob("*.html"):
            page = Page(path)
            if not page.meta.get("viewport"):
                continue
            arcade_page = path == PUBLIC / "arcade/index.html"
            with self.subTest(page=str(path.relative_to(PUBLIC))):
                self.assertFalse([s for s in page.scripts if "/js/arcade" in s or "/js/fx" in s])
                sheets = [s for s in page.stylesheets if "arcade" in s]
                self.assertEqual(sheets and [s.split("/")[-1].split(".")[0] for s in sheets],
                                 ["arcade-cabinet"] if arcade_page else [])
                if not arcade_page:
                    self.assertFalse(page.uses, "sprites appear only on /arcade/ (and from arcade JS)")
                checked += 1
        self.assertGreater(checked, 0)

    def test_sprite_sheet_is_fresh_and_every_used_sprite_exists(self):
        subprocess.run(["node", "scripts/sprites.mjs", "--check"], cwd=ROOT, check=True, capture_output=True)
        ids, checked = {}, 0
        for path in PUBLIC.rglob("*.html"):
            for href in Page(path).uses:
                if "#" not in href:
                    continue
                url, frag = href.split("#", 1)
                if url not in ids:
                    sheet = PUBLIC / unquote(urlsplit(url).path).lstrip("/")
                    self.assertTrue(sheet.is_file(), f"{path}: missing sheet {url}")
                    ids[url] = set(re.findall(r'<symbol id="([^"]+)"', sheet.read_text()))
                self.assertIn(frag, ids[url], f"{path}: {href}")
                checked += 1
        self.assertGreater(checked, 0, "No sprites referenced")
        self.assertEqual(len(ids), 1, "Pages should share one fingerprinted sheet")
        # The arcade theme's script builds sprites from the same sheet (named in its config).
        config = next(PUBLIC.glob("js/arcade.min.*.js")).read_text()
        self.assertIn(next(iter(ids)), config)

    def test_games_load_lazily_and_never_through_script_src(self):
        games = set()
        for path in PUBLIC.rglob("*.html"):
            page = Page(path)
            with self.subTest(page=str(path.relative_to(PUBLIC))):
                self.assertFalse([src for src in page.scripts if "/js/games/" in src],
                                 "games load on demand from data-game-src, never <script src>")
                for src in page.game_srcs:
                    self.assertIn("/js/games/", src)
                    self.assertTrue((PUBLIC / unquote(src).lstrip("/")).is_file(), src)
                    games.add(src)
        self.assertTrue(games, "No lazy game found")
        arcade = Page(PUBLIC / "arcade/index.html")
        self.assertTrue(arcade.game_srcs, "/arcade/ has a game")
        self.assertTrue(arcade.meta.get("description"))
        self.assertTrue(arcade.meta.get("og:title"))

    def test_arcade_is_not_a_post_and_stays_out_of_feeds_and_listings(self):
        self.assertNotIn("/arcade/", {p["url"] for p in self.posts})
        self.assertFalse((PUBLIC / "arcade/index.xml").exists(), "/arcade/ has no feed")
        feeds = list(PUBLIC.rglob("index.xml"))
        self.assertTrue(feeds)
        for feed in feeds:
            with self.subTest(feed=str(feed.relative_to(PUBLIC))):
                self.assertNotIn("/arcade/", feed.read_text())
        listings = [PUBLIC / "index.html"] + [
            p for d in ("posts", "writing", "photos", "tags", "categories") for p in (PUBLIC / d).rglob("index.html")]
        for path in listings:
            page = Page(path)
            with self.subTest(page=str(path.relative_to(PUBLIC))):
                self.assertNotIn("/arcade/", page.headings, "/arcade/ is never listed as an entry")
                if path != PUBLIC / "index.html":  # home links to it from the hero only
                    self.assertNotIn("/arcade/", page.links)
        self.assertIn("/arcade/</loc>", (PUBLIC / "sitemap.xml").read_text())


if __name__ == "__main__":
    unittest.main()
