"""The real build command creates a WebP for each discovered GIF hero."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts/gif-heroes.py"
spec = importlib.util.spec_from_file_location("gif_heroes", SCRIPT)
gh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gh)


class GifHeroTests(unittest.TestCase):
    def test_build_creates_webps_for_all_gif_heroes(self):
        with tempfile.TemporaryDirectory(prefix="bounds-gif-contract-") as directory:
            root = Path(directory)
            # Declared and conventional names are both supported by the build API.
            for slug, filename in (("declared", "hero.gif"), ("conventional", "featured-image.gif")):
                bundle = root / "content/posts" / slug
                bundle.mkdir(parents=True)
                resource = f"resources:\n- name: featured-image\n  src: {filename}\n" if slug == "declared" else ""
                (bundle / "index.md").write_text(f"---\ntitle: {slug}\n{resource}---\nBody.\n")
                Image.new("RGB", (8, 8), "red").save(bundle / filename, save_all=True,
                    append_images=[Image.new("RGB", (8, 8), "blue")], duration=100, loop=0)
            args = ["--content", str(root / "content"), "--lock", str(root / "heroes.lock")]
            result = subprocess.run(["python3", str(SCRIPT), "build", *args], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            heroes = gh.gif_heroes(root / "content")
            self.assertEqual(len(heroes), 2)
            for gif in heroes:
                with Image.open(gif.with_suffix(".webp")) as image:
                    self.assertEqual(image.format, "WEBP")
                    self.assertGreater(image.n_frames, 1)
            subprocess.run(["python3", str(SCRIPT), "check", *args], check=True, capture_output=True)


if __name__ == "__main__":
    unittest.main()
