"""Inline summary figures: compact versions of the three diagrams, sized for the prose column.

The post shows these at the paragraph width (640 CSS px on desktop, about 350 on a phone) and opens
the full-detail diagrams from fleet.py and botons.py on click. One 600 px canvas serves every width:
x1.07 on desktop, about x0.58 on a 390 px phone. Labels that carry meaning are >= 21 px here
(>= ~12 CSS px on the phone); detail that needs more room lives in the full diagrams.

usage: summary.py OUT_DIR   -> summary-before.svg, summary-after.svg, summary-botons.svg
"""
from __future__ import annotations

import sys
from pathlib import Path

from lib import *  # noqa: F401,F403
from lib import Svg, bot_face, boton, human, label, lift, screen, status_glyph

W, M = 600, 20
GAP = 14
GW = (W - 2 * M - 2 * GAP) / 3
GX = [M + i * (GW + GAP) for i in range(3)]
MACHINES = ["macOS", "macOS", "Linux"]
SQ, SQG = 36, 10
HEAD_Y, SQ_Y = 342, 356
H = SQ_Y + SQ + 22
ME_CX, ME_TOP = 62, 70
ME_PORT = (ME_CX, 172)
BEFORE = [["done", "question", "working", "idle"], ["working", "done", "question", "idle"],
          ["working", "done", "question", "wrong"]]
AFTER = [["ok", "ok", "working", "ok"], ["working", "ok", "ok", "ok"], ["working", "ok", "ok", "working"]]


def top(s, left, right, right_color):
    s.text(M, 32, left, size=17, weight=700, fill=FG3, ls=0.12)
    s.text(W - M, 32, right, size=17, weight=700, fill=right_color, anchor="end", ls=0.12)
    s.line(M, 46, W - M, 46, stroke=DIM, sw=2)


def me(s):
    human(s, ME_CX, ME_TOP, scale=0.9)
    s.text(ME_CX, 160, "ME", size=24, weight=700, fill=FG1, anchor="middle", ls=0.12)


def headline(s, l1, l2, sub, color, sub_color):
    s.text(132, 96, l1, size=28, weight=700, fill=color, ls=0.04)
    s.text(132, 130, l2, size=28, weight=700, fill=color, ls=0.04)
    s.text(132, 166, sub, size=21, fill=sub_color)


def square_xy(c, r):
    x0 = GX[c] + (GW - (4 * SQ + 3 * SQG)) / 2
    return x0 + r * (SQ + SQG), SQ_Y


def machines(s, kinds):
    for c in range(3):
        label(s, GX[c] + GW / 2, HEAD_Y, MACHINES[c], size=22, fill=FG1, weight=700, ls=0, anchor="middle", pad=8)
        for r in range(4):
            x, y = square_xy(c, r)
            k = kinds[c][r]
            if k == "wrong":
                s.rect(x - 4, y - 4, SQ + 8, SQ + 8, fill="none", stroke=AMBER, sw=2, dash="5 4")
            status_glyph(s, x, y, SQ, k)


def before() -> str:
    s = Svg(W, H)
    screen(s)
    under = s.layer()
    top(s, "BEFORE", "ME AS THE ROUTER", AMBER)
    me(s)
    headline(s, "EVERY THREAD", "WAITS ON ME", "fine for one thread, maybe five", AMBER, FG2)
    machines(s, BEFORE)

    def wires():
        ox, oy = ME_PORT
        for c in range(3):
            for r in range(4):
                x, y = square_xy(c, r)
                waiting = BEFORE[c][r] not in ("working",)
                tx = x + SQ / 2
                s.path(f"M{ox},{oy} C{ox},{oy + 110} {tx},{y - 120} {tx},{y}", stroke=AMBER if waiting else FG3,
                       sw=2, opacity=0.85 if waiting else 0.45)
    s.under(under, wires)
    return s.to_string(
        "Summary: before, every thread waits on me",
        "Summary diagram. Me, wired straight to twelve agent threads on two macOS machines and a Linux machine: "
        "every thread waits on me, which is fine for one thread, maybe five. Most threads are amber, waiting for "
        "me, and one sits on the wrong machine.")


