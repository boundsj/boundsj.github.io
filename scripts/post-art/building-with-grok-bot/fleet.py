"""Figures 1 and 2: me as the router (before) vs me as the CEO (after).

Same canvas and the same twelve threads on three machines, so the two read as a pair.
Grounded in the draft: projects (news reader, game, research desk), agents (Codex, Claude Code),
machines (macOS boxes and a Linux box; iOS work only makes sense on macOS), the per-thread chores,
"one thread, maybe up to five", and the CEO verbs.
"""
from __future__ import annotations

from lib import *  # noqa: F401,F403
from lib import Svg, bot_face, chip, chip_width, chrome, human, label, measure, screen, status_glyph

PROJECT = {"news": "news reader", "game": "game", "desk": "research desk"}

BEFORE = [
    [("news", "codex", "done", "turn finished"), ("game", "claude", "question", "has a question"),
     ("desk", "codex", "working", "working"), ("news", "claude", "idle", "what's next?")],
    [("game", "codex", "working", "working"), ("desk", "claude", "done", "turn finished"),
     ("news", "codex", "question", "has a question"), ("game", "claude", "idle", "what's next?")],
    [("desk", "codex", "working", "working"), ("news", "claude", "done", "turn finished"),
     ("desk", "claude", "question", "has a question"), ("ios", "", "wrong", "wrong machine")],
]
AFTER = [
    [("news", "codex", "ok", "turn read"), ("game", "claude", "ok", "answered"),
     ("desk", "codex", "working", "working"), ("ios", "", "ok", "right machine")],
    [("game", "codex", "working", "working"), ("desk", "claude", "ok", "merged"),
     ("news", "codex", "ok", "built"), ("game", "claude", "ok", "next step sent")],
    [("desk", "codex", "working", "working"), ("news", "claude", "ok", "released"),
     ("desk", "claude", "ok", "turn read"), ("news", "codex", "working", "working")],
]
MACHINES = ["macOS", "macOS", "Linux"]
CHORES = ["start it on the right machine", "notice when a turn finishes", "read what it did",
          "answer its questions", "decide what to do next"]
CEO = ["set direction", "judge results", "give feedback", "decide when we're done"]
WAITING = ("done", "question", "idle", "wrong")

DESKTOP = dict(W=1200, m=48, gap=24, chrome=17, you_cx=124, you_scale=1.15, you_fs=26, tx=250, lab=16,
               chip=19, chip_h=40, row_gap=10, cell=40, cell_gap=8, bot_h=96, bot_face=30, bot_name=21,
               bot_sub=17, duties=17, gw_h=44, mach_h=46, mach_fs=20, tile_h=50, tile_gap=12, tile_fs=19,
               tile_status=17, glyph=30, mobile=False)
MOBILE = dict(W=560, m=16, gap=8, chrome=15, you_cx=64, you_scale=0.9, you_fs=22, tx=16, lab=15,
              chip=19, chip_h=40, row_gap=8, cell=34, cell_gap=6, bot_h=124, bot_face=26, bot_name=19,
              bot_sub=16, duties=17, gw_h=44, mach_h=54, mach_fs=19, tile_h=74, tile_gap=8, tile_fs=18,
              tile_status=17, glyph=26, mobile=True)


def flow_chips(s: Svg, items, x0, x1, y, L, prefix_color, draw=True):
    x = x0
    for it in items:
        w = chip_width(it, size=L["chip"], prefix=">")
        if x + w > x1 and x > x0:
            x = x0
            y += L["chip_h"] + L["row_gap"]
        if draw:
            chip(s, x, y, it, size=L["chip"], h=L["chip_h"], prefix=">", prefix_color=prefix_color, color=FG1)
        x += w + L["row_gap"]
    return y + L["chip_h"]


