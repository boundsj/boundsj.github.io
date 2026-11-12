"""Gateway usage chart: what the outer loop coordinates through T3 Fleet Gateway.

Data: gateway-usage.json (the 2026-11-12 snapshot; the source of every number drawn here).
Two stacked bars with different denominators, never merged: all gateway events (8,461) and jobs
the gateway started or tracked (376), split by the client that started each job. A bracket marks
the two named outer-loop buckets (Grok Bot + Minions/Botons = 87% of events).

Colour (validated with the dataviz skill's validate_palette.js on the #0C0C0A chart surface):
Grok Bot #3C96CF and Minions/Botons #D07A35 pass lightness band, chroma, CVD (dE 21) and contrast;
Adopted/standing and Other/test are deliberate neutrals (#8C8775, and #6E6A5E with a hatch), both
>= 3:1 on the surface. Identity never rests on colour alone: legend, direct labels, and the post's
table. Segments are separated by a 2 px surface gap.

usage: chart.py OUT_DIR -> usage-summary.svg, usage-detail.svg, usage-detail-mobile.svg
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from lib import *  # noqa: F401,F403
from lib import Svg, label, measure, screen

DATA = json.loads(Path(__file__).with_name("gateway-usage.json").read_text())
GROUPS = DATA["groups"]
EV, EV_T = DATA["events"]["by_group"], DATA["events"]["total"]
JB, JB_T = DATA["jobs"]["by_group"], DATA["jobs"]["total"]
assert sum(EV) == EV_T == 8461 and sum(JB) == JB_T == 376
assert DATA["jobs"]["launched"] + DATA["jobs"]["adopted"] == JB_T
OUTER = EV[0] + EV[1]
assert OUTER == 7368 and round(OUTER / EV_T * 100) == 87 and round(EV[0] / EV_T * 100) == 68
COLORS = ["#3C96CF", "#D07A35", "#8C8775", "#6E6A5E"]
GAP = 2


def n(v):
    return f"{v:,}"


def pct(v, t, d=0):
    return f"{v / t * 100:.{d}f}%"


def wrap(text, width, size, weight=400):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if measure(t, size, weight) <= width or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    return lines + [cur]


def defs(s):
    s.defs.append('<pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" '
                  'patternTransform="rotate(45)"><rect width="8" height="8" fill="#6E6A5E"/>'
                  '<rect width="3" height="8" fill="#4E4B42"/></pattern>')


def bar(s, x, y, w, h, values, total):
    """A stacked bar; returns each segment's (x, width) before the gap."""
    segs, cx = [], x
    for i, v in enumerate(values):
        sw = w * v / total
        draw = sw - (GAP if i < len(values) - 1 else 0)
        s.rect(cx, y, max(draw, 1), h, fill="url(#hatch)" if i == 3 else COLORS[i])
        segs.append((cx, draw))
        cx += sw
    return segs


def seg_labels(s, segs, idxs, values, total, y, vs, ps, d, right):
    for i in idxs:
        x, w = segs[i]
        cx = min(x + w / 2, right - measure(n(values[i]), vs, 700) / 2)
        s.text(cx, y, n(values[i]), size=vs, weight=700, fill=FG1, anchor="middle")
        s.text(cx, y + ps + 6, pct(values[i], total, d), size=ps, fill=FG2, anchor="middle")


def bracket(s, x0, x1, y, text, size):
    s.path(f"M{x0 + 1},{y + 9} V{y} H{x1 - 1} V{y + 9}", stroke=FG2, sw=2)
    label(s, (x0 + x1) / 2, y + 6, text, size=size, fill=FG1, weight=700, ls=0.06, anchor="middle", pad=8)


def legend_row(s, x, y, size, gap=18):
    for i, g in enumerate(GROUPS):
        s.rect(x, y - size * 0.8, size * 0.85, size * 0.85, fill="url(#hatch)" if i == 3 else COLORS[i])
        s.text(x + size + 4, y, g, size=size, fill=FG1)
        x += size + 4 + measure(g, size) + gap


