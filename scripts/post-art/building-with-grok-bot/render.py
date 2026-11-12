"""Rasterize SVG files through Chrome as an <img> (the same way the post shows them).

usage: render.py OUT_DIR file.svg [file.svg ...] [--scale 1]
"""
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

args = sys.argv[1:]
scale = 1.0
if "--scale" in args:
    i = args.index("--scale")
    scale = float(args[i + 1])
    del args[i:i + 2]
out = Path(args[0])
files = [Path(a).resolve() for a in args[1:]]
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    for f in files:
        head = f.read_text()[:400]
        w, h = map(float, re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', head).groups())
        pg = b.new_page(viewport={"width": int(w), "height": int(h)}, device_scale_factor=scale)
        pg.goto(f.as_uri().rsplit("/", 1)[0] + "/")  # same-dir origin
        pg.set_content(f'<html><body style="margin:0;background:#000"><img src="{f.as_uri()}" '
                       f'style="display:block;width:{w}px;height:{h}px"></body></html>')
        pg.wait_for_function("document.images[0].complete && document.images[0].naturalWidth > 0")
        pg.wait_for_timeout(150)
        dest = out / (f.stem + ".png")
        pg.screenshot(path=str(dest), clip={"x": 0, "y": 0, "width": w, "height": h})
        print(dest)
        pg.close()
    b.close()
