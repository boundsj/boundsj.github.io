"""Figure 3: from Grok Bot to Botons.

Grounded in the draft: usage started burning faster "for whatever reason"; that led to "why not make
my own Grok Bot?"; Jesse worked with Grok Bot on a goal prompt to recreate itself; Botons lets him
choose the models, connect the tools and give each Boton a role; a Boton comes back only for
decisions only he can make. Botons are drawn as button-shaped bots, as in the Botons project.
"""
from __future__ import annotations

from lib import *  # noqa: F401,F403
from lib import Svg, arrow_marker, bot_face, boton, chrome, human, label, measure, screen


def usage_meter(s, x, y, w, n=10, used=7, cell_gap=6, size=26):
    cell = (w - (n - 1) * cell_gap) / n
    for i in range(n):
        cx = x + i * (cell + cell_gap)
        if i < n - used:
            s.rect(cx, y, cell, size, fill=AMBER)
        else:
            s.rect(cx, y, cell, size, fill="none", stroke=FAINT, sw=2, dash="4 3")
    return y + size


def doc_card(s, x, y, w, h, mobile=False):
    s.rect(x + 8, y + 8, w, h, fill=DIM)  # hard offset shadow, as in the site's design system
    s.rect(x, y, w, h, fill=PANEL, stroke=FG1, sw=3)
    s.rect(x, y, w, 44, fill=SINK, stroke=FG1, sw=3)
    s.text(x + 18, y + 29, "GOAL PROMPT", size=19, weight=700, fill=FG1, ls=0.12)
    s.text(x + w - 18, y + 29, ".md", size=17, fill=FG3, anchor="end")
    # abstract text lines: we don't know the prompt's words, so we don't invent them
    widths = [0.82, 0.64, 0.9, 0.5, 0.76, 0.58]
    ly = y + 72
    for i, f in enumerate(widths):
        if ly > y + h - 40:
            break
        s.rect(x + 18, ly, (w - 36) * f, 10, fill=FG3 if i else FG2, opacity=0.55 if i else 0.8)
        ly += 26


