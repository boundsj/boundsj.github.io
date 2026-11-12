"""Social card, 1200x627: the title at feed size, plus the delegated chain as big simple shapes."""
import sys
from pathlib import Path

from lib import *  # noqa: F401,F403
from lib import Svg, bot_face, human, measure, screen, status_glyph

W, H = 1200, 627
s = Svg(W, H)
screen(s)
m = 56
s.text(m, 52, "T3 CODE · FLEET GATEWAY · BOTONS", size=18, weight=700, fill=FG3, ls=0.12)
s.text(W - m, 52, "bounds.dev", size=20, fill=FG3, anchor="end")
s.line(m, 72, W - m, 72, stroke=DIM, sw=2)

# The title, "Building with Grok Bot in the Outer Loop", on two lines broken at the phrase, so both
# halves stay big at feed size; the terminal cursor ends the second line.
TITLE = ("Building with Grok Bot", "in the Outer Loop")
TS, LS = 80, -0.01
assert max(measure(t, TS, 700, LS) for t in TITLE) < W - 2 * m - 70, "title would clip"
s.text(m, 162, TITLE[0], size=TS, weight=700, fill=FG1, ls=LS)
s.text(m, 248, TITLE[1], size=TS, weight=700, fill=FG1, ls=LS)
tw = measure(TITLE[1], TS, 700, LS)
s.rect(m + tw + 14, 248 - 13, 46, 13, fill=GREEN)
s.text(m, 300, "From juggling agent threads to directing a team of project bots", size=26, fill=FG2)

# chain: me -> grok bot -> gateway -> machines
y0, h = 356, 150
cy = y0 + h / 2
human(s, m + 66, y0 + 22, scale=1.25)
s.text(m + 66, y0 + 142, "ME", size=26, weight=700, fill=FG1, anchor="middle", ls=0.12)
bx, bw = 250, 250
s.line(m + 140, cy, bx, cy, stroke=FG1, sw=4)
s.rect(bx, y0 + 10, bw, h - 20, fill=PANEL, stroke=FG1, sw=4)
bot_face(s, bx + bw / 2, y0 + 58, 44)
s.text(bx + bw / 2, y0 + 112, "GROK BOT", size=24, weight=700, fill=FG1, anchor="middle", ls=0.14)
gx, gw = 570, 64
s.line(bx + bw, cy, gx, cy, stroke=FG2, sw=4)
s.rect(gx, y0 - 6, gw, h + 12, fill=SINK, stroke=FG2, sw=3)
for i, ch in enumerate("GATEWAY"):
    s.text(gx + gw / 2, y0 + 20 + i * 20, ch, size=17, weight=700, fill=FG1, anchor="middle")
mx = 700
rows = [("macOS", "ok"), ("macOS", "ok"), ("Linux", "working")]
for i, (name, kind) in enumerate(rows):
    ry = y0 - 4 + i * 54
    s.line(gx + gw, ry + 21, mx, ry + 21, stroke=FG2, sw=3)
    s.rect(mx, ry, W - m - mx, 42, fill=PANEL, stroke=GREEN if kind == "ok" else DIM, sw=3)
    status_glyph(s, mx + 10, ry + 7, 28, kind)
    s.text(mx + 54, ry + 29, name, size=22, weight=700, fill=FG1)
    s.text(W - m - 16, ry + 29, "codex · claude", size=20, fill=FG3, anchor="end")

s.line(m, 540, W - m, 540, stroke=DIM, sw=2)
s.text(m, 582, "> set direction · judge results · decide when done", size=21, fill=FG2)
s.text(W - m, 582, "ONE PROJECT <=> ONE BOT", size=17, weight=700, fill=FG3, anchor="end", ls=0.1)

out = Path(sys.argv[1])
(out / "social-card.svg").write_text(s.to_string(
    "Building with Grok Bot in the Outer Loop", "Social card: the title Building with Grok Bot in the Outer Loop "
    "over a chain from me to a Grok Bot, "
    "through a gateway, to two macOS machines and a Linux machine running Codex and Claude."))
print("ok")