def summary() -> str:
    W, m = 600, 20
    s = Svg(W, 10)
    screen(s)
    defs(s)
    s.text(m, 30, "T3 FLEET GATEWAY", size=17, weight=700, fill=FG3, ls=0.12)
    s.text(W - m, 30, "OCT 7 – NOV 12, 2026", size=17, weight=700, fill=FG3, anchor="end", ls=0.06)
    s.line(m, 44, W - m, 44, stroke=DIM, sw=2)
    s.text(m, 86, f"{n(EV_T)} gateway events", size=30, weight=700, fill=FG1)
    s.text(m, 116, f"{pct(OUTER, EV_T)} from Grok Bot and Minions/Botons jobs", size=20, fill=FG2)
    bw = W - 2 * m
    s.text(m, 160, "ALL EVENTS", size=19, weight=700, fill=FG3, ls=0.1)
    s.text(W - m, 160, n(EV_T), size=21, weight=700, fill=FG1, anchor="end")
    segs = bar(s, m, 206, bw, 36, EV, EV_T)
    bracket(s, m, segs[1][0] + segs[1][1], 188, f"OUTER LOOP {n(OUTER)} · {pct(OUTER, EV_T)}", 17)
    seg_labels(s, segs, [0, 1, 2], EV, EV_T, 268, 21, 18, 0, W - m)
    s.text(m, 336, "JOBS STARTED OR TRACKED", size=19, weight=700, fill=FG3, ls=0.1)
    s.text(W - m, 336, n(JB_T), size=21, weight=700, fill=FG1, anchor="end")
    segs = bar(s, m, 348, bw, 36, JB, JB_T)
    seg_labels(s, segs, [0, 1], JB, JB_T, 410, 21, 18, 0, W - m)
    legend_row(s, m, 470, 17, gap=14)
    s.h = 490
    fix_bg(s, W)
    return s.to_string(
        "Summary: gateway usage, Oct 7 to Nov 12, 2026",
        "Summary chart of T3 Fleet Gateway usage from October 7 to November 12, 2026. All events: 8,461, of "
        "which Grok Bot jobs 5,754 (68%), Minions/Botons 1,614 (19%), adopted/standing 946 (11%) and other/test "
        "147 (2%). A bracket marks the outer loop, Grok Bot plus Minions/Botons: 7,368 events, 87%. Jobs started "
        "or tracked: 376, of which Grok Bot 293 (78%), Minions/Botons 61 (16%), adopted/standing 10 and "
        "other/test 12.")


