"""Shared SVG primitives for the 'Building with Grok Bot' post art.

Palette and type follow the bounds.dev CRT (dark) tokens and the t3-fleet-gateway hero:
near-black screen, cream ink, square corners, dotted grid, one signal colour per meaning.
  green  = handled by a bot / live
  amber  = waiting on a human
Colour is never the only cue: every state also has a word or glyph.
"""
from __future__ import annotations

import base64
import io
import math
from html import escape
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[3]
FONT_DIR = ROOT / "themes" / "bounds-ascii" / "static" / "fonts"
BUNDLE = ROOT / "content" / "posts" / "building-with-grok-bot"
FAMILY = "BGB Iosevka"

BG = "#0C0C0A"
PANEL = "#16150F"
SINK = "#211F17"
GRID = "#2A2820"
FG1 = "#ECE7D6"
FG2 = "#B7B2A1"
FG3 = "#908C7B"
FAINT = "#65625A"
DIM = "#3A382F"
GREEN = "#38E25B"
AMBER = "#FFB547"
GREEN_TINT = "#13240F"
AMBER_TINT = "#2A1F0C"

_fonts: dict[int, TTFont] = {}


def font(weight: int) -> TTFont:
    if weight not in _fonts:
        _fonts[weight] = TTFont(FONT_DIR / f"iosevka-latin-{weight}-normal.woff2")
    return _fonts[weight]


def measure(text: str, size: float, weight: int = 400, ls: float = 0.0) -> float:
    f = font(weight)
    cmap = f.getBestCmap()
    hmtx = f["hmtx"]
    upm = f["head"].unitsPerEm
    w = 0
    for ch in text:
        g = cmap.get(ord(ch))
        if g is None:
            raise ValueError(f"glyph {ch!r} missing from Iosevka subset")
        w += hmtx[g][0]
    return w / upm * size + ls * size * max(len(text) - 1, 0)


def _font_face(weight: int, chars: set[str]) -> str:
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    ft = TTFont(FONT_DIR / f"iosevka-latin-{weight}-normal.woff2", recalcTimestamp=False)
    sub = subset.Subsetter(opts)
    sub.populate(text="".join(sorted(chars)) + " ")
    sub.subset(ft)
    buf = io.BytesIO()
    ft.flavor = "woff2"
    ft.save(buf)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return (f"@font-face{{font-family:'{FAMILY}';font-weight:{weight};"
            f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}")


class Svg:
    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.parts: list[str] = []
        self.defs: list[str] = []
        self.chars: dict[int, set[str]] = {400: set(), 700: set()}

    # --- raw -----------------------------------------------------------------
    def add(self, s: str):
        self.parts.append(s)

    def layer(self):
        """Return an index; later calls to under(idx, fn) insert drawing there (z-order below)."""
        return len(self.parts)

    def under(self, idx: int, fn):
        saved = self.parts
        self.parts = []
        fn()
        drawn = self.parts
        self.parts = saved[:idx] + drawn + saved[idx:]

    # --- shapes --------------------------------------------------------------
    def rect(self, x, y, w, h, fill="none", stroke=None, sw=2, dash=None, opacity=None, rx=0, extra=""):
        a = f'x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" fill="{fill}"'
        if stroke:
            a += f' stroke="{stroke}" stroke-width="{sw:g}"'
        if dash:
            a += f' stroke-dasharray="{dash}"'
        if opacity is not None:
            a += f' opacity="{opacity:g}"'
        if rx:
            a += f' rx="{rx:g}"'
        self.add(f"<rect {a} {extra}/>")

    def line(self, x1, y1, x2, y2, stroke=FG1, sw=2, dash=None, opacity=None, cap="butt"):
        a = f'x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" stroke="{stroke}" stroke-width="{sw:g}" stroke-linecap="{cap}"'
        if dash:
            a += f' stroke-dasharray="{dash}"'
        if opacity is not None:
            a += f' opacity="{opacity:g}"'
        self.add(f"<line {a}/>")

    def path(self, d, stroke=FG1, sw=2, fill="none", dash=None, opacity=None, cap="butt", join="miter", marker=None):
        a = f'd="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw:g}" stroke-linecap="{cap}" stroke-linejoin="{join}"'
        if dash:
            a += f' stroke-dasharray="{dash}"'
        if opacity is not None:
            a += f' opacity="{opacity:g}"'
        if marker:
            a += f' marker-end="url(#{marker})"'
        self.add(f"<path {a}/>")

    def circle(self, cx, cy, r, fill="none", stroke=None, sw=2, opacity=None):
        a = f'cx="{cx:g}" cy="{cy:g}" r="{r:g}" fill="{fill}"'
        if stroke:
            a += f' stroke="{stroke}" stroke-width="{sw:g}"'
        if opacity is not None:
            a += f' opacity="{opacity:g}"'
        self.add(f"<circle {a}/>")

    # --- text ----------------------------------------------------------------
    def text(self, x, y, s, size=20, weight=400, fill=FG1, anchor="start", ls=0.0, opacity=None):
        self.chars[weight].update(s)
        measure(s, size, weight, ls)  # validates glyph coverage
        a = (f'x="{x:g}" y="{y:g}" font-size="{size:g}" font-weight="{weight}" fill="{fill}"'
             f' text-anchor="{anchor}"')
        if ls:
            a += f' letter-spacing="{ls:g}em"'
        if opacity is not None:
            a += f' opacity="{opacity:g}"'
        self.add(f"<text {a}>{escape(s)}</text>")

    # --- output --------------------------------------------------------------
    def to_string(self, title: str, desc: str, embed_fonts: bool = True) -> str:
        faces = "".join(_font_face(w, c) for w, c in self.chars.items() if c) if embed_fonts else ""
        css = (f"{faces}text{{font-family:'{FAMILY}','Iosevka',ui-monospace,'SF Mono',Menlo,Consolas,monospace;"
               f"font-variant-ligatures:none;}}")
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" '
            f'height="{self.h}" role="img" aria-labelledby="t d">\n'
            f'<title id="t">{escape(title)}</title>\n<desc id="d">{escape(desc)}</desc>\n'
            f"<style>{css}</style>\n"
            f"<defs>{''.join(self.defs)}</defs>\n" + "\n".join(self.parts) + "\n</svg>\n"
        )


