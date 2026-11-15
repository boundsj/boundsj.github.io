#!/usr/bin/env node
/* Bounds Arcade sprites: the shape lists, rasterizer and bevel pass, written once at build time.

     node scripts/sprites.mjs          # write the sheet and its JSON (make sprites)
     node scripts/sprites.mjs --check  # exit 1 if the committed output is stale (make check)

   Writes, both generated and committed (like the GIF-hero WebPs, so Pages needs nothing new):
     themes/bounds-ascii/assets/sprites.svg   one <symbol> per frame: spr-<name>-<frame> (the face)
                                              and sil-<name>-<frame> (a one-path silhouette for
                                              depth layers). Hugo fingerprints it; pages point at
                                              it with <use href="<sheet>#spr-typist-0">.
     themes/bounds-ascii/assets/sprites.json  the same rectangles for canvas drawing.

   Each sprite is a few shape calls on a small pixel grid. Pixel letters:
     #  body (currentColor)   k  ink   w  light   g  green   r  orange   D  body, always shaded
     .  empty
   A bevel pass then marks the top-left rim as highlight and the bottom-right rim as shade; those
   become translucent white and black overlays, so recoloring with CSS still works.
   In the sheet, variable fills are written as style="fill:var(--x)" (not a fill="var(...)"
   attribute) and the body as fill="currentColor", so external <use> works across browsers.
   No dependencies. Ported from docs/proposals/arcade-theme-preview/sprites.js. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_SVG = join(ROOT, "themes/bounds-ascii/assets/sprites.svg");
const OUT_JSON = join(ROOT, "themes/bounds-ascii/assets/sprites.json");

/* ---------- A tiny raster canvas ---------- */
class Grid {
  constructor(w, h) { this.w = w; this.h = h; this.a = new Array(w * h).fill("."); }
  at(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.a[y * this.w + x] : "."; }
  /* test(cx, cy) is asked about every pixel centre. */
  fill(c, test) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (test(x + 0.5, y + 0.5)) this.a[y * this.w + x] = c;
    return this;
  }
  rect(x, y, w, h, c) { return this.fill(c, (px, py) => px > x && px < x + w && py > y && py < y + h); }
  box(x, y, w, h, r, c) { // rounded box
    return this.fill(c, (px, py) => {
      if (px < x || px > x + w || py < y || py > y + h) return false;
      const dx = Math.max(x + r - px, px - (x + w - r), 0), dy = Math.max(y + r - py, py - (y + h - r), 0);
      return dx * dx + dy * dy <= r * r;
    });
  }
  ell(cx, cy, rx, ry, c) { return this.fill(c, (px, py) => { const dx = (px - cx) / rx, dy = (py - cy) / ry; return dx * dx + dy * dy <= 1; }); }
  line(x0, y0, x1, y1, t, c) { // a capsule of thickness t
    const vx = x1 - x0, vy = y1 - y0, len = vx * vx + vy * vy || 1;
    return this.fill(c, (px, py) => {
      const u = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / len)), dx = px - (x0 + u * vx), dy = py - (y0 + u * vy);
      return dx * dx + dy * dy <= t * t / 4;
    });
  }
  poly(pts, c) {
    return this.fill(c, (px, py) => {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i], b = pts[j];
        if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
      }
      return inside;
    });
  }
}