def figure(mobile: bool) -> str:
    W = 560 if mobile else 1200
    m = 16 if mobile else 48
    s = Svg(W, 10)
    screen(s)
    arrow_marker(s, "ah", FG2)
    arrow_marker(s, "aa", AMBER)
    under = s.layer()
    chrome(s, "FROM GROK BOT TO BOTONS", "" if mobile else "MAKING IT MINE", margin=m, size=15 if mobile else 17)

    if not mobile:
        top = 130
        # --- station 1: Grok Bot -------------------------------------------------------
        x1, w1 = m, 300
        s.rect(x1, top, w1, 190, fill=PANEL, stroke=FG1, sw=3)
        bot_face(s, x1 + w1 / 2, top + 56, 40)
        s.text(x1 + w1 / 2, top + 118, "GROK BOT", size=24, weight=700, fill=FG1, anchor="middle", ls=0.12)
        s.text(x1 + w1 / 2, top + 150, "the project manager", size=17, fill=FG3, anchor="middle")
        my = top + 236
        s.text(x1, my, "USAGE", size=16, weight=700, fill=FG3, ls=0.1)
        usage_meter(s, x1, my + 14, w1)
        s.text(x1, my + 74, "started burning faster,", size=18, fill=AMBER)
        s.text(x1, my + 98, "for whatever reason", size=18, fill=AMBER)

        # --- station 2: goal prompt ------------------------------------------------------
        x2, w2 = 488, 280
        doc_card(s, x2, top, w2, 190)
        s.text(x2, top + 236, "written with Grok Bot,", size=18, fill=FG2)
        s.text(x2, top + 260, "to recreate itself", size=18, fill=FG2)

        # --- station 3: Botons -----------------------------------------------------------
        x3 = 900
        w3 = W - m - x3
        ph = 300
        ay = top + 95

        def arrows():
            s.path(f"M{x1 + w1 + 10},{ay} H{x2 - 16}", stroke=FG2, sw=3, marker="ah")
            s.path(f"M{x2 + w2 + 18},{ay} H{x3 - 16}", stroke=FG2, sw=3, marker="ah")
        s.under(under, arrows)
        mx = (x1 + w1 + x2) / 2
        for i, t in enumerate(["why not make", "my own", "Grok Bot?"]):
            s.text(mx, ay - 64 + i * 22, t, size=16, fill=FG1, anchor="middle")

        s.rect(x3, top, w3, ph, fill=PANEL, stroke=GREEN, sw=3)
        s.text(x3 + w3 / 2, top + 36, "BOTONS", size=22, weight=700, fill=FG1, anchor="middle", ls=0.16)
        for i in range(3):
            boton(s, x3 + w3 / 2 + (i - 1) * 80, top + 118, 28)
        ry = top + 196
        for k, v in [("MODELS", "I choose"), ("TOOLS", "I connect"), ("ROLES", "one per Boton")]:
            s.line(x3 + 16, ry - 26, x3 + w3 - 16, ry - 26, stroke=DIM, sw=1)
            s.text(x3 + 18, ry, k, size=15, weight=700, fill=FG3, ls=0.1)
            s.text(x3 + w3 - 18, ry, v, size=18, fill=FG1, anchor="end")
            ry += 36

        # --- me, still the CEO -------------------------------------------------------------
        py = top + ph
        hy = py + 104
        hx = x3 + w3 - 72
        human(s, hx, hy, scale=0.75)
        s.path(f"M{hx - 12},{hy - 10} V{py + 14}", stroke=FG1, sw=3, marker="ah")
        s.path(f"M{hx + 14},{py + 6} V{hy - 18}", stroke=AMBER, sw=3, dash="7 5", marker="aa")
        s.text(hx - 30, py + 40, "direction", size=15, weight=700, fill=FG1, anchor="end", ls=0.04)
        s.text(hx - 30, py + 64, "decisions only I can make", size=15, weight=700, fill=AMBER, anchor="end", ls=0.04)
        tx = hx - 60
        s.text(tx, hy + 22, "ME, STILL THE CEO", size=17, weight=700, fill=FG1, anchor="end", ls=0.1)
        s.text(tx, hy + 46, "set direction, let them", size=17, fill=FG2, anchor="end")
        s.text(tx, hy + 68, "handle the details", size=17, fill=FG2, anchor="end")
        s.h = int(hy + 100)
    else:
        cx = W / 2
        top = 96
        w1 = W - 2 * m
        # Grok Bot
        s.rect(m, top, w1, 150, fill=PANEL, stroke=FG1, sw=3)
        bot_face(s, m + 90, top + 75, 34)
        s.text(m + 180, top + 66, "GROK BOT", size=22, weight=700, fill=FG1, ls=0.12)
        s.text(m + 180, top + 96, "the project manager", size=17, fill=FG3)
        y = top + 192
        s.text(m, y, "USAGE", size=15, weight=700, fill=FG3, ls=0.1)
        usage_meter(s, m, y + 14, w1)
        s.text(m, y + 72, "started burning faster, for whatever reason", size=17, fill=AMBER)
        # arrow + question
        a1 = y + 96
        s.path(f"M{cx},{a1} V{a1 + 74}", stroke=FG2, sw=3, marker="ah")
        label(s, cx + 22, a1 + 44, "why not make my own Grok Bot?", size=17, fill=FG1, weight=400, ls=0)
        # goal prompt
        gy = a1 + 92
        doc_card(s, m, gy, w1 - 8, 180, mobile=True)
        s.text(m, gy + 220, "written with Grok Bot, to recreate itself", size=17, fill=FG2)
        a2 = gy + 240
        s.path(f"M{cx},{a2} V{a2 + 60}", stroke=FG2, sw=3, marker="ah")
        # Botons
        by = a2 + 78
        s.rect(m, by, w1, 200, fill=PANEL, stroke=GREEN, sw=3)
        s.text(cx, by + 36, "BOTONS", size=21, weight=700, fill=FG1, anchor="middle", ls=0.16)
        for i in range(3):
            boton(s, cx + (i - 1) * 96, by + 116, 30)
        s.text(cx, by + 184, "a persistent team, mine", size=17, fill=FG2, anchor="middle")
        ry = by + 240
        for k, v in [("MODELS", "I choose"), ("TOOLS", "I connect"), ("ROLES", "one per Boton")]:
            s.text(m, ry, k, size=15, weight=700, fill=FG3, ls=0.1)
            s.text(W - m, ry, v, size=18, fill=FG1, anchor="end")
            s.line(m, ry + 12, W - m, ry + 12, stroke=DIM, sw=1)
            ry += 36
        hy = ry + 24
        human(s, m + 34, hy, scale=0.7)
        s.text(m + 84, hy + 22, "ME, STILL THE CEO", size=17, weight=700, fill=FG1, ls=0.1)
        s.text(m + 84, hy + 46, "set direction, let them handle", size=17, fill=FG2)
        s.text(m + 84, hy + 68, "the details; they come back", size=17, fill=FG2)
        s.text(m + 84, hy + 90, "for decisions only I can make", size=17, fill=AMBER)
        s.h = int(hy + 116)

    # fix background height
    s.parts[0] = f'<rect x="0" y="0" width="{W}" height="{s.h}" fill="{BG}" />'
    s.parts[1] = f'<rect x="0" y="0" width="{W}" height="{s.h}" fill="url(#grid)" />'
    title = "From Grok Bot to Botons"
    desc = ("A dark terminal-style diagram in three steps. First, Grok Bot, the project manager, with a usage meter "
            "that is mostly used up and an amber note: started burning faster, for whatever reason. An arrow asks "
            "why not make my own Grok Bot? Second, a document card titled Goal prompt, written with Grok Bot to recreate "
            "itself; its lines are abstract bars. Third, Botons: three round, button-shaped bots with antennas in a green "
            "panel, a persistent team that is mine, with three settings: models, I choose; tools, I connect; roles, "
            "one per Boton. Below, a small figure labelled me, still the CEO: set direction and let them handle "
            "the details. A cream arrow carries direction up to the team, and an amber dashed arrow brings back "
            "decisions only I can make.")
    return s.to_string(title, desc)


if __name__ == "__main__":
    import sys
    from pathlib import Path
    out = Path(sys.argv[1])
    (out / "grok-bot-to-botons.svg").write_text(figure(False))
    (out / "grok-bot-to-botons-mobile.svg").write_text(figure(True))
    print("ok")