def tile(s: Svg, L, x, y, w, t):
    proj, agent, kind, status = t
    h = L["tile_h"]
    edge = AMBER if kind in WAITING else (DIM if kind == "working" else GREEN)
    s.rect(x, y, w, h, fill=PANEL, stroke=edge, sw=2, dash="7 5" if kind == "wrong" else None)
    g = L["glyph"]
    lab = ("iOS task" if L["mobile"] else "an iOS task") if proj == "ios" else f"{proj} · {agent}"
    sc = AMBER if kind in WAITING else (GREEN if kind == "ok" else FG3)
    if L["mobile"]:
        status_glyph(s, x + 10, y + 10, g, kind)
        s.text(x + 18 + g, y + 10 + g / 2 + L["tile_fs"] * 0.35, lab, size=L["tile_fs"], fill=FG1)
        s.text(x + 10, y + h - 13, status, size=L["tile_status"], fill=sc)
    else:
        status_glyph(s, x + 10, y + (h - g) / 2, g, kind)
        base = y + h / 2 + L["tile_fs"] * 0.34
        s.text(x + 22 + g, base, lab, size=L["tile_fs"], fill=FG1)
        s.text(x + w - 14, base, status, size=L["tile_status"], fill=sc, anchor="end")


def layout(L):
    """One vertical flow shared by both modes, so the machine grid lines up across the pair."""
    W, m = L["W"], L["m"]
    g = {}
    g["you_top"] = 104 if not L["mobile"] else 92
    you_h = (9 + 7.5) * 4 * L["you_scale"]
    g["you_label"] = g["you_top"] + you_h + 34
    g["you_port"] = g["you_label"] + 14
    if L["mobile"]:
        g["chips_y"] = g["you_port"] + 30
        g["chips_x"] = m
    else:
        g["chips_y"] = g["you_top"] + 22
        g["chips_x"] = L["tx"]
    end_b = flow_chips(None, CHORES, g["chips_x"], W - m, g["chips_y"], L, AMBER, draw=False)
    end_a = flow_chips(None, CEO, g["chips_x"], W - m, g["chips_y"], L, GREEN, draw=False)
    g["meter_y"] = max(end_b, end_a) + 40
    g["meter_x"] = m if L["mobile"] else L["tx"]
    meter_end = g["meter_y"] + 18 + L["cell"] + 26 + (24 if L["mobile"] else 0)
    g["trunk_y"] = meter_end + (56 if L["mobile"] else 50)
    g["bots_y"] = g["trunk_y"] + 34
    g["duties_y"] = g["bots_y"] + L["bot_h"] + 32
    g["gw_label_y"] = g["duties_y"] + (22 if L["mobile"] else 0) + 40
    g["gw_y"] = g["gw_label_y"] + 14
    g["mach_y"] = g["gw_y"] + L["gw_h"] + 40
    g["tile_y"] = g["mach_y"] + L["mach_h"] + 12
    g["H"] = g["tile_y"] + 4 * (L["tile_h"] + L["tile_gap"]) - L["tile_gap"] + (20 if L["mobile"] else 34)
    cols = 3
    cw = (W - 2 * m - (cols - 1) * L["gap"]) / cols
    g["cw"] = cw
    g["colx"] = [m + i * (cw + L["gap"]) for i in range(cols)]
    return g


