"""Phone hero: the same three acts as hero.py, re-composed as a 4:5 portrait for screens <= 600 px.

Designed on a 600 x 750 canvas (shown about 350 CSS px wide on a 390 px phone, so x0.58) and rendered
at 1.5x. Every label that carries meaning is >= 22 px here (>= ~12.7 CSS px on the phone):
the status banner (ME: THE ROUTER / ME: THE CEO and its subline), YOU, WAITING ON ME, GROK BOT,
T3 FLEET GATEWAY, the machines, the agents, and "a critical decision".
Act timing matches hero.py, so both loops are 11.2 s at 12.5 fps.

usage: hero_phone.py OUT_DIR [frames|poster|all]
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

from hero import DUR, FPS, N, bezier, clamp, ease, lerp, mix, poly_point, ramp
from lib import *  # noqa: F401,F403
from lib import Svg, bot_face, human, status_glyph

W, H = 600, 750
SCALE = 1.5
M = 24
COLG = 12
COLW = (W - 2 * M - 2 * COLG) / 3
COL_X = [M + i * (COLW + COLG) for i in range(3)]
MACHINES = ["macOS", "macOS", "Linux"]
TILES = [(0, 0, "codex"), (0, 1, "claude"), (1, 0, "claude"), (1, 1, "codex"), (2, 0, "codex"), (2, 1, "claude")]

YOU_CX, YOU_TOP, YOU_SCALE = 84, 178, 1.15
YOU_PORT = (84, 300)
BOT = (196, 336, 224, 108)
BOT_IN = (BOT[0], BOT[1] + BOT[3] / 2)
GW = (M, 486, W - 2 * M, 44)
HEAD_Y, HEAD_H = 556, 40
TILE_Y0, TILE_H, TILE_STEP = 606, 52, 62
PILE_X, PILE_Y, PILE_S, PILE_G = 198, 262, 34, 8

# timeline (same act boundaries as hero.py)
A_PINGS = [(0.5, 2, "question"), (1.1, 0, "done"), (1.7, 5, "idle"), (2.3, 3, "question"), (2.9, 1, "done"),
           (3.4, 4, "idle")]
SERVICES = [(1.75, 2), (3.0, 0)]  # I clear one at a time, slower than they arrive
PING_TRAVEL = 0.45
C_SERVICE = [(5.5, 5), (5.85, 3), (6.2, 1), (6.55, 4)]
FRESH = [(7.3, 0, "question"), (7.9, 2, "done"), (9.6, 3, "idle")]
GREEN_TRAVEL = 0.5
OK_HOLD = 0.9
DECISION_UP = (8.35, 8.85)
DECISION_SHOW = (8.85, 9.65)
DIRECTION_DOWN = (9.45, 9.95)
WAITING = ("done", "question", "idle")


def tile_box(i):
    c, r, _ = TILES[i]
    return COL_X[c], TILE_Y0 + r * TILE_STEP


def fan_ctrl(i):
    x, y = tile_box(i)
    py = y + TILE_H / 2
    ox, oy = YOU_PORT
    j = [60, -40, 120, 20, 180, -20][i]
    k = [-160, -60, -220, -120, -260, -90][i]
    return (ox, oy), (ox + 40 + j, oy + 160), (x - 60, py + k), (x, py)


def bot_to_tile(i):
    x, y = tile_box(i)
    c = TILES[i][0]
    sx = COL_X[c] - 6 if c else COL_X[0] - 8
    gy = GW[1] + GW[3] / 2
    bx = BOT[0] + BOT[2] / 2
    return [(bx, BOT[1] + BOT[3]), (bx, gy), (sx, gy), (sx, y + TILE_H / 2), (x + 2, y + TILE_H / 2)]


def tile_state(i, t):
    kind = "working"
    for (tf, ti, k) in A_PINGS:
        if ti == i and t >= tf:
            kind = k
    for (ts, ti) in SERVICES:
        if ti == i and t >= ts + 0.35:
            kind = "working"
    for (ts, ti) in C_SERVICE:
        if ti == i and t >= ts + GREEN_TRAVEL:
            kind = "ok" if t < ts + GREEN_TRAVEL + OK_HOLD else "working"
    for (tf, ti, k) in FRESH:
        if ti == i and t >= tf:
            back = tf + PING_TRAVEL + 0.15 + GREEN_TRAVEL
            kind = k if t < back else ("ok" if t < back + OK_HOLD else "working")
    return kind


def pile_count(t):
    if t >= 4.6:
        return 0
    arrived = sum(1 for (tf, _, _) in A_PINGS if tf + PING_TRAVEL <= t)
    cleared = sum(1 for (ts, _) in SERVICES if ts + 0.35 <= t)
    return max(0, arrived - cleared)


def pile_pos(k):
    return PILE_X + k * (PILE_S + PILE_G), PILE_Y


def chip_fan(i):
    p = fan_ctrl(i)
    return "M{:g},{:g} C{:g},{:g} {:g},{:g} {:g},{:g}".format(*[v for pt in p for v in pt])


def draw(t, still=False):
    s = Svg(W, H)
    s.rect(0, 0, W, H, fill=BG)
    s.defs.append(f'<pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">'
                  f'<rect width="2" height="2" fill="{GRID}"/></pattern>')
    s.rect(0, 0, W, H, fill="url(#grid)")

    fan = 1 - ramp(t, 4.25, 4.75) + ramp(t, 10.75, 11.2)
    power = ramp(t, 4.4, 4.95) * (1 - ramp(t, 10.35, 10.8))
    neat = ramp(t, 4.7, 5.25) * (1 - ramp(t, 10.35, 10.75))
    ceo = ramp(t, 4.9, 5.4) * (1 - ramp(t, 10.3, 10.6))
    if still:
        fan, power, neat, ceo = 0, 1, 1, 1

    # chrome + status banner (the main meaning, in big type)
    s.text(M, 38, "BUILDING WITH GROK BOT", size=16, weight=700, fill=FG3, ls=0.12)
    s.line(M, 54, W - M, 54, stroke=DIM, sw=2)
    if ceo > 0.5:
        o = clamp((ceo - 0.5) * 2)
        s.text(M, 104, "ME: THE CEO", size=36, weight=700, fill=GREEN, ls=0.06, opacity=o)
        s.text(M, 140, "a bot per project runs the threads", size=22, fill=FG1, opacity=o)
    elif fan > 0.5:
        o = clamp((fan - 0.5) * 2)
        s.text(M, 104, "ME: THE ROUTER", size=36, weight=700, fill=AMBER, ls=0.06, opacity=o)
        s.text(M, 140, "every thread waits on me", size=22, fill=FG1, opacity=o)

    # fan wires
    if fan > 0.01:
        for i in range(6):
            waiting = tile_state(i, t) in WAITING
            s.path(chip_fan(i), stroke=AMBER if waiting else FG3, sw=2.5, opacity=fan * (0.9 if waiting else 0.45))
        for (ts, ti) in SERVICES:
            u = (t - (ts - 0.15)) / 0.5
            if 0 <= u <= 1:
                s.path(chip_fan(ti), stroke=FG1, sw=4, opacity=fan * math.sin(u * math.pi))

    # neat wires + gateway
    if neat > 0.01:
        o = neat
        bx = BOT[0] + BOT[2] / 2
        s.path(f"M{YOU_PORT[0]},{YOU_PORT[1]} V{BOT_IN[1]} H{BOT[0]}", stroke=FG1, sw=3, opacity=o)
        s.path(f"M{bx},{BOT[1] + BOT[3]} V{GW[1]}", stroke=FG2, sw=3, opacity=o)
        last = TILE_Y0 + TILE_STEP + TILE_H / 2
        for c in range(3):
            s.path(f"M{COL_X[c] + COLW / 2},{GW[1] + GW[3]} V{HEAD_Y}", stroke=FG2, sw=3, opacity=o)
            sx = COL_X[c] - 6 if c else COL_X[0] - 8
            s.path(f"M{sx},{GW[1] + GW[3]} V{last}", stroke=FAINT, sw=2, opacity=o)
        if not still:
            draw_packets(s, t)
        s.rect(GW[0], GW[1], GW[2], GW[3], fill=SINK, stroke=FG2, sw=2, opacity=o)
        s.text(W / 2, GW[1] + 30, "T3 FLEET GATEWAY", size=22, weight=700, fill=FG1, anchor="middle", ls=0.12,
               opacity=o)

    # machines + threads
    for c in range(3):
        x = COL_X[c]
        s.rect(x, HEAD_Y, COLW, HEAD_H, fill=SINK, stroke=FG2, sw=2)
        s.text(x + COLW / 2, HEAD_Y + 28, MACHINES[c], size=22, weight=700, fill=FG1, anchor="middle")
    for i in range(6):
        x, y = tile_box(i)
        kind = tile_state(i, t)
        if still:
            kind = ["ok", "working", "working", "question", "ok", "working"][i]
        hl = 0.0
        for (ts, ti) in SERVICES:
            u = (t - (ts - 0.15)) / 0.5
            if ti == i and 0 <= u <= 1 and not still:
                hl = math.sin(u * math.pi)
        edge = AMBER if kind in WAITING else (GREEN if kind == "ok" else DIM)
        if hl:
            edge = mix(edge, FG1, hl)
        s.rect(x, y, COLW, TILE_H, fill=PANEL, stroke=edge, sw=2 + hl)
        status_glyph(s, x + 10, y + 10, 32, kind)
        s.text(x + 52, y + 34, TILES[i][2], size=22, fill=FG1)

    # you
    human(s, YOU_CX, YOU_TOP, scale=YOU_SCALE)
    s.text(YOU_CX, YOU_TOP + 79 + 36, "YOU", size=30, weight=700, fill=FG1, anchor="middle", ls=0.12)

    # pile of pings waiting on me
    n = 0 if still else pile_count(t)
    if n:
        s.text(PILE_X, PILE_Y - 18, "WAITING ON ME", size=22, weight=700, fill=AMBER, ls=0.08)
        for k in range(n):
            px, py = pile_pos(k)
            s.rect(px, py, PILE_S, PILE_S, fill=AMBER_TINT, stroke=AMBER, sw=2)
            s.text(px + PILE_S / 2, py + 25, "!", size=22, weight=700, fill=AMBER, anchor="middle")
    if not still:
        left = pile_count(4.59)
        for k in range(left):
            u = ramp(t, 4.6 + k * 0.07, 5.2 + k * 0.07)
            if 0 < u < 1:
                px, py = pile_pos(k)
                tx, ty = BOT[0] + BOT[2] / 2 - PILE_S / 2, BOT[1] + BOT[3] / 2 - PILE_S / 2
                x, y = lerp(px, tx, u), lerp(py, ty, u) - math.sin(u * math.pi) * 30
                sz = PILE_S * (1 - 0.4 * u)
                s.rect(x, y, sz, sz, fill=BG, stroke=mix(AMBER, GREEN, u), sw=2)
        for (tf, ti, k) in A_PINGS:
            u = (t - tf) / PING_TRAVEL
            if 0 <= u <= 1 and fan > 0.5:
                p = fan_ctrl(ti)
                x, y = bezier((p[3], p[2], p[1], p[0]), ease(u))
                s.rect(x - 8, y - 8, 16, 16, fill=AMBER)

    # the bot
    if power > 0.01:
        bx, by, bw, bh = BOT
        hh = max(3, bh * ease(clamp(power * 1.4 - 0.2)))
        ww = bw * ease(clamp(power * 2.5))
        s.rect(bx + (bw - ww) / 2, by + bh / 2 - hh / 2, ww, hh, fill=PANEL, stroke=FG1, sw=3)
        if power > 0.85:
            o = clamp((power - 0.85) / 0.15)
            bot_face(s, bx + bw / 2, by + 40, 40)
            s.text(bx + bw / 2, by + 90, "GROK BOT", size=26, weight=700, fill=FG1, anchor="middle", ls=0.12,
                   opacity=o)
            s.text(bx + bw + 16, by + 46, "one per", size=20, fill=FG2, opacity=o)
            s.text(bx + bw + 16, by + 72, "project", size=20, fill=FG2, opacity=o)

    # a critical decision comes up to me, my direction goes back down
    route = [BOT_IN, (YOU_PORT[0], BOT_IN[1]), YOU_PORT]
    u = (t - DECISION_UP[0]) / (DECISION_UP[1] - DECISION_UP[0])
    if 0 <= u <= 1 and not still:
        x, y = poly_point(route, ease(u))
        s.rect(x - 8, y - 8, 16, 16, fill=AMBER)
    if DECISION_SHOW[0] <= t <= DECISION_SHOW[1] or still:
        lx = PILE_X + PILE_S / 2
        s.path(f"M{lx},{BOT[1] - 4} V{PILE_Y + PILE_S + 2}", stroke=AMBER, sw=3, dash="6 5")
        s.path(f"M{lx - 7},{PILE_Y + PILE_S + 12} L{lx},{PILE_Y + PILE_S + 2} L{lx + 7},{PILE_Y + PILE_S + 12}",
               stroke=AMBER, sw=3)
        s.rect(PILE_X, PILE_Y - 6, PILE_S, PILE_S, fill=AMBER_TINT, stroke=AMBER, sw=2)
        s.text(PILE_X + PILE_S / 2, PILE_Y + 19, "!", size=22, weight=700, fill=AMBER, anchor="middle")
        s.text(PILE_X + PILE_S + 12, PILE_Y + 19, "a critical decision", size=22, fill=AMBER)
    u = (t - DIRECTION_DOWN[0]) / (DIRECTION_DOWN[1] - DIRECTION_DOWN[0])
    if 0 <= u <= 1 and not still:
        x, y = poly_point(list(reversed(route)), ease(u))
        s.rect(x - 8, y - 8, 16, 16, fill=FG1)
    return s


def draw_packets(s, t):
    for (tf, ti, k) in FRESH:
        u = (t - tf) / PING_TRAVEL
        if 0 <= u <= 1:
            x, y = poly_point(list(reversed(bot_to_tile(ti))), ease(u))
            s.rect(x - 8, y - 8, 16, 16, fill=AMBER)
        u = (t - (tf + PING_TRAVEL + 0.15)) / GREEN_TRAVEL
        if 0 <= u <= 1:
            x, y = poly_point(bot_to_tile(ti), ease(u))
            s.rect(x - 8, y - 8, 16, 16, fill=GREEN)
    for (ts, ti) in C_SERVICE:
        u = (t - ts) / GREEN_TRAVEL
        if 0 <= u <= 1:
            x, y = poly_point(bot_to_tile(ti), ease(u))
            s.rect(x - 8, y - 8, 16, 16, fill=GREEN)


def frame_svg(t, still=False):
    return draw(t, still).to_string("", "", embed_fonts=False)


if __name__ == "__main__":
    from playwright.sync_api import sync_playwright

    out = Path(sys.argv[1])
    only = sys.argv[2] if len(sys.argv) > 2 else "all"
    frames = out / "frames-phone"
    frames.mkdir(parents=True, exist_ok=True)
    face = "".join(
        f"@font-face{{font-family:'{FAMILY}';font-weight:{w};"
        f"src:url('{(FONT_DIR / f'iosevka-latin-{w}-normal.woff2').as_uri()}')}}" for w in (400, 700))
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        pg = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=SCALE)
        pg.goto(out.resolve().as_uri() + "/")
        pg.set_content(f"<html><head><style>{face} body{{margin:0;background:#000}} svg{{display:block}}</style>"
                       f"</head><body><div id=s></div></body></html>")
        for w in (400, 700):
            pg.evaluate(f"document.fonts.load('{w} 16px \"{FAMILY}\"')")
        pg.wait_for_timeout(300)

        def shot(svg, dest):
            pg.evaluate("s => { document.getElementById('s').innerHTML = s }", svg)
            pg.evaluate("document.fonts.ready")
            pg.screenshot(path=str(dest), clip={"x": 0, "y": 0, "width": W, "height": H})

        if only in ("all", "frames"):
            for k in range(N):
                shot(frame_svg(k / FPS), frames / f"f{k:04d}.png")
        if only in ("all", "poster"):
            shot(frame_svg(8.9, still=True), out / "poster-phone.png")
        b.close()
    print("ok", N)
