"""Figure 3: Botons, set up my way.

A "build a Boton" screen: one Boton in the middle, four setup panels plugged into it, and a small team
below. Every option shown is a documented Botons feature (github.com/boundsj/botons, docs/brains.md,
api-keys.md, connectors.md, using-botons.md, routines.md):
  brain   - my Claude Code or Codex CLI, or a model on my own Anthropic/OpenAI API key (with spending caps)
  role    - each Boton has a role and its own instructions (starters include "Chief of staff")
  tools   - only the connectors I give it: MCP servers such as a fleet gateway, GitHub, Notion; the managed browser
  workflow- skills from my library, routines on a schedule or a webhook, Ask first rules for risky steps
  each Boton has its own chat, memory and workspace.
The team roles (research, review, inbox) are the Botons README's own examples, shown as an illustration
of mixing choices, not as anyone's real setup. Selected values are examples too.
"""
from __future__ import annotations

from lib import *  # noqa: F401,F403
from lib import Svg, boton, human, lift, measure, screen


def radio(s, x, y, on):
    s.circle(x, y, 10, fill="none", stroke=GREEN if on else FG3, sw=2.5)
    if on:
        s.circle(x, y, 5, fill=GREEN)


def toggle(s, x, y, on):
    s.rect(x, y - 12, 44, 24, fill=GREEN_TINT if on else PANEL, stroke=GREEN if on else FAINT, sw=2)
    s.rect(x + (24 if on else 4), y - 8, 16, 16, fill=GREEN if on else FAINT)


def card(s, x, y, w, kind, fs=19, small=16):
    """Draw one setup panel; returns its height."""
    titles = {"brain": ("1", "BRAIN / MODEL"), "role": ("2", "ROLE + INSTRUCTIONS"),
              "tools": ("3", "TOOLS"), "flow": ("4", "WORKFLOW")}
    num, title = titles[kind]
    rows = 4
    row = fs + 17
    h = 50 + rows * row + 34
    s.rect(x, y, w, h, fill=PANEL, stroke=FG2, sw=2)
    s.rect(x, y, w, 40, fill=SINK, stroke=FG2, sw=2)
    s.rect(x, y, 40, 40, fill=GREEN)
    s.text(x + 20, y + 28, num, size=20, weight=700, fill=BG, anchor="middle")
    s.text(x + 54, y + 27, title, size=17, weight=700, fill=FG1, ls=0.1)
    ry = y + 50 + row / 2 + 4
    if kind == "brain":
        for i, (lab, on) in enumerate([("Claude Code", True), ("Codex", False), ("a model on my API key", False)]):
            radio(s, x + 26, ry + i * row - 6, on)
            s.text(x + 48, ry + i * row, lab, size=fs, fill=FG1 if on else FG2)
        s.text(x + 48, ry + 3 * row - 10, "Anthropic or OpenAI", size=small, fill=FG3)
        s.text(x + 18, ry + 4 * row - 2, "+ spending caps on API keys", size=small, fill=FG3)
    elif kind == "role":
        s.text(x + 18, ry, "ROLE", size=small, weight=700, fill=FG3, ls=0.1)
        cw = measure("chief of staff", fs) + 24
        s.rect(x + 86, ry - fs - 2, cw, fs + 14, fill=GREEN_TINT, stroke=GREEN, sw=2)
        s.text(x + 98, ry + 2, "chief of staff", size=fs, fill=FG1)
        s.text(x + 18, ry + row + 4, "INSTRUCTIONS, IN MY WORDS", size=small, weight=700, fill=FG3, ls=0.1)
        bx, by = x + 18, ry + row + 18
        s.rect(bx, by, w - 36, row * 2.35, fill=BG, stroke=FAINT, sw=2)
        for i, f in enumerate([0.78, 0.62, 0.45]):
            s.rect(bx + 14, by + 16 + i * 22, (w - 64) * f, 9, fill=FG3, opacity=0.6)
        s.rect(bx + 14 + (w - 64) * 0.45 + 6, by + 56, 9, 16, fill=GREEN)
    elif kind == "tools":
        for i, (lab, on) in enumerate([("T3 fleet gateway", True), ("GitHub", True), ("Notion", True),
                                       ("managed browser", False)]):
            toggle(s, x + 18, ry + i * row - 6, on)
            s.text(x + 76, ry + i * row, lab, size=fs, fill=FG1 if on else FG2)
        s.text(x + 18, ry + 4 * row - 2, "only the connectors I give it", size=small, fill=FG3)
    else:
        items = [("SKILLS", "from my library"), ("ROUTINE", "every 15 min"), ("OR", "when a webhook calls"),
                 ("ASK FIRST", "before risky steps")]
        for i, (k, v) in enumerate(items):
            s.text(x + 18, ry + i * row, k, size=small, weight=700, fill=FG3, ls=0.1)
            s.text(x + w - 18, ry + i * row, v, size=fs, fill=FG1, anchor="end")
        s.text(x + 18, ry + 4 * row - 2, "how and when it works", size=small, fill=FG3)
    return h


def team(s, cx, y, spread, r=24, fs=18, small=16):
    members = [("research", "Claude Code"), ("review", "Codex"), ("inbox", "API key")]
    for i, (role, brain) in enumerate(members):
        x = cx + (i - 1) * spread
        boton(s, x, y, r)
        s.text(x, y + r + 32, role, size=fs, weight=700, fill=FG1, anchor="middle")
        s.text(x, y + r + 56, brain, size=small, fill=FG3, anchor="middle")