def after() -> str:
    s = Svg(W, H)
    screen(s)
    under = s.layer()
    top(s, "AFTER", "ME AS THE CEO", GREEN)
    me(s)
    headline(s, "BOTS WATCH", "THE THREADS", "only critical decisions reach me", GREEN, AMBER)
    by, bh = 210, 50
    gy, gh = 280, 32
    for c, name in enumerate(["NEWS", "GAME", "DESK"]):
        x = GX[c]
        s.rect(x, by, GW, bh, fill=PANEL, stroke=FG1, sw=2.5)
        bot_face(s, x + 46, by + bh / 2, 22)
        s.text(x + 90, by + 33, name, size=21, weight=700, fill=FG1, ls=0.08)
    s.rect(M, gy, W - 2 * M, gh, fill=SINK, stroke=FG2, sw=2)
    s.text(W / 2, gy + 23, "T3 FLEET GATEWAY", size=19, weight=700, fill=FG1, anchor="middle", ls=0.12)
    machines(s, AFTER)

    def wires():
        trunk = 190
        mids = [x + GW / 2 for x in GX]
        cx = ME_CX - 14
        s.path(f"M{cx},{ME_PORT[1]} V{trunk} H{mids[2]}", stroke=FG1, sw=3)
        for mx in mids:
            s.path(f"M{mx},{trunk} V{by}", stroke=FG1, sw=3)
            s.path(f"M{mx},{by + bh} V{gy}", stroke=FG2, sw=3)
            s.path(f"M{mx},{gy + gh} V{HEAD_Y - 22}", stroke=FG2, sw=3)
        dx = ME_CX + 18
        s.line(dx, trunk - 8, dx, trunk + 8, stroke=BG, sw=10)
        s.path(f"M{dx},{by} V{ME_PORT[1] + 2}", stroke=AMBER, sw=3, dash="6 5")
        s.path(f"M{dx - 7},{ME_PORT[1] + 12} L{dx},{ME_PORT[1] + 2} L{dx + 7},{ME_PORT[1] + 12}", stroke=AMBER, sw=3)
    s.under(under, wires)
    return s.to_string(
        "Summary: after, bots watch the threads",
        "Summary diagram. Me at the top, wired to three Grok Bot project bots, news, game and desk, which reach "
        "the same twelve threads through the T3 Fleet Gateway. Bots watch the threads, and only critical "
        "decisions reach me, on a dashed amber line back up. The threads are now green or working.")


def botons_summary() -> str:
    h = 416
    s = Svg(W, h)
    screen(s)
    under = s.layer()
    human(s, 52, 66, scale=0.7)
    s.text(52, 142, "ME", size=22, weight=700, fill=FG1, anchor="middle", ls=0.12)
    s.text(104, 98, "I SET UP EACH BOTON", size=26, weight=700, fill=FG1, ls=0.06)
    s.text(104, 130, "its brain, role, tools and workflow", size=20, fill=FG2)
    bcx, bcy, r = 100, 272, 52
    boton(s, bcx, bcy, r, glow=True)
    s.text(bcx, bcy + r + 42, "A BOTON", size=21, weight=700, fill=FG1, anchor="middle", ls=0.12)
    rows = [("1", "BRAIN / MODEL", "Claude Code, Codex, API key"),
            ("2", "ROLE + INSTRUCTIONS", "a role, in my own words"),
            ("3", "TOOLS", "only connectors I give it"),
            ("4", "WORKFLOW", "skills, routines, Ask first")]
    rx, rw, ry0, step, rh = 206, W - M - 206, 168, 60, 52
    for i, (n, title, ex) in enumerate(rows):
        y = ry0 + i * step
        s.rect(rx, y, rw, rh, fill=PANEL, stroke=FG2, sw=2)
        s.rect(rx, y, rh, rh, fill=GREEN)
        s.text(rx + rh / 2, y + 35, n, size=24, weight=700, fill=BG, anchor="middle")
        s.text(rx + rh + 14, y + 22, title, size=19, weight=700, fill=FG1, ls=0.06)
        s.text(rx + rh + 14, y + 45, ex, size=20, fill=FG2)

    def wires():
        jx = bcx + r + 22
        s.path(f"M{bcx + r + 10},{bcy} H{jx}", stroke=GREEN, sw=3)
        mids = [ry0 + i * step + rh / 2 for i in range(4)]
        s.path(f"M{jx},{mids[0]} V{mids[-1]}", stroke=GREEN, sw=3)
        for y in mids:
            s.path(f"M{jx},{y} H{rx}", stroke=GREEN, sw=3)
    s.under(under, wires)
    lift(s, 34)  # no top label row: the content moves up into its space
    s.parts[0] = f'<rect x="0" y="0" width="{W}" height="{s.h}" fill="{BG}" />'
    s.parts[1] = f'<rect x="0" y="0" width="{W}" height="{s.h}" fill="url(#grid)" />'
    return s.to_string(
        "Summary: Botons customization",
        "Summary diagram. Me: I set up each Boton, its brain, role, tools and workflow. A round, button-shaped "
        "Boton is wired to four setup rows: one, brain or model, Claude Code, Codex or an API key; two, role and "
        "instructions, a role in my own words; three, tools, only connectors I give it; four, workflow, skills, "
        "routines and Ask first.")


if __name__ == "__main__":
    out = Path(sys.argv[1])
    (out / "summary-before.svg").write_text(before())
    (out / "summary-after.svg").write_text(after())
    (out / "summary-botons.svg").write_text(botons_summary())
    print("ok")
