"""Exercise make check's exit-status contract on isolated sites with the real templates."""
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class PostCheckTests(unittest.TestCase):
    def check_site(self, frontmatter):
        with tempfile.TemporaryDirectory(prefix="bounds-post-contract-") as directory:
            source = Path(directory)
            for name in ("layouts", "themes", "assets", "static", "config.toml", "Makefile"):
                (source / name).symlink_to(ROOT / name)
            scripts = source / "scripts"
            scripts.mkdir()
            for name in ("check-private-hosts.sh", "gif-heroes.py"):
                shutil.copyfile(ROOT / "scripts" / name, scripts / name)
                (scripts / name).chmod(0o755)
            bundle = source / "content/posts/probe"
            bundle.mkdir(parents=True)
            (bundle / "hero.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')
            (bundle / "index.md").write_text(f"---\n{frontmatter}\n---\nA post.\n")
            subprocess.run(["git", "init", "--quiet", str(source)], check=True)
            subprocess.run(["git", "add", "."], cwd=source, check=True)
            return subprocess.run(["make", "check"], cwd=source, text=True, capture_output=True)

    def test_missing_description_alt_and_social_card_only_warn(self):
        result = self.check_site('''title: Probe
date: 2026-01-01T12:00:00Z
categories: [dev]
tags: [test]
resources:
- name: featured-image
  src: hero.svg''')
        log = result.stdout + result.stderr
        self.assertEqual(result.returncode, 0, log)
        for warning in ("no `description`", "has no `featuredImageAlt`", "can't be framed into a social card"):
            self.assertIn(warning, log)
        self.assertIn("All checks passed", log)

    def test_broken_resource_and_image_references_fail(self):
        # Each reference must fail on its own; one error cannot mask the other.
        for reference in ('resources: [{name: featured-image, src: missing.png}]',
                          'images: [missing.png]'):
            with self.subTest(reference=reference):
                result = self.check_site(f'''title: Probe
date: 2026-01-01T12:00:00Z
categories: [dev]
{reference}''')
                self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
                self.assertIn('but the bundle has no such file', result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
