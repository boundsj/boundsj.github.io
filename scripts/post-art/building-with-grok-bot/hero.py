"""Animated hero: from router to CEO.

Act A (router): every thread is wired straight to me. Threads finish turns, ask questions and go idle;
  amber pings travel to me and pile up faster than I can clear them.
Act B (handoff): a Grok Bot powers on between me and the threads (CRT style), the tangle fades and
  clean wiring through the T3 Fleet Gateway draws in; my pile moves to the bot.
Act C (CEO): the bot answers the pings with green packets; one critical decision comes up to me, and
  my direction goes back down.
Act D: the bot powers off and the tangle returns, landing exactly on frame 0 so the loop is seamless.

usage: hero.py OUT_DIR   (writes frames/, poster.png, social-card.png)
"""
from __future__ import annotations

import math
import random
import sys
from pathlib import Path

from lib import *  # noqa: F401,F403
from lib import Svg, bot_face, human, measure, status_glyph

W, H = 1200, 600
FPS = 12.5
DUR = 11.2
N = round(DUR * FPS)  # 140 frames, 80 ms each

YOU_CX, YOU_TOP, YOU_SCALE = 132, 262, 1.4
YOU_PORT = (222, 322)
BOT = (352, 262, 236, 120)  # x, y, w, h
GW = (664, 112, 488, 38)
COLW, COLG = 156, 10
COL_X = [664 + i * (COLW + COLG) for i in range(3)]
HEAD_Y, HEAD_H = 184, 36
TILE_Y0, TILE_H, TILE_STEP = 240, 46, 62
MACHINES = ["macOS", "macOS", "Linux"]
TILES = [  # (col, row, project, agent)
    (0, 0, "news", "codex"), (0, 1, "game", "claude"), (0, 2, "desk", "codex"), (0, 3, "news", "claude"),
    (1, 0, "game", "codex"), (1, 1, "desk", "claude"), (1, 2, "news", "codex"), (1, 3, "game", "claude"),
    (2, 0, "desk", "codex"), (2, 1, "news", "claude"), (2, 2, "desk", "claude"), (2, 3, "news", "codex"),
]
PROMPT_A = "> is it done? which machine? what's next?"
PROMPT_C = "> set direction · judge results · decide when done"


def tile_box(i):
    c, r = TILES[i][0], TILES[i][1]
    return COL_X[c], TILE_Y0 + r * TILE_STEP


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ramp(t, a, b):
    return ease((t - a) / (b - a)) if b > a else float(t >= a)


def lerp(a, b, u):
    return a + (b - a) * u


def mix(c1, c2, u):
    h1 = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    h2 = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(lerp(a, b, u)):02X}" for a, b in zip(h1, h2))


# ---- wires ---------------------------------------------------------------------------------
def fan_ctrl(i):
    x, y = tile_box(i)
    py = y + TILE_H / 2
    ox, oy = YOU_PORT
    j = [150, -170, 60, -90, 200, -40, 120, -200, 30, 170, -120, 90][i]
    k = [-80, 110, -140, 60, -30, 150, -100, 40, 130, -60, 20, -150][i]
    return (ox, oy), (ox + 190, oy + j), (x - 170, py + k), (x, py)


def bezier(p, u):
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = p
    v = 1 - u
    return (v**3 * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u**3 * x3,
            v**3 * y0 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u**3 * y3)