def figure(mode: str, mobile: bool) -> str:
    L = MOBILE if mobile else DESKTOP
    W, m = L["W"], L["m"]
    g = layout(L)
    before = mode == "before"
    s = Svg(W, int(g["H"]))
    screen(s)
    wires_at = s.layer()
    if mobile:
        chrome(s, "BEFORE: ME AS THE ROUTER" if before else "AFTER: ME AS THE CEO", "", margin=m, size=L["chrome"])
    else:
        chrome(s, "BEFORE · ME AS THE ROUTER" if before else "AFTER · ME AS THE CEO",
               "EVERY THREAD WAITS ON ME" if before else "BOTS WATCH THE THREADS", margin=m, size=L["chrome"])

    # ---- me + my job ------------------------------------------------------------
    human(s, L["you_cx"], g["you_top"], scale=L["you_scale"])
    s.text(L["you_cx"], g["you_label"], "ME", size=L["you_fs"], weight=700, fill=FG1, anchor="middle", ls=0.12)
    head = "FOR EVERY THREAD, I HAVE TO:" if before else "MY JOB:"
    if mobile:
        lx = L["you_cx"] + 64
        s.text(lx, g["you_top"] + 30, "FOR EVERY THREAD," if before else "MY JOB,", size=L["lab"], weight=700,
               fill=FG3, ls=0.1)
        s.text(lx, g["you_top"] + 56, "I HAVE TO:" if before else "AS THE CEO:", size=L["lab"], weight=700,
               fill=FG3, ls=0.1)
    else:
        s.text(L["tx"], g["you_top"] + 6, head, size=L["lab"], weight=700, fill=FG3, ls=0.1)
    flow_chips(s, CHORES if before else CEO, g["chips_x"], W - m, g["chips_y"], L, AMBER if before else GREEN)

    # ---- attention (before) / what reaches me (after) ------------------------------
    x0, y = g["meter_x"], g["meter_y"]
    if before:
        s.text(x0, y + 4, "MY ATTENTION, ONE CELL PER THREAD", size=L["lab"], weight=700, fill=FG3, ls=0.1)
        n = 12
        cell = min(L["cell"], ((W - m) - x0 - (n - 1) * L["cell_gap"]) / n)
        step = cell + L["cell_gap"]
        cy = y + 18
        for i in range(n):
            cx = x0 + i * step
            if i == 0:
                s.rect(cx, cy, cell, cell, fill=FG1)
            elif i < 5:
                s.rect(cx, cy, cell, cell, fill=FG2, opacity=0.7)
            else:
                s.rect(cx, cy, cell, cell, fill=AMBER_TINT, stroke=AMBER, sw=2, dash="4 3")
                s.text(cx + cell / 2, cy + cell / 2 + 7, "!", size=20, weight=700, fill=AMBER, anchor="middle")
        ty = cy + cell + 26
        if mobile:
            label(s, x0, ty, "1: fine. up to 5: ok.", size=17, fill=FG2, weight=400, ls=0, pad=3)
            label(s, x0, ty + 24, "beyond that, things break down", size=17, fill=AMBER, weight=400, ls=0, pad=3)
        else:
            s.text(x0, ty, "1: fine", size=17, fill=FG2)
            s.text(x0 + step + (4 * step - L["cell_gap"]) / 2, ty, "up to 5: ok", size=17, fill=FG2, anchor="middle")
            s.text(x0 + 5 * step, ty, "beyond that, things break down", size=17, fill=AMBER)
    else:
        s.text(x0, y + 4, "WHAT REACHES ME", size=L["lab"], weight=700, fill=FG3, ls=0.1)
        s.rect(x0, y + 20, 14, 14, fill=AMBER)
        if mobile:
            s.text(x0 + 24, y + 33, "critical decisions only,", size=18, fill=FG1)
            s.text(x0 + 24, y + 57, "and I define critical", size=18, fill=FG2)
        else:
            s.text(x0 + 24, y + 33, "critical decisions only, and I define critical", size=18, fill=FG1)

    cw, colx = g["cw"], g["colx"]
    tiles = []
    data = BEFORE if before else AFTER
    for c in range(3):
        for r, t in enumerate(data[c]):
            tiles.append((colx[c], g["tile_y"] + r * (L["tile_h"] + L["tile_gap"]), cw, t))

    # ---- wires (under everything) --------------------------------------------------
    ox, oy = L["you_cx"], g["you_port"]
    if mobile:
        # On a phone the job/attention blocks sit under me, so wiring starts below them.
        oy = g["meter_y"] + (18 + L["cell"] + 26 + 24 + 14 if before else 66)

    def wires():
        if before:
            # one cable drops from me, then explodes into a wire per thread
            drop = g["trunk_y"] + 20
            for (x, ty, w, t) in tiles:
                py = ty + L["tile_h"] / 2
                waiting = t[2] in WAITING
                s.path(f"M{ox:g},{oy:g} C{ox:g},{drop + 90:g} {x - 70:g},{py - 120:g} {x + 2:g},{py:g}",
                       stroke=AMBER if waiting else FG3, sw=2, opacity=0.85 if waiting else 0.45)
        else:
            t_y, b_y = g["trunk_y"], g["bots_y"]
            mids = [x + cw / 2 for x in colx]
            s.path(f"M{ox - 14:g},{oy:g} V{t_y:g} H{mids[2]:g}", stroke=FG1, sw=3)
            for mx in mids:
                s.path(f"M{mx:g},{t_y:g} V{b_y:g}", stroke=FG1, sw=3)
                s.path(f"M{mx:g},{b_y + L['bot_h']:g} V{g['gw_y']:g}", stroke=FG2, sw=3)
                s.path(f"M{mx:g},{g['gw_y'] + L['gw_h']:g} V{g['mach_y']:g}", stroke=FG2, sw=3)
            last = g["tile_y"] + 3 * (L["tile_h"] + L["tile_gap"]) + L["tile_h"] / 2
            for x in colx:
                s.path(f"M{x + 24:g},{g['mach_y'] + L['mach_h']:g} V{last:g}", stroke=FAINT, sw=2)
            # the decision channel back up, hopping over the trunk
            dx = ox + 22
            s.line(dx, t_y - 9, dx, t_y + 9, stroke=BG, sw=10)
            s.path(f"M{dx:g},{b_y:g} V{oy + 6:g}", stroke=AMBER, sw=3, dash="8 6")
            s.path(f"M{dx - 8:g},{oy + 18:g} L{dx:g},{oy + 6:g} L{dx + 8:g},{oy + 18:g}", stroke=AMBER, sw=3)

    s.under(wires_at, wires)

    # ---- bots + gateway (after) ----------------------------------------------------
    if not before:
        dx = ox + 22
        label(s, dx + 14, (g["trunk_y"] + oy) / 2 + 26 if not mobile else g["trunk_y"] - 16, "decisions",
              size=15, fill=AMBER, weight=700, ls=0.06)
        if not mobile:
            label(s, L["tx"], g["trunk_y"] - 18, "PROJECT MANAGER · ONE GROK BOT PER PROJECT", size=L["lab"])
        else:
            label(s, colx[1] + 4, g["trunk_y"] - 16, "ONE BOT PER PROJECT", size=L["lab"])
        for c, key in enumerate(["news", "game", "desk"]):
            x, by = colx[c], g["bots_y"]
            s.rect(x, by, cw, L["bot_h"], fill=PANEL, stroke=FG1, sw=3)
            if mobile:
                bot_face(s, x + cw / 2, by + 30, L["bot_face"])
                s.text(x + cw / 2, by + 76, f"{key.upper()} BOT", size=L["bot_name"], weight=700, fill=FG1,
                       anchor="middle", ls=0.06)
                s.text(x + cw / 2, by + 104, PROJECT[key], size=L["bot_sub"], fill=FG3, anchor="middle")
            else:
                bot_face(s, x + 62, by + L["bot_h"] / 2, L["bot_face"])
                s.text(x + 124, by + 44, f"{key.upper()} BOT", size=L["bot_name"], weight=700, fill=FG1, ls=0.08)
                s.text(x + 124, by + 72, PROJECT[key], size=L["bot_sub"], fill=FG3)
        if mobile:
            label(s, m + 2, g["duties_y"], "they prompt the agents, pick the machine,", size=L["duties"], fill=FG2,
                  weight=400, ls=0)
            label(s, m + 2, g["duties_y"] + 22, "read every turn, merge, build, release", size=L["duties"], fill=FG2,
                  weight=400, ls=0)
            label(s, m, g["gw_label_y"], "FOUNDATION", size=L["lab"])
        else:
            label(s, W / 2, g["duties_y"],
                  "they prompt the agents · pick the machine · read every turn · merge, build, release",
                  size=L["duties"], fill=FG2, weight=400, ls=0, anchor="middle")
            label(s, m, g["gw_label_y"], "FOUNDATION · T3 FLEET GATEWAY + T3 CODE", size=L["lab"])
        s.rect(m, g["gw_y"], W - 2 * m, L["gw_h"], fill=SINK, stroke=FG2, sw=2)
        s.text(W / 2, g["gw_y"] + L["gw_h"] / 2 + 7, "T3 FLEET GATEWAY · MCP", size=19, weight=700, fill=FG1,
               anchor="middle", ls=0.12)

    # ---- machines + tiles ----------------------------------------------------------
    for c in range(3):
        x, my = colx[c], g["mach_y"]
        s.rect(x, my, cw, L["mach_h"], fill=SINK, stroke=FG2, sw=2)
        if mobile:
            s.text(x + cw / 2, my + 24, MACHINES[c], size=L["mach_fs"], weight=700, fill=FG1, anchor="middle")
            s.text(x + cw / 2, my + 45, "T3 CODE", size=14, weight=700, fill=FG3, anchor="middle", ls=0.12)
        else:
            s.text(x + 14, my + L["mach_h"] / 2 + 7, MACHINES[c], size=L["mach_fs"], weight=700, fill=FG1)
            s.text(x + cw - 14, my + L["mach_h"] / 2 + 6, "T3 CODE", size=15, weight=700, fill=FG3, anchor="end",
                   ls=0.12)
    for (x, ty, w, t) in tiles:
        tile(s, L, x, ty, w, t)

    if before:
        title = "Before: me as the router between every agent thread"
        desc = ("A dark terminal-style diagram. A blocky figure labelled Me sits at the top left. Beside it, the "
                "chores I have to do for every thread: start it on the right machine, notice when a turn finishes, "
                "read what it did, answer its questions, decide what to do next. Below, twelve attention cells, one "
                "per thread: the first is fine, up to five are OK, and the rest are amber warnings labelled beyond "
                "that, things break down. At the bottom are three machines, two macOS and one Linux, each running "
                "T3 Code with four agent threads for the news reader, game and research desk projects on Codex or "
                "Claude. A cable drops from me and splits into a tangle of wires, one to every thread. Most "
                "threads are amber and waiting on me: turn finished, has a question, what's next. One dashed "
                "thread is an iOS task sitting on the Linux machine, the wrong machine.")
    else:
        title = "After: me as the CEO of a team of project bots"
        desc = ("The same terminal-style diagram and the same twelve threads. Me at the top left now has a short "
                "job: set direction, judge results, give feedback, decide when we're done. What reaches me is "
                "critical decisions only, and I define critical. One clean wire runs from me to three persistent "
                "Grok Bot project managers, a news bot, a game bot and a desk bot, one per project. They prompt "
                "the agents, pick the machine, read every turn, merge, build and release. A dashed amber line "
                "labelled decisions runs back up to me. Below them, the T3 Fleet Gateway bar connects to the same "
                "two macOS machines and one Linux machine running T3 Code. The threads are now green or working: "
                "turn read, answered, merged, built, released, next step sent, and the iOS task is on a macOS "
                "machine.")
    return s.to_string(title, desc)


if __name__ == "__main__":
    import sys
    from pathlib import Path
    out = Path(sys.argv[1])
    for name, mode in (("router-before", "before"), ("ceo-after", "after")):
        (out / f"{name}.svg").write_text(figure(mode, False))
        (out / f"{name}-mobile.svg").write_text(figure(mode, True))
    print("ok")