def detail(mobile: bool) -> str:
    W, m = (560, 16) if mobile else (1200, 48)
    s = Svg(W, 10)
    screen(s)
    defs(s)
    bw = W - 2 * m
    hs, ss, sec, vs, ps, ns = (26, 18, 18, 21, 17, 16) if mobile else (36, 22, 19, 23, 19, 17)
    s.text(m, 40 if mobile else 46, "T3 FLEET GATEWAY USAGE", size=15 if mobile else 17, weight=700, fill=FG3, ls=0.12)
    if not mobile:
        s.text(W - m, 46, "OCT 7 – NOV 12, 2026", size=17, weight=700, fill=FG3, anchor="end", ls=0.06)
    y = 58 if mobile else 64
    s.line(m, y, W - m, y, stroke=DIM, sw=2)
    y += 50 if mobile else 58
    head = [f"{n(EV_T)} gateway events,", f"{n(JB_T)} jobs"] if mobile else [f"{n(EV_T)} gateway events, {n(JB_T)} jobs"]
    for line in head:
        s.text(m, y, line, size=hs, weight=700, fill=FG1)
        y += hs + 8
    sub = (f"Jobs started by Grok Bot and Minions/Botons account for {n(OUTER)} events, or "
           f"{pct(OUTER, EV_T)}. Oct 7 – Nov 12, 2026.")
    for line in wrap(sub, bw, ss):
        s.text(m, y + 2, line, size=ss, fill=FG2)
        y += ss + 8
    # all events
    y += 34
    s.text(m, y, "ALL EVENTS", size=sec, weight=700, fill=FG3, ls=0.1)
    s.text(W - m, y, n(EV_T), size=vs, weight=700, fill=FG1, anchor="end")
    by = y + 48
    segs = bar(s, m, by, bw, 44, EV, EV_T)
    bracket(s, m, segs[1][0] + segs[1][1], by - 18, f"OUTER LOOP {n(OUTER)} · {pct(OUTER, EV_T, 1)}", 17)
    seg_labels(s, segs, [0, 1], EV, EV_T, by + 44 + 30, vs, ps, 1, W - m)
    # jobs
    y = by + 44 + 30 + ps + 52
    s.text(m, y, "JOBS STARTED OR TRACKED", size=sec, weight=700, fill=FG3, ls=0.1)
    s.text(W - m, y, n(JB_T), size=vs, weight=700, fill=FG1, anchor="end")
    by = y + 16
    segs = bar(s, m, by, bw, 44, JB, JB_T)
    seg_labels(s, segs, [0, 1], JB, JB_T, by + 44 + 30, vs, ps, 1, W - m)
    y = by + 44 + 30 + ps + 34
    for line in wrap(f"{n(JB_T)} jobs = {n(DATA['jobs']['launched'])} launched by the gateway + "
                     f"{DATA['jobs']['adopted']} adopted/standing threads it tracks", bw, ns):
        s.text(m, y, line, size=ns, fill=FG3)
        y += ns + 8
    # legend table: every bucket with both denominators
    y += 30
    ts = 18 if mobile else 20
    cx_name = m + 32
    ev_v, ev_p, jb_v, jb_p = ((m + 286, m + 364, m + 444, W - m) if mobile
                              else (m + 520, m + 620, m + 800, m + 900))
    s.text(ev_p, y, "EVENTS", size=15, weight=700, fill=FG3, anchor="end", ls=0.1)
    s.text(jb_p, y, "JOBS", size=15, weight=700, fill=FG3, anchor="end", ls=0.1)
    y += 12
    for i, g in enumerate(GROUPS):
        y += ts + 16
        s.rect(m, y - ts * 0.82, ts * 0.9, ts * 0.9, fill="url(#hatch)" if i == 3 else COLORS[i])
        s.text(cx_name, y, g, size=ts, fill=FG1)
        s.text(ev_v, y, n(EV[i]), size=ts, fill=FG1, anchor="end")
        s.text(ev_p, y, pct(EV[i], EV_T, 1), size=ts, fill=FG2, anchor="end")
        s.text(jb_v, y, n(JB[i]), size=ts, fill=FG1, anchor="end")
        s.text(jb_p, y, pct(JB[i], JB_T, 1), size=ts, fill=FG2, anchor="end")
        s.line(m, y + 12, jb_p, y + 12, stroke=DIM, sw=1)
    # how to read it
    y += 52
    s.text(m, y, "HOW TO READ THIS", size=15, weight=700, fill=FG3, ls=0.1)
    y += 10
    for note in DATA["notes"]:
        y += 8
        for j, line in enumerate(wrap(note, bw - 22, ns)):
            y += ns + 8
            if j == 0:
                s.text(m, y, "·", size=ns, weight=700, fill=FG3)
            s.text(m + 22, y, line, size=ns, fill=FG2)
    y += 44
    snap = f"Snapshot: Nov 12, 2026, {DATA['as_of_note']}. Gateway live since Oct 7, 2:06 PM PDT."
    for line in wrap(snap, bw, ns):
        s.text(m, y, line, size=ns, fill=FG3)
        y += ns + 8
    s.h = int(y + 18)
    fix_bg(s, W)
    return s.to_string(
        "Gateway usage, Oct 7 to Nov 12, 2026, in full detail",
        "Full-detail chart of T3 Fleet Gateway usage from October 7 to November 12, 2026. Two stacked bars "
        "with different totals. All events, 8,461: Grok Bot jobs 5,754 (68.0%), Minions/Botons 1,614 (19.1%), "
        "adopted/standing 946 (11.2%), other/test 147 (1.7%); a bracket marks the outer loop, Grok Bot plus "
        "Minions/Botons, 7,368 events or 87.1%. Jobs started or tracked, 376 (366 launched by the gateway plus "
        "10 adopted/standing threads it tracks): Grok Bot 293 (77.9%), Minions/Botons 61 (16.2%), "
        "adopted/standing 10 (2.7%), other/test 12 (3.2%). Notes: events are gateway ledger records, not "
        "completed tasks, and leave out work done in T3 outside the gateway; events and jobs count toward the "
        "client that started the job; Grok Bot is every bot on the shared connector; Minions/Botons is another "
        "gateway client used in the Minions projects since November 5, where Botons is being built; adopted "
        "jobs can also be driven by outer-loop systems; other/test is early pilots, QA and one-offs. Snapshot "
        "November 12, 2026, about 8:50 AM PT.")


def fix_bg(s, W):
    s.parts[0] = f'<rect x="0" y="0" width="{W}" height="{s.h}" fill="{BG}" />'
    s.parts[1] = f'<rect x="0" y="0" width="{W}" height="{s.h}" fill="url(#grid)" />'


if __name__ == "__main__":
    out = Path(sys.argv[1])
    (out / "usage-summary.svg").write_text(summary())
    (out / "usage-detail.svg").write_text(detail(False))
    (out / "usage-detail-mobile.svg").write_text(detail(True))
    print("ok")