/* ---------- The cast. Each entry: [width, height, draw(grid, frame), frames] ---------- */
const S = {
  /* The invaders are the site's bots. Typist: antenna, visor, a keyboard chest, arms that type. */
  typist: [30, 28, (g, f) => {
    g.line(15, 6, f ? 17 : 15, 2.5, 2, "#").ell(f ? 17.5 : 15, 2.5, 2.4, 2.4, "#");
    g.box(0, f ? 7 : 12, 5, 9, 2, "#").box(25, f ? 7 : 12, 5, 9, 2, "#");
    g.box(4, 6, 22, 14, 5, "#").box(7, 9, 16, 7, 2.5, "k");
    g.rect(10, 11, 3, 3, "w").rect(17, 11, 3, 3, "w");
    g.box(8, 19, 14, 5, 1, "#").rect(10, 21, 2, 2, "k").rect(14, 21, 2, 2, "k").rect(18, 21, 2, 2, "k");
    if (f) g.box(5, 23, 5, 4, 1, "#").box(20, 23, 5, 4, 1, "#"); else g.box(9, 23, 4, 5, 1, "#").box(17, 23, 4, 5, 1, "#");
  }, 2],
  /* Drone: one eye, two rotors. */
  drone: [30, 24, (g, f) => {
    if (f) g.box(3, 1, 5, 3, 1, "#").box(22, 1, 5, 3, 1, "#"); else g.box(0, 1, 11, 3, 1.5, "#").box(19, 1, 11, 3, 1.5, "#");
    g.rect(5, 3, 2, 5, "#").rect(23, 3, 2, 5, "#");
    g.ell(15, 14, 12.5, 8.5, "#").ell(15, 13.5, 6, 6, "k").ell(15, 13.5, 3.6, 3.6, "w").rect(14, 12, 3, 3, "k").rect(13, 11, 1, 1, "w");
    g.rect(8, 21, 2, 2, "#").rect(20, 21, 2, 2, "#").box(5, 22, 8, 2, 1, "#").box(17, 22, 8, 2, 1, "#");
  }, 2],
  /* Crawler: three eyes like keys, too many legs. */
  crawler: [30, 24, (g, f) => {
    const legs = f ? [[6, 14, 5, 23], [11, 15, 13, 22], [19, 15, 17, 22], [24, 14, 25, 23]] : [[6, 14, 1.5, 22], [11, 15, 8, 23], [19, 15, 22, 23], [24, 14, 28.5, 22]];
    legs.forEach((l) => g.line(l[0], l[1], l[2], l[3], 2.4, "#"));
    g.box(2, 2, 26, 14, 7, "#");
    [5, 13, 21].forEach((x) => g.box(x, 6, 4, 6, 1.2, "k").rect(x + 1, 7, 2, 2, "w"));
  }, 2],
  /* The player: a caret-shaped ship. One person, typing. */
  ship: [26, 22, (g) => {
    g.rect(11, 18, 4, 4, "r");
    g.poly([[13, 0], [17, 8], [26, 17], [26, 22], [18, 19], [8, 19], [0, 22], [0, 17], [9, 8]], "#");
    g.ell(13, 9.5, 2.2, 3.4, "k").rect(12, 7, 1, 2, "w");
  }, 1],
  /* Chomp: the site's block cursor, grown hungry and pleased about it. A very round block (a
     squircle, still not a circle) with a big bright eye, a blushing cheek and a mouth that turns
     up at the corner. Open-mouthed it beams; mid-chew the eye squints shut in a happy arc. */
  chomp: [28, 28, (g, f) => {
    g.box(1, 1, 26, 26, 10.5, "#");
    if (f) {
      g.line(29, 18.5, 14, 17, 1.9, ".").line(14, 17, 11.6, 14.6, 1.9, ".");
      g.line(12, 9.5, 14.5, 7, 1.7, "k").line(14.5, 7, 17, 9.5, 1.7, "k");
    } else {
      g.poly([[11.5, 16], [29, 7], [29, 25.5]], ".").line(11.8, 16, 10.4, 14.2, 1.8, ".");
      g.ell(14.5, 8.2, 2.9, 3.3, "k").rect(13, 6, 2, 2, "w").rect(16, 9, 1, 1, "w");
    }
    g.ell(7.5, 18.9, 3, 2.2, "r");
  }, 2],
  /* The chasers are software bugs: antennae, six legs, eyes that look where they are going. */
  bug: [28, 28, (g, f) => {
    const a = f ? 1 : 0;
    g.line(10, 7, 5 + a, 1.5, 1.8, "#").ell(5 + a, 1.6, 1.7, 1.7, "#").line(18, 7, 23 - a, 1.5, 1.8, "#").ell(23 - a, 1.6, 1.7, 1.7, "#");
    [[4, 12, 0.5, 9 + a], [3.5, 17, 0, 17 - a], [5, 21, 1.5, 25 - a]].forEach((l) => {
      g.line(l[0], l[1], l[2], l[3], 2, "#").line(28 - l[0], l[1], 28 - l[2], l[3], 2, "#");
    });
    g.ell(14, 15.5, 10.5, 10.5, "#").rect(13.5, 18, 1, 8, "D");
    g.ell(9.5, 12.5, 3.3, 3.8, "w").ell(18.5, 12.5, 3.3, 3.8, "w");
    g.rect(f ? 8 : 10, 12, 2, 3, "k").rect(f ? 17 : 19, 12, 2, 3, "k");
  }, 2],
  /* The mystery saucer that crosses the top: the Deadline. */
  deadline: [40, 18, (g) => {
    g.ell(20, 7.5, 9, 7, "#").ell(20, 7, 6, 4.2, "k").rect(16, 5, 2, 1, "w");
    g.ell(20, 11.5, 20, 5.5, "#");
    [5, 12, 19, 26, 33].forEach((x) => g.rect(x, 11, 2, 2, "w"));
    g.box(11, 15, 5, 3, 1, "#").box(24, 15, 5, 3, 1, "#");
  }, 1],
  pellet: [6, 6, (g) => { g.ell(3, 3, 3, 3, "#"); }, 1],
  power: [12, 12, (g) => { g.ell(6, 6, 6, 6, "#").rect(3, 3, 2, 2, "w"); }, 1],
  /* Bonus items. */
  coffee: [24, 26, (g) => {
    g.line(7, 6, 9, 3, 1.6, "#").line(9, 3, 7, 0, 1.6, "#").line(13, 6, 15, 3, 1.6, "#").line(15, 3, 13, 0, 1.6, "#");
    g.ell(18.5, 15.5, 5.2, 5.2, "#").ell(19, 15.5, 2.6, 2.6, ".");
    g.box(2, 8, 16, 15, 4, "#").box(4, 9.5, 12, 3, 1.5, "k");
    g.box(0, 23, 20, 3, 1.5, "#");
  }, 1],
  floppy: [24, 24, (g) => {
    g.box(0, 0, 24, 24, 2.5, "#").poly([[20, 0], [24, 0], [24, 4]], ".");
    g.rect(6, 0, 11, 8, "w").rect(13, 1, 3, 6, "k");
    g.box(4, 12, 16, 12, 1, "w").rect(6, 15, 12, 1, "k").rect(6, 18, 12, 1, "k").rect(6, 21, 7, 1, "k");
  }, 1],
  duck: [28, 24, (g) => {
    g.poly([[0, 9], [6, 13], [3, 18]], "#");
    g.ell(13, 16, 12, 7.8, "#").ell(19.5, 7, 6.2, 6.2, "#");
    g.box(24, 6.5, 4, 3.5, 1.2, "r").rect(20, 5, 2, 2, "k").ell(11, 16.5, 5, 3, "D");
  }, 1],
  camera: [30, 24, (g) => {
    g.box(3, 2, 5, 4, 1, "#").box(10, 0, 10, 6, 2, "#").box(0, 4, 30, 20, 3.5, "#");
    g.ell(15, 14, 7.6, 7.6, "w").ell(15, 14, 5.6, 5.6, "k").rect(12, 11, 2, 2, "w").rect(23, 7, 4, 3, "w");
  }, 1],
  cherry: [26, 26, (g) => {
    g.line(8, 15, 15, 3, 1.8, "g").line(19, 15, 15, 3, 1.8, "g").ell(19.5, 3.5, 4.2, 2.3, "g");
    g.ell(7, 19, 6.6, 6.6, "#").ell(19, 19.5, 6.2, 6.2, "#").rect(4, 16, 2, 2, "w").rect(16, 17, 2, 2, "w");
  }, 1],
  heart: [22, 20, (g) => {
    g.ell(6, 6, 6, 6, "#").ell(16, 6, 6, 6, "#").poly([[0.4, 8], [21.6, 8], [11, 20.5]], "#").rect(4, 3, 2, 2, "w");
  }, 1],
  coin: [20, 20, (g, f) => {
    if (f) { g.box(8, 0, 4, 20, 2, "#"); return; }
    g.ell(10, 10, 10, 10, "#").ell(10, 10, 7.4, 7.4, "D").ell(10, 10, 6.2, 6.2, "#").box(9, 5, 2, 10, 1, "D");
  }, 2],
  star: [9, 9, (g) => { g.rect(4, 0, 1, 9, "#").rect(0, 4, 9, 1, "#").rect(3, 3, 3, 3, "#"); }, 1],
  puff: [24, 24, (g) => {
    for (let i = 0; i < 8; i++) {
      const t = i * Math.PI / 4, c = Math.cos(t), s = Math.sin(t);
      g.line(12 + c * 6, 12 + s * 6, 12 + c * 11, 12 + s * 11, 2.2, "#");
    }
  }, 1],
};