# --- composite primitives ------------------------------------------------------

def screen(s: Svg, grid=True):
    s.rect(0, 0, s.w, s.h, fill=BG)
    if grid:
        s.defs.append(
            f'<pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">'
            f'<rect width="2" height="2" fill="{GRID}"/></pattern>')
        s.rect(0, 0, s.w, s.h, fill="url(#grid)")


def arrow_marker(s: Svg, mid: str, color: str, size=10):
    s.defs.append(
        f'<marker id="{mid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="{size/2:g}" '
        f'markerHeight="{size/2:g}" orient="auto-start-reverse" markerUnits="strokeWidth">'
        f'<path d="M0 0 L10 5 L0 10 z" fill="{color}"/></marker>')


def chrome(s: Svg, left: str, right: str, y=46, margin=48, size=17, rule=True):
    s.text(margin, y, left, size=size, weight=700, fill=FG3, ls=0.12)
    if right:
        s.text(s.w - margin, y, right, size=size, weight=700, fill=FG3, anchor="end", ls=0.12)
    if rule:
        s.line(margin, y + 18, s.w - margin, y + 18, stroke=DIM, sw=2)


def human(s: Svg, cx, top, scale=1.0, color=FG1):
    """A blocky pixel person: square head, shoulders, a cursor for a mouth-less face."""
    u = 4 * scale
    hw = 9 * u
    s.rect(cx - hw / 2, top, hw, hw, fill=color)
    # eyes
    s.rect(cx - 2.6 * u, top + 3.4 * u, 1.4 * u, 1.6 * u, fill=BG)
    s.rect(cx + 1.2 * u, top + 3.4 * u, 1.4 * u, 1.6 * u, fill=BG)
    # neck + shoulders (stepped)
    s.rect(cx - 2 * u, top + hw, 4 * u, 1.5 * u, fill=color)
    s.rect(cx - 7 * u, top + hw + 1.5 * u, 14 * u, 2 * u, fill=color)
    s.rect(cx - 8 * u, top + hw + 3.5 * u, 16 * u, 4 * u, fill=color)
    return top + hw + 7.5 * u  # bottom


def check(s: Svg, x, y, size, color=GREEN, sw=None):
    sw = sw or max(2.5, size / 6)
    s.path(f"M{x:g},{y + size*0.55:g} L{x + size*0.38:g},{y + size*0.9:g} L{x + size:g},{y + size*0.12:g}",
           stroke=color, sw=sw, cap="square")