def poly_point(pts, u):
    segs = [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    lens = [math.dist(a, b) for a, b in segs]
    total = sum(lens)
    d = clamp(u) * total
    for (a, b), l in zip(segs, lens):
        if d <= l or l == 0:
            k = d / l if l else 0
            return (lerp(a[0], b[0], k), lerp(a[1], b[1], k))
        d -= l
    return pts[-1]


BOT_IN = (BOT[0], BOT[1] + BOT[3] / 2)
BOT_OUT = (BOT[0] + BOT[2], BOT[1] + BOT[3] / 2)
TRUNK_X = 626


def bot_to_tile(i):
    x, y = tile_box(i)
    c = TILES[i][0]
    cx = COL_X[c] - 5
    gy = GW[1] + GW[3] / 2
    return [BOT_OUT, (TRUNK_X, BOT_OUT[1]), (TRUNK_X, gy), (GW[0] + 30, gy), (cx, gy), (cx, y + TILE_H / 2),
            (x + 2, y + TILE_H / 2)]


# ---- timeline --------------------------------------------------------------------------------
KINDS = ["done", "question", "idle"]


def build_timeline():
    rnd = random.Random(7)
    order = [5, 0, 10, 3, 7, 1, 9, 6, 11, 2, 8, 4]
    events = []  # per tile: list of (t0, t1, kind)
    a_pings = []  # (t_flip, tile, kind)
    t = 0.45
    for k, i in enumerate(order):
        a_pings.append((t, i, KINDS[k % 3]))
        t += 0.27 + rnd.random() * 0.06
    # I clear one every ~1.0 s: oldest first
    services = []
    queue = []
    st = 1.25
    ai = 0
    pending = sorted(a_pings)
    clear_times = [1.25, 2.35, 3.45]
    for ct in clear_times:
        arrived = [p for p in pending if p[0] + 0.4 <= ct]
        if arrived:
            p = arrived[0]
            pending.remove(p)
            services.append((ct, p[1]))
    waiting_at_b = [p for p in pending]  # still waiting when the bot arrives
    # Act C: the bot answers the leftovers, then a few fresh pings that it absorbs quickly
    c_service = []
    t = 5.5
    for p in waiting_at_b:
        c_service.append((t, p[1], p[2]))
        t += 0.3
    fresh = []
    t = 7.0
    for i, kind in [(1, "question"), (9, "done"), (4, "idle"), (6, "done")]:
        fresh.append((t, i, kind))
        t += 0.55
    return a_pings, services, waiting_at_b, c_service, fresh


A_PINGS, SERVICES, WAITING_AT_B, C_SERVICE, FRESH = build_timeline()
PING_TRAVEL = 0.4
GREEN_TRAVEL = 0.5
OK_HOLD = 0.9
DECISION_UP = (8.35, 8.85)
DECISION_SHOW = (8.85, 9.65)
DIRECTION_DOWN = (9.45, 9.95)


def tile_state(i, t):
    """(kind, extra) at time t."""
    kind = "working"
    for (tf, ti, k) in A_PINGS:
        if ti == i and t >= tf:
            kind = k
    for (ts, ti) in SERVICES:
        if ti == i and t >= ts + 0.35:
            kind = "working"
    for (ts, ti, k) in C_SERVICE:
        if ti == i and t >= ts + GREEN_TRAVEL:
            kind = "ok" if t < ts + GREEN_TRAVEL + OK_HOLD else "working"
    for (tf, ti, k) in FRESH:
        if ti == i and t >= tf:
            arrive_bot = tf + PING_TRAVEL
            back = arrive_bot + 0.15 + GREEN_TRAVEL
            if t < back:
                kind = k
            elif t < back + OK_HOLD:
                kind = "ok"
            else:
                kind = "working"
    return kind


def pile_count(t):
    if t >= 4.6:
        return 0
    arrived = sum(1 for (tf, _, _) in A_PINGS if tf + PING_TRAVEL <= t)
    cleared = sum(1 for (ts, _) in SERVICES if ts + 0.35 <= t)
    return max(0, arrived - cleared)


PILE_X, PILE_Y, PILE_S, PILE_G = 52, 216, 26, 6


def pile_pos(k):
    return PILE_X + (k % 5) * (PILE_S + PILE_G), PILE_Y - (k // 5) * (PILE_S + PILE_G)


# ---- drawing ---------------------------------------------------------------------------------
def tile(s, i, kind, highlight=0.0):
    x, y = tile_box(i)
    _, _, proj, agent = TILES[i]
    waiting = kind in ("done", "question", "idle")
    edge = AMBER if waiting else (GREEN if kind == "ok" else DIM)
    if highlight > 0:
        edge = mix(edge, FG1, highlight)
    s.rect(x, y, COLW, TILE_H, fill=PANEL, stroke=edge, sw=2 + highlight)
    status_glyph(s, x + 9, y + 11, 24, kind)
    s.text(x + 42, y + 29, f"{proj} · {agent}", size=16, fill=FG1)


def draw_packets(s, t):
    if STILL:
        return
    for (tf, ti, k) in FRESH:
        u = (t - tf) / PING_TRAVEL
        if 0 <= u <= 1:
            pts = list(reversed(bot_to_tile(ti)))
            x, y = poly_point(pts, ease(u))
            s.rect(x - 6, y - 6, 12, 12, fill=AMBER)
        g0 = tf + PING_TRAVEL + 0.15
        u = (t - g0) / GREEN_TRAVEL
        if 0 <= u <= 1:
            x, y = poly_point(bot_to_tile(ti), ease(u))
            s.rect(x - 6, y - 6, 12, 12, fill=GREEN)
    for (ts, ti, k) in C_SERVICE:
        u = (t - ts) / GREEN_TRAVEL
        if 0 <= u <= 1:
            x, y = poly_point(bot_to_tile(ti), ease(u))
            s.rect(x - 6, y - 6, 12, 12, fill=GREEN)



STILL = False


def draw(t, still=False):
    global STILL
    STILL = still
    s = Svg(W, H)
    s.rect(0, 0, W, H, fill=BG)
    s.defs.append(f'<pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">'
                  f'<rect width="2" height="2" fill="{GRID}"/></pattern>')
    s.rect(0, 0, W, H, fill="url(#grid)")

    # act weights
    fan = 1 - ramp(t, 4.25, 4.75) + ramp(t, 10.75, 11.2)
    power = ramp(t, 4.4, 4.95) * (1 - ramp(t, 10.35, 10.8))
    neat = ramp(t, 4.7, 5.25) * (1 - ramp(t, 10.35, 10.75))
    ceo = ramp(t, 4.9, 5.4) * (1 - ramp(t, 10.3, 10.6))

    # chrome
    s.text(48, 46, "BUILDING WITH GROK BOT IN THE OUTER LOOP", size=17, weight=700, fill=FG3, ls=0.12)
    if ceo > 0.5:
        s.text(W - 48, 46, "ME: THE CEO", size=17, weight=700, fill=GREEN, anchor="end", ls=0.12,
               opacity=clamp((ceo - 0.5) * 2))
    elif fan > 0.5:
        s.text(W - 48, 46, "ME: THE ROUTER", size=17, weight=700, fill=AMBER, anchor="end", ls=0.12,
               opacity=clamp((fan - 0.5) * 2))
    s.line(48, 64, W - 48, 64, stroke=DIM, sw=2)
    s.line(48, 532, W - 48, 532, stroke=DIM, sw=2)

    # fan wires (act A / D)
    if fan > 0.01:
        for i in range(12):
            kind = tile_state(i, t)
            waiting = kind in ("done", "question", "idle")
            p = fan_ctrl(i)
            d = "M{:g},{:g} C{:g},{:g} {:g},{:g} {:g},{:g}".format(*[v for pt in p for v in pt])
            s.path(d, stroke=AMBER if waiting else FG3, sw=2, opacity=fan * (0.85 if waiting else 0.4))
        # me clearing one ping: a bright wire for a moment
        for (ts, ti) in SERVICES:
            u = (t - (ts - 0.15)) / 0.5
            if 0 <= u <= 1:
                p = fan_ctrl(ti)
                d = "M{:g},{:g} C{:g},{:g} {:g},{:g} {:g},{:g}".format(*[v for pt in p for v in pt])
                s.path(d, stroke=FG1, sw=3.5, opacity=fan * math.sin(u * math.pi))

    # neat wires (act C)
    if neat > 0.01:
        o = neat
        s.path(f"M{YOU_PORT[0]},{BOT_IN[1]} H{BOT[0]}", stroke=FG1, sw=3, opacity=o)
        s.path(f"M{BOT_OUT[0]},{BOT_OUT[1]} H{TRUNK_X} V{GW[1] + GW[3] / 2} H{GW[0]}", stroke=FG2, sw=3, opacity=o)
        for c in range(3):
            cx = COL_X[c] - 5
            s.path(f"M{COL_X[c] + COLW / 2},{GW[1] + GW[3]} V{HEAD_Y}", stroke=FG2, sw=3, opacity=o)
            s.path(f"M{cx},{GW[1] + GW[3]} V{TILE_Y0 + 3 * TILE_STEP + TILE_H / 2}", stroke=FAINT, sw=2, opacity=o)
        draw_packets(s, t)
        s.rect(GW[0], GW[1], GW[2], GW[3], fill=SINK, stroke=FG2, sw=2, opacity=o)
        s.text(GW[0] + GW[2] / 2, GW[1] + 25, "T3 FLEET GATEWAY", size=17, weight=700, fill=FG1, anchor="middle",
               ls=0.14, opacity=o)

    # machines
    for c in range(3):
        x = COL_X[c]
        s.rect(x, HEAD_Y, COLW, HEAD_H, fill=SINK, stroke=FG2, sw=2)
        s.text(x + 12, HEAD_Y + 23, MACHINES[c], size=17, weight=700, fill=FG1)
        s.text(x + COLW - 10, HEAD_Y + 22, "T3", size=13, weight=700, fill=FG3, anchor="end", ls=0.1)

    # tiles
    for i in range(12):
        hl = 0.0
        for (ts, ti) in SERVICES:
            u = (t - (ts - 0.15)) / 0.5
            if ti == i and 0 <= u <= 1:
                hl = math.sin(u * math.pi)
        tile(s, i, tile_state(i, t), hl)

    # me
    human(s, YOU_CX, YOU_TOP, scale=YOU_SCALE)
    s.text(YOU_CX, YOU_TOP + 92 + 44, "ME", size=34, weight=700, fill=FG1, anchor="middle", ls=0.12)

    # pile of pings on me (act A)
    n = pile_count(t)
    if n:
        for k in range(n):
            px, py = pile_pos(k)
            s.rect(px, py, PILE_S, PILE_S, fill=AMBER_TINT, stroke=AMBER, sw=2)
            s.text(px + PILE_S / 2, py + 19, "!", size=17, weight=700, fill=AMBER, anchor="middle")
        if n >= 3:
            top = pile_pos(n - 1)[1]
            s.text(PILE_X, top - 12, "WAITING ON ME", size=14, weight=700, fill=AMBER, ls=0.1)
    # pile flies to the bot (act B)
    left = pile_count(4.59)
    for k in range(left):
        u = ramp(t, 4.6 + k * 0.06, 5.2 + k * 0.06)
        if 0 < u < 1:
            px, py = pile_pos(k)
            tx, ty = BOT[0] + BOT[2] / 2 - PILE_S / 2, BOT[1] + BOT[3] / 2 - PILE_S / 2
            x, y = lerp(px, tx, u), lerp(py, ty, u) - math.sin(u * math.pi) * 60
            col = mix(AMBER, GREEN, u)
            s.rect(x, y, PILE_S * (1 - 0.4 * u), PILE_S * (1 - 0.4 * u), fill=BG, stroke=col, sw=2)

    # amber pings travelling to me (act A)
    for (tf, ti, k) in A_PINGS:
        u = (t - tf) / PING_TRAVEL
        if 0 <= u <= 1 and fan > 0.5:
            p = fan_ctrl(ti)
            x, y = bezier((p[3], p[2], p[1], p[0]), ease(u))
            s.rect(x - 6, y - 6, 12, 12, fill=AMBER)

    # the bot (CRT power-on / off)
    if power > 0.01:
        bx, by, bw, bh = BOT
        hh = max(3, bh * ease(clamp(power * 1.4 - 0.2)))
        ww = bw * ease(clamp(power * 2.5))
        cy = by + bh / 2
        s.rect(bx + (bw - ww) / 2, cy - hh / 2, ww, hh, fill=PANEL, stroke=FG1, sw=3)
        if power > 0.85:
            o = clamp((power - 0.85) / 0.15)
            bot_face(s, bx + bw / 2, by + 44, 40, color=FG1)
            s.text(bx + bw / 2, by + 98, "GROK BOT", size=24, weight=700, fill=FG1, anchor="middle", ls=0.14,
                   opacity=o)
            s.text(bx + bw / 2, by + bh + 28, "one per project", size=17, fill=FG3, anchor="middle", opacity=o)

    # one critical decision comes up to me, my direction goes back down
    u = (t - DECISION_UP[0]) / (DECISION_UP[1] - DECISION_UP[0])
    if 0 <= u <= 1 and not still:
        x = lerp(BOT[0], YOU_PORT[0], ease(u))
        s.rect(x - 7, BOT_IN[1] - 7, 14, 14, fill=AMBER)
    if DECISION_SHOW[0] <= t <= DECISION_SHOW[1] or still:
        cx0, cy0 = 52, 190
        s.rect(cx0, cy0, 26, 26, fill=AMBER_TINT, stroke=AMBER, sw=2)
        s.text(cx0 + 13, cy0 + 19, "!", size=17, weight=700, fill=AMBER, anchor="middle")
        s.text(cx0 + 38, cy0 + 19, "a critical decision", size=18, fill=AMBER)
    u = (t - DIRECTION_DOWN[0]) / (DIRECTION_DOWN[1] - DIRECTION_DOWN[0])
    if 0 <= u <= 1 and not still:
        x = lerp(YOU_PORT[0], BOT[0], ease(u))
        s.rect(x - 7, BOT_IN[1] - 7, 14, 14, fill=FG1)

    # bottom prompt line
    if ceo > 0.5:
        n = int(clamp((t - 5.5) * 22, 0, len(PROMPT_C)))
        txt, col = PROMPT_C[:n], FG2
    elif fan > 0.5:
        n = int(clamp((t - 0.2) * 20, 0, len(PROMPT_A))) if t < 6 else 0
        txt, col = PROMPT_A[:n], FG2
    else:
        txt, col = "", FG2
    if still:
        txt = PROMPT_C
    if txt:
        s.text(48, 566, txt, size=17, fill=col)
    cw = measure(txt, 17) if txt else 0
    if still or int(t * 2.5) % 2 == 0:
        s.rect(48 + cw + 4, 552, 10, 18, fill=GREEN if ceo > 0.5 or still else AMBER)
    s.text(W - 48, 566, "ONE PROJECT <=> ONE BOT", size=15, weight=700, fill=FG3, anchor="end", ls=0.1)
    return s


def frame_svg(t, still=False):
    s = draw(t, still)
    return s.to_string("", "", embed_fonts=False)


if __name__ == "__main__":
    from playwright.sync_api import sync_playwright

    out = Path(sys.argv[1])
    frames = out / "frames"
    frames.mkdir(parents=True, exist_ok=True)
    fonts = Path(FONT_DIR)
    face = "".join(
        f"@font-face{{font-family:'{FAMILY}';font-weight:{w};src:url('{(fonts / f'iosevka-latin-{w}-normal.woff2').as_uri()}')}}"
        for w in (400, 700))
    only = sys.argv[2] if len(sys.argv) > 2 else "all"
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        pg = b.new_page(viewport={"width": W, "height": H})
        pg.goto(out.resolve().as_uri() + "/")
        pg.set_content(f"<html><head><style>{face} body{{margin:0;background:#000}}</style></head>"
                       f"<body><div id=s></div></body></html>")
        pg.evaluate(f"document.fonts.load('700 16px \"{FAMILY}\"')")
        pg.evaluate(f"document.fonts.load('400 16px \"{FAMILY}\"')")
        pg.wait_for_timeout(300)

        def shot(svg, dest):
            pg.evaluate("s => { document.getElementById('s').innerHTML = s }", svg)
            pg.evaluate("document.fonts.ready")
            pg.screenshot(path=str(dest), clip={"x": 0, "y": 0, "width": W, "height": H})

        if only in ("all", "frames"):
            for k in range(N):
                shot(frame_svg(k / FPS), frames / f"f{k:04d}.png")
        if only in ("all", "poster"):
            shot(frame_svg(8.9, still=True), out / "poster.png")
        b.close()
    print("ok", N)