def figure(mobile: bool) -> str:
    if not mobile:
        W, H, m = 1200, 820, 48
        s = Svg(W, H)
        screen(s)
        wires_at = s.layer()
        human(s, 84, 92, scale=0.8)
        s.text(84, 182, "ME", size=22, weight=700, fill=FG1, anchor="middle", ls=0.12)
        s.text(150, 128, "I SET UP EACH BOTON", size=24, weight=700, fill=FG1, ls=0.08)
        s.text(150, 160, "its brain, its role, its tools, and how it works", size=19, fill=FG2)
        cw = 376
        lx, rx = m, W - m - cw
        y1, y2 = 214, 452
        h1 = card(s, lx, y1, cw, "brain")
        card(s, lx, y2, cw, "role")
        card(s, rx, y1, cw, "tools")
        card(s, rx, y2, cw, "flow")
        cx, cy, r = W / 2, 430, 74
        boton(s, cx, cy, r, glow=True)
        s.text(cx, cy + r + 46, "A BOTON", size=22, weight=700, fill=FG1, anchor="middle", ls=0.14)
        s.text(cx, cy + r + 74, "its own chat,", size=17, fill=FG3, anchor="middle")
        s.text(cx, cy + r + 96, "memory, workspace", size=17, fill=FG3, anchor="middle")

        def wires():
            for (sx, sy, side) in [(lx + cw, y1 + h1 / 2, -1), (lx + cw, y2 + h1 / 2, -1),
                                   (rx, y1 + h1 / 2, 1), (rx, y2 + h1 / 2, 1)]:
                ex = cx + side * (r + 14)
                ey = cy + (-30 if sy < cy else 30)
                mx = (sx + ex) / 2
                s.path(f"M{sx},{sy} H{mx} V{ey} H{ex}", stroke=GREEN, sw=3, opacity=0.85)
                s.rect(sx - 5 if side < 0 else sx - 5, sy - 5, 10, 10, fill=GREEN)
        s.under(wires_at, wires)

        ty = y2 + h1 + 44
        s.line(m, ty, W - m, ty, stroke=DIM, sw=2)
        s.text(m, ty + 36, "MY TEAM: MIX AND MATCH, PER BOTON", size=16, weight=700, fill=FG3, ls=0.1)
        team(s, W / 2 + 120, ty + 64, 230)
        s.h = int(ty + 64 + 24 + 70)
    else:
        W, m = 560, 16
        s = Svg(W, 10)
        screen(s)
        wires_at = s.layer()
        human(s, 50, 88, scale=0.7)
        s.text(50, 166, "ME", size=20, weight=700, fill=FG1, anchor="middle", ls=0.12)
        s.text(104, 112, "I SET UP EACH BOTON", size=21, weight=700, fill=FG1, ls=0.06)
        s.text(104, 140, "its brain, its role, its tools,", size=18, fill=FG2)
        s.text(104, 164, "and how it works", size=18, fill=FG2)
        cx, cy, r = W / 2, 290, 58
        boton(s, cx, cy, r, glow=True)
        s.text(cx, cy + r + 38, "A BOTON", size=21, weight=700, fill=FG1, anchor="middle", ls=0.14)
        s.text(cx, cy + r + 64, "its own chat, memory, workspace", size=17, fill=FG3, anchor="middle")
        y = cy + r + 96
        cw = W - 2 * m - 24
        cx0 = m + 24
        tops = []
        for kind in ("brain", "role", "tools", "flow"):
            h = card(s, cx0, y, cw, kind, fs=19, small=17)
            tops.append(y + 20)
            y += h + 18
        spine = m + 8

        def wires():
            s.path(f"M{cx - r - 12},{cy} H{spine} V{tops[-1]}", stroke=GREEN, sw=3, opacity=0.85)
            for t in tops:
                s.path(f"M{spine},{t} H{cx0}", stroke=GREEN, sw=3, opacity=0.85)
        s.under(wires_at, wires)
        s.line(m, y + 8, W - m, y + 8, stroke=DIM, sw=2)
        s.text(m, y + 42, "MY TEAM: MIX AND MATCH", size=16, weight=700, fill=FG3, ls=0.1)
        team(s, W / 2, y + 96, 176, r=22, fs=18, small=16)
        s.h = int(y + 96 + 22 + 72)

    lift(s, 44)  # no top label row: the content moves up into its space
    s.parts[0] = f'<rect x="0" y="0" width="{W}" height="{s.h}" fill="{BG}" />'
    s.parts[1] = f'<rect x="0" y="0" width="{W}" height="{s.h}" fill="url(#grid)" />'
    title = "Botons customization"
    desc = ("A dark terminal-style setup screen. At the top, a blocky figure labelled Me: I set up each Boton, its "
            "brain, its role, its tools, and how it works. In the middle, a round, button-shaped Boton with a green "
            "antenna, with its own chat, memory and workspace. Four numbered panels plug into it with green wires. "
            "One, brain or model: Claude Code is selected, with Codex and a model on my own Anthropic or OpenAI "
            "API key as the other choices, plus spending caps on API keys. Two, role and instructions: the role chief of staff and a "
            "box of instructions in my words. Three, tools: switches for a T3 fleet gateway, GitHub and Notion "
            "turned on, and the managed browser off, only the connectors I give it. Four, workflow: skills from my "
            "library, a routine every 15 minutes or when a webhook calls, and Ask first before risky steps. Below, "
            "my team, mix and match per Boton: three Botons for research on Claude Code, review on Codex, and "
            "inbox on an API key.")
    return s.to_string(title, desc)


if __name__ == "__main__":
    import sys
    from pathlib import Path
    out = Path(sys.argv[1])
    (out / "botons-setup.svg").write_text(figure(False))
    (out / "botons-setup-mobile.svg").write_text(figure(True))
    print("ok")
