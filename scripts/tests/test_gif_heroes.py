"""GIF-hero WebP automation: discovery, freshness checks, animation facts, and a real encode."""

import importlib.util
import io
import os
import shutil
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("gif_heroes", ROOT / "scripts/gif-heroes.py")
gh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gh)

POSTS = ROOT / "content/posts"
NOTION = POSTS / "t3-fleet-gateway-notion-agents/notion-fleet-hero.gif"
RESCUE = POSTS / "rescue82-making-a-choplifter-style-game-for-apple-vision-pro/preview.gif"
HAVE_LIBWEBP = bool(shutil.which("gif2webp") and shutil.which("anim_diff"))


def run(*argv):
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = gh.main(list(argv))
    return code, out.getvalue() + err.getvalue()


class GifHeroTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="gif-heroes-test-"))
        self.content = self.tmp / "content"
        self.lock = self.tmp / "gif-heroes.lock"

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def bundle(self, slug, front_matter, files=()):
        d = self.content / "posts" / slug
        d.mkdir(parents=True)
        (d / "index.md").write_text(f"---\n{front_matter}\n---\nBody.\n")
        for name, source in files:
            shutil.copyfile(source, d / name)
        return d

    def test_discovers_declared_and_conventional_gif_heroes_only(self):
        self.bundle("declared", 'title: "a"\nresources:\n  - name: featured-image\n    src: hero.gif', [("hero.gif", RESCUE)])
        self.bundle("src-first", 'title: "b"\nresources:\n- src: "anim.gif"\n  name: "featured-image"\n- name: other\n  src: x.png', [("anim.gif", RESCUE)])
        self.bundle("by-name", 'title: "c"', [("featured-image.gif", RESCUE)])
        self.bundle("png-hero", 'title: "d"\nresources:\n  - name: featured-image\n    src: hero.png')
        self.bundle("gif-not-hero", 'title: "e"\nresources:\n  - name: diagram\n    src: loop.gif', [("loop.gif", RESCUE)])
        found = sorted(p.relative_to(self.content).as_posix() for p in gh.gif_heroes(self.content))
        self.assertEqual(found, ["posts/by-name/featured-image.gif", "posts/declared/hero.gif", "posts/src-first/anim.gif"])

    def test_check_reports_missing_then_fresh_then_stale(self):
        d = self.bundle("p", 'title: "p"\nresources:\n  - name: featured-image\n    src: hero.gif', [("hero.gif", RESCUE)])
        code, out = run("check", "--content", str(self.content), "--lock", str(self.lock))
        self.assertEqual(code, 1)
        self.assertIn("missing WebP", out)
        # A WebP plus a matching lock entry is fresh.
        shutil.copyfile(RESCUE.with_suffix(".webp"), d / "hero.webp")
        gh.write_lock(self.lock, {"content/posts/p/hero.gif": (gh.sha256(d / "hero.gif"), "mixed", gh.sha256(d / "hero.webp"))})
        self.assertEqual(run("check", "--content", str(self.content), "--lock", str(self.lock))[0], 0)
        # Replacing the GIF (even with the same name) makes the WebP stale.
        with open(d / "hero.gif", "ab") as f:
            f.write(b"\0")
        code, out = run("check", "--content", str(self.content), "--lock", str(self.lock), "--ci")
        self.assertEqual(code, 1)
        self.assertIn("::warning file=content/posts/p/hero.gif::", out)
        self.assertIn("stale WebP", out)

    def test_repo_lock_is_fresh(self):
        self.assertEqual(run("check")[0], 0)

    def test_animation_facts_match_for_committed_webps(self):
        g = gh.gif_facts(NOTION)
        self.assertEqual((g["size"], g["frames"], g["duration_ms"], g["loops_forever"]), ((1200, 627), 180, 15000, True))
        self.assertTrue(gh.gif_facts(RESCUE)["plays_once"])  # no NETSCAPE block
        for gif in gh.gif_heroes(ROOT / "content"):
            self.assertIsNone(gh.same_animation(gif, gif.with_suffix(".webp")), gif.name)

    def test_build_without_libwebp_warns_or_fails_clearly(self):
        self.bundle("p", 'title: "p"\nresources:\n  - name: featured-image\n    src: hero.gif', [("hero.gif", RESCUE)])
        path = os.environ["PATH"]
        os.environ["PATH"] = str(self.tmp)  # no gif2webp anywhere
        try:
            code, out = run("build", "--content", str(self.content), "--lock", str(self.lock), "--if-available")
            self.assertEqual(code, 0)
            self.assertIn("brew install webp", out)
            self.assertEqual(run("build", "--content", str(self.content), "--lock", str(self.lock))[0], 2)
        finally:
            os.environ["PATH"] = path

    @unittest.skipUnless(HAVE_LIBWEBP, "gif2webp and anim_diff (libwebp) not installed")
    def test_build_encodes_verifies_and_locks(self):
        d = self.bundle("p", 'title: "p"\nresources:\n  - name: featured-image\n    src: hero.gif', [("hero.gif", RESCUE)])
        code, out = run("build", "--content", str(self.content), "--lock", str(self.lock))
        self.assertEqual(code, 0, out)
        webp = d / "hero.webp"
        self.assertTrue(webp.exists())
        self.assertLess(webp.stat().st_size, (d / "hero.gif").stat().st_size)
        self.assertIsNone(gh.same_animation(d / "hero.gif", webp))
        self.assertTrue(gh.webp_facts(webp)["plays_once"])
        self.assertEqual(run("check", "--content", str(self.content), "--lock", str(self.lock))[0], 0)
        # Nothing to do the second time.
        code, out = run("build", "--content", str(self.content), "--lock", str(self.lock))
        self.assertEqual(code, 0)
        self.assertIn("all with fresh WebPs", out)


if __name__ == "__main__":
    unittest.main()