def status_glyph(s: Svg, x, y, size, kind):
    """Square status well with a glyph. kinds: done, question, idle, working, ok, wrong."""
    if kind in ("done", "question", "idle", "wrong"):
        s.rect(x, y, size, size, fill=AMBER_TINT, stroke=AMBER, sw=2)
        c = AMBER
    elif kind == "working":
        s.rect(x, y, size, size, fill=PANEL, stroke=FG3, sw=2)
        c = FG2
    else:
        s.rect(x, y, size, size, fill=GREEN_TINT, stroke=GREEN, sw=2)
        c = GREEN
    cx, cy = x + size / 2, y + size / 2
    fs = size * 0.72
    if kind == "question":
        s.text(cx, cy + fs * 0.36, "?", size=fs, weight=700, fill=c, anchor="middle")
    elif kind == "done":
        s.text(cx, cy + fs * 0.36, "!", size=fs, weight=700, fill=c, anchor="middle")
    elif kind == "idle":
        # pause bars
        bw = size * 0.14
        s.rect(cx - bw * 1.8, y + size * 0.27, bw, size * 0.46, fill=c)
        s.rect(cx + bw * 0.8, y + size * 0.27, bw, size * 0.46, fill=c)
    elif kind == "wrong":
        d = size * 0.26
        s.path(f"M{cx-d:g},{cy-d:g} L{cx+d:g},{cy+d:g} M{cx+d:g},{cy-d:g} L{cx-d:g},{cy+d:g}", stroke=c,
               sw=max(2.5, size / 8), cap="square")
    elif kind == "working":
        # three progress pips
        p = size * 0.13
        for i in range(3):
            s.rect(x + size * 0.2 + i * size * 0.23, cy - p / 2, p, p, fill=c, opacity=0.45 + 0.27 * i)
    else:
        check(s, x + size * 0.22, y + size * 0.25, size * 0.56, color=c)


def bot_face(s: Svg, cx, cy, size, color=FG1, weight=700):
    s.text(cx, cy + size * 0.35, "[o_o]", size=size, weight=weight, fill=color, anchor="middle")


def boton(s: Svg, cx, cy, r, color=FG1, eye=BG, glow=False):
    """A Boton: a round, button-shaped bot. Rim, four thread holes as a face, small smile."""
    if glow:
        s.circle(cx, cy, r + 10, fill="none", stroke=GREEN, sw=2, opacity=0.5)
    # antenna, so a button reads as a bot
    s.line(cx, cy - r, cx, cy - r * 1.42, stroke=color, sw=max(2.5, r * 0.1))
    s.rect(cx - r * 0.13, cy - r * 1.62, r * 0.26, r * 0.26, fill=GREEN)
    s.circle(cx, cy, r, fill=color)
    s.circle(cx, cy, r * 0.8, fill="none", stroke=eye, sw=max(2, r * 0.06), opacity=0.35)
    e = r * 0.28
    hr = r * 0.12
    s.circle(cx - e, cy - e * 0.7, hr, fill=eye)
    s.circle(cx + e, cy - e * 0.7, hr, fill=eye)
    s.path(f"M{cx - e:g},{cy + e*0.55:g} Q{cx:g},{cy + e*1.35:g} {cx + e:g},{cy + e*0.55:g}", stroke=eye,
           sw=max(2.5, r * 0.09), cap="round")


def chip(s: Svg, x, y, label, size=20, pad=12, h=None, color=FG2, stroke=DIM, fill=PANEL, weight=400, prefix=None,
         prefix_color=AMBER):
    h = h or size * 2
    pw = measure(prefix + " ", size, 700) if prefix else 0
    w = measure(label, size, weight) + pw + pad * 2
    s.rect(x, y, w, h, fill=fill, stroke=stroke, sw=2)
    tx = x + pad
    base = y + h / 2 + size * 0.34
    if prefix:
        s.text(tx, base, prefix, size=size, weight=700, fill=prefix_color)
        tx += pw
    s.text(tx, base, label, size=size, weight=weight, fill=color)
    return w


def chip_width(label, size=20, pad=12, weight=400, prefix=None):
    pw = measure(prefix + " ", size, 700) if prefix else 0
    return measure(label, size, weight) + pw + pad * 2


def label(s: Svg, x, y, text, size=16, fill=FG3, weight=700, ls=0.1, anchor="start", pad=6, bg=BG):
    """Small caps label with a screen-coloured backing so wires never run through it."""
    w = measure(text, size, weight, ls)
    lx = x if anchor == "start" else (x - w if anchor == "end" else x - w / 2)
    s.rect(lx - pad, y - size * 0.95, w + pad * 2, size * 1.35, fill=bg)
    s.text(x, y, text, size=size, weight=weight, fill=fill, ls=ls, anchor=anchor)


def write(path: Path, content: str):
    path.write_text(content)
    return path
