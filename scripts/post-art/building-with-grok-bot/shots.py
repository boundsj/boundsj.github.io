import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:1314/bounds-preview/posts/building-with-grok-bot/"
out = Path(sys.argv[1])
out.mkdir(exist_ok=True)
cases = [
    ("desktop-light", 1280, 900, "light", "no-preference", False),
    ("desktop-dark", 1280, 900, "dark", "no-preference", False),
    ("desktop-amber", 1280, 900, "amber", "no-preference", False),
    ("tablet-green", 820, 1100, "green", "no-preference", False),
    ("phone-light", 390, 844, "light", "no-preference", True),
    ("phone-dark", 390, 844, "dark", "reduce", True),
]
report = {}
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    for name, w, h, theme, motion, mobile in cases:
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if mobile else 1,
                            is_mobile=mobile, has_touch=mobile, reduced_motion=motion)
        ctx.add_init_script(f"try{{localStorage.setItem('bounds-crt','{theme}')}}catch(e){{}}")
        pg = ctx.new_page()
        errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.on("requestfailed", lambda r: errs.append("FAILED " + r.url))
        pg.goto(URL, wait_until="networkidle")
        pg.wait_for_timeout(400)
        info = pg.evaluate("""() => {
          const imgs=[...document.querySelectorAll('.post-content figure img, .kc-hero img')];
          return {
            theme: document.documentElement.dataset.theme,
            scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
            hero: document.querySelector('.kc-hero img').currentSrc.split('/').pop(),
            figs: imgs.map(i => ({src: i.currentSrc.split('/').pop(), w: Math.round(i.getBoundingClientRect().width),
                                  left: Math.round(i.getBoundingClientRect().left), ok: i.complete && i.naturalWidth>0})),
            content: Math.round(document.querySelector('.post-content').getBoundingClientRect().width),
          }}""")
        info["errors"] = errs
        report[name] = info
        pg.screenshot(path=str(out / f"{name}-top.png"))
        for i, sel in enumerate([".post-content figure:nth-of-type(1)", ".post-content figure:nth-of-type(2)",
                                 ".post-content figure:nth-of-type(3)"]):
            el = pg.locator(".post-content figure").nth(i)
            el.scroll_into_view_if_needed()
            pg.wait_for_timeout(150)
            el.screenshot(path=str(out / f"{name}-fig{i + 1}.png"))
        ctx.close()
    b.close()
print(json.dumps(report, indent=1))