/* ---------- Raster, bevel, and rectangles ---------- */
function raster(name, frame) {
  const d = S[name], g = new Grid(d[0], d[1]);
  d[2](g, frame);
  /* Bevel: light comes from the top left. Thin features (lit and shaded at once) stay flat. */
  const deep = Math.min(d[0], d[1]) >= 18 ? 2 : 1, hi = new Set(), sh = new Set();
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const c = g.at(x, y);
    if (c === "." || c === "k") continue;
    if (c === "D") { sh.add(x + "," + y); continue; }
    const lit = g.at(x - 1, y) === "." || g.at(x, y - 1) === ".";
    const dark = g.at(x + 1, y) === "." || g.at(x, y + 1) === "." || (deep > 1 && (g.at(x + 2, y) === "." || g.at(x, y + 2) === "." || g.at(x + 1, y + 1) === "."));
    if (lit && !dark) hi.add(x + "," + y); else if (dark && !lit) sh.add(x + "," + y);
  }
  return { g, hi, sh };
}
/* Merge pixels into rectangles: horizontal runs first, then identical runs stacked vertically. */
function rects(w, h, has) {
  const out = [];
  let open = new Map();
  for (let y = 0; y <= h; y++) {
    const next = new Map();
    for (let x = 0; y < h && x < w; x++) {
      if (!has(x, y)) continue;
      const x0 = x;
      while (x < w && has(x, y)) x++;
      const k = x0 + "," + (x - x0);
      const r = open.get(k) || [x0, y, x - x0, 0];
      r[3]++;
      next.set(k, r);
      open.delete(k);
    }
    for (const r of open.values()) out.push(r);
    open = next;
  }
  return out.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
function layers(name, frame) {
  const { g, hi, sh } = raster(name, frame);
  const fills = { "#": rects(g.w, g.h, (x, y) => { const c = g.at(x, y); return c === "#" || c === "D"; }) };
  for (const ch of ["k", "w", "g", "r"]) {
    const list = rects(g.w, g.h, (x, y) => g.at(x, y) === ch);
    if (list.length) fills[ch] = list;
  }
  return {
    fills,
    hi: rects(g.w, g.h, (x, y) => hi.has(x + "," + y)),
    sh: rects(g.w, g.h, (x, y) => sh.has(x + "," + y)),
    all: rects(g.w, g.h, (x, y) => g.at(x, y) !== "."),
  };
}

const path = (list) => list.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h-${w}z`).join("");
/* Body follows CSS color; the rest read theme variables (inline style, so external <use> resolves them). */
const PAINT = { "#": 'fill="currentColor"', k: 'style="fill:var(--spr-ink)"', w: 'style="fill:var(--spr-light)"', g: 'style="fill:var(--lime)"', r: 'style="fill:var(--orange)"' };

function build() {
  const data = { generator: "scripts/sprites.mjs", paints: { "#": "currentColor", k: "--spr-ink", w: "--spr-light", g: "--lime", r: "--orange", hi: "rgba(255,255,255,.34)", sh: "rgba(0,0,0,.26)" }, sprites: {} };
  let symbols = "";
  for (const name of Object.keys(S)) {
    const [w, h, , count] = S[name];
    const frames = [];
    for (let f = 0; f < count; f++) {
      const l = layers(name, f);
      frames.push(l);
      const box = ` viewBox="0 0 ${w} ${h}"`;
      symbols += `<symbol id="spr-${name}-${f}"${box}>` +
        Object.keys(l.fills).map((ch) => `<path ${PAINT[ch]} d="${path(l.fills[ch])}"/>`).join("") +
        `<path fill="#fff" fill-opacity=".34" d="${path(l.hi)}"/><path fill="#000" fill-opacity=".26" d="${path(l.sh)}"/></symbol>\n` +
        `<symbol id="sil-${name}-${f}"${box}><path fill="currentColor" d="${path(l.all)}"/></symbol>\n`;
    }
    data.sprites[name] = { w, h, frames };
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\n` +
    `<!-- Generated by scripts/sprites.mjs (make sprites). Do not edit by hand. Original pixel art for bounds.dev. -->\n` +
    symbols + `</svg>\n`;
  /* One sprite per line keeps diffs readable. */
  const json = "{\n" + Object.entries(data).map(([k, v]) => {
    if (k !== "sprites") return `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`;
    return `  "sprites": {\n` + Object.entries(v).map(([n, s]) => `    ${JSON.stringify(n)}: ${JSON.stringify(s)}`).join(",\n") + "\n  }";
  }).join(",\n") + "\n}\n";
  return { svg, json };
}

const { svg, json } = build();
const read = (p) => { try { return readFileSync(p, "utf8"); } catch { return null; } };
if (process.argv.includes("--check")) {
  const stale = [[OUT_SVG, svg], [OUT_JSON, json]].filter(([p, body]) => read(p) !== body).map(([p]) => relative(ROOT, p));
  if (stale.length) {
    console.error(`[sprites] stale or missing: ${stale.join(", ")}. Run make sprites and commit the result.`);
    process.exit(1);
  }
  console.log("[sprites] sheet is up to date.");
} else {
  writeFileSync(OUT_SVG, svg);
  writeFileSync(OUT_JSON, json);
  console.log(`[sprites] wrote ${relative(ROOT, OUT_SVG)} (${(svg.length / 1000).toFixed(1)} KB) and ${relative(ROOT, OUT_JSON)} (${(json.length / 1000).toFixed(1)} KB).`);
}
