/* Bounds Arcade — original pixel art, drawn for this proposal (second pass: about 2.5× the
   resolution of the first, with shading and depth).

   Each sprite is drawn with a few shape calls onto a small pixel grid (ellipses, rounded boxes,
   lines, polygons), so curves stay clean at 20–40 px grids. Pixel letters:
     #  body (currentColor)   k  ink (eyes, glass)   w  light   g  green   r  orange   .  empty
   After drawing, a bevel pass marks the top-left rim as highlight and the bottom-right rim as
   shade. Those two become translucent white and black overlays, so recoloring by CSS still works.

   Every frame is registered once as an SVG <symbol>, plus a one-path silhouette used for the depth
   layers. An instance is then two <use> elements. In production Hugo would write the symbols into
   the page at build time; here a script does it at load. */
(function () {
  "use strict";

  /* ---------- A tiny raster canvas ---------- */
  function Grid(w, h) { this.w = w; this.h = h; this.a = new Array(w * h).fill("."); }
  Grid.prototype.px = function (x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.a[y * this.w + x] = c; };
  Grid.prototype.at = function (x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.a[y * this.w + x] : "."; };
  /* test(cx, cy) is asked about every pixel centre. */
  Grid.prototype.fill = function (c, test) {
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) if (test(x + 0.5, y + 0.5)) this.a[y * this.w + x] = c;
    return this;
  };
  Grid.prototype.rect = function (x, y, w, h, c) { return this.fill(c, function (px, py) { return px > x && px < x + w && py > y && py < y + h; }); };
  Grid.prototype.box = function (x, y, w, h, r, c) {   // rounded box
    return this.fill(c, function (px, py) {
      if (px < x || px > x + w || py < y || py > y + h) return false;
      var dx = Math.max(x + r - px, px - (x + w - r), 0), dy = Math.max(y + r - py, py - (y + h - r), 0);
      return dx * dx + dy * dy <= r * r;
    });
  };
  Grid.prototype.ell = function (cx, cy, rx, ry, c) {
    return this.fill(c, function (px, py) { var dx = (px - cx) / rx, dy = (py - cy) / ry; return dx * dx + dy * dy <= 1; });
  };
  Grid.prototype.line = function (x0, y0, x1, y1, t, c) {   // a capsule of thickness t
    var vx = x1 - x0, vy = y1 - y0, len = vx * vx + vy * vy || 1;
    return this.fill(c, function (px, py) {
      var u = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / len)), dx = px - (x0 + u * vx), dy = py - (y0 + u * vy);
      return dx * dx + dy * dy <= t * t / 4;
    });
  };
  Grid.prototype.poly = function (pts, c) {
    return this.fill(c, function (px, py) {
      var inside = false;
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var a = pts[i], b = pts[j];
        if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
      }
      return inside;
    });
  };

  /* ---------- The cast. Each entry: [width, height, draw(grid, frame), frames] ---------- */
  var S = {
    /* The invaders are the site's bots. Typist: antenna, visor, a keyboard chest, arms that type. */
    typist: [30, 28, function (g, f) {
      g.line(15, 6, f ? 17 : 15, 2.5, 2, "#").ell(f ? 17.5 : 15, 2.5, 2.4, 2.4, "#");
      g.box(0, f ? 7 : 12, 5, 9, 2, "#").box(25, f ? 7 : 12, 5, 9, 2, "#");
      g.box(4, 6, 22, 14, 5, "#").box(7, 9, 16, 7, 2.5, "k");
      g.rect(10, 11, 3, 3, "w").rect(17, 11, 3, 3, "w");
      g.box(8, 19, 14, 5, 1, "#").rect(10, 21, 2, 2, "k").rect(14, 21, 2, 2, "k").rect(18, 21, 2, 2, "k");
      if (f) g.box(5, 23, 5, 4, 1, "#").box(20, 23, 5, 4, 1, "#"); else g.box(9, 23, 4, 5, 1, "#").box(17, 23, 4, 5, 1, "#");
    }, 2],
    /* Drone: one eye, two rotors. */
    drone: [30, 24, function (g, f) {
      if (f) g.box(3, 1, 5, 3, 1, "#").box(22, 1, 5, 3, 1, "#"); else g.box(0, 1, 11, 3, 1.5, "#").box(19, 1, 11, 3, 1.5, "#");
      g.rect(5, 3, 2, 5, "#").rect(23, 3, 2, 5, "#");
      g.ell(15, 14, 12.5, 8.5, "#").ell(15, 13.5, 6, 6, "k").ell(15, 13.5, 3.6, 3.6, "w").rect(14, 12, 3, 3, "k").rect(13, 11, 1, 1, "w");
      g.rect(8, 21, 2, 2, "#").rect(20, 21, 2, 2, "#").box(5, 22, 8, 2, 1, "#").box(17, 22, 8, 2, 1, "#");
    }, 2],
    /* Crawler: three eyes like keys, too many legs. */
    crawler: [30, 24, function (g, f) {
      var legs = f ? [[6, 14, 5, 23], [11, 15, 13, 22], [19, 15, 17, 22], [24, 14, 25, 23]] : [[6, 14, 1.5, 22], [11, 15, 8, 23], [19, 15, 22, 23], [24, 14, 28.5, 22]];
      legs.forEach(function (l) { g.line(l[0], l[1], l[2], l[3], 2.4, "#"); });
      g.box(2, 2, 26, 14, 7, "#");
      [5, 13, 21].forEach(function (x) { g.box(x, 6, 4, 6, 1.2, "k").rect(x + 1, 7, 2, 2, "w"); });
    }, 2],
    /* The player: a caret-shaped ship. One person, typing. */
    ship: [26, 22, function (g) {
      g.rect(11, 18, 4, 4, "r");
      g.poly([[13, 0], [17, 8], [26, 17], [26, 22], [18, 19], [8, 19], [0, 22], [0, 17], [9, 8]], "#");
      g.ell(13, 9.5, 2.2, 3.4, "k").rect(12, 7, 1, 2, "w");
    }, 1],
    /* Chomp: the site's block cursor, grown hungry and pleased about it. A very round block (a
       squircle, still not a circle) with a big bright eye, a blushing cheek and a mouth that turns
       up at the corner. Open-mouthed it beams; mid-chew the eye squints shut in a happy arc. */
    chomp: [28, 28, function (g, f) {
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
    bug: [28, 28, function (g, f) {
      var a = f ? 1 : 0;
      g.line(10, 7, 5 + a, 1.5, 1.8, "#").ell(5 + a, 1.6, 1.7, 1.7, "#").line(18, 7, 23 - a, 1.5, 1.8, "#").ell(23 - a, 1.6, 1.7, 1.7, "#");
      [[4, 12, 0.5, 9 + a], [3.5, 17, 0, 17 - a], [5, 21, 1.5, 25 - a]].forEach(function (l) {
        g.line(l[0], l[1], l[2], l[3], 2, "#").line(28 - l[0], l[1], 28 - l[2], l[3], 2, "#");
      });
      g.ell(14, 15.5, 10.5, 10.5, "#").rect(13.5, 18, 1, 8, "D");
      g.ell(9.5, 12.5, 3.3, 3.8, "w").ell(18.5, 12.5, 3.3, 3.8, "w");
      g.rect(f ? 8 : 10, 12, 2, 3, "k").rect(f ? 17 : 19, 12, 2, 3, "k");
    }, 2],
    /* The mystery saucer that crosses the top: the Deadline. */
    deadline: [40, 18, function (g) {
      g.ell(20, 7.5, 9, 7, "#").ell(20, 7, 6, 4.2, "k").rect(16, 5, 2, 1, "w");
      g.ell(20, 11.5, 20, 5.5, "#");
      [5, 12, 19, 26, 33].forEach(function (x) { g.rect(x, 11, 2, 2, "w"); });
      g.box(11, 15, 5, 3, 1, "#").box(24, 15, 5, 3, 1, "#");
    }, 1],
    pellet: [6, 6, function (g) { g.ell(3, 3, 3, 3, "#"); }, 1],
    power: [12, 12, function (g) { g.ell(6, 6, 6, 6, "#").rect(3, 3, 2, 2, "w"); }, 1],
    /* Bonus items. */
    coffee: [24, 26, function (g) {
      g.line(7, 6, 9, 3, 1.6, "#").line(9, 3, 7, 0, 1.6, "#").line(13, 6, 15, 3, 1.6, "#").line(15, 3, 13, 0, 1.6, "#");
      g.ell(18.5, 15.5, 5.2, 5.2, "#").ell(19, 15.5, 2.6, 2.6, ".");
      g.box(2, 8, 16, 15, 4, "#").box(4, 9.5, 12, 3, 1.5, "k");
      g.box(0, 23, 20, 3, 1.5, "#");
    }, 1],
    floppy: [24, 24, function (g) {
      g.box(0, 0, 24, 24, 2.5, "#").poly([[20, 0], [24, 0], [24, 4]], ".");
      g.rect(6, 0, 11, 8, "w").rect(13, 1, 3, 6, "k");
      g.box(4, 12, 16, 12, 1, "w").rect(6, 15, 12, 1, "k").rect(6, 18, 12, 1, "k").rect(6, 21, 7, 1, "k");
    }, 1],
    duck: [28, 24, function (g) {
      g.poly([[0, 9], [6, 13], [3, 18]], "#");
      g.ell(13, 16, 12, 7.8, "#").ell(19.5, 7, 6.2, 6.2, "#");
      g.box(24, 6.5, 4, 3.5, 1.2, "r").rect(20, 5, 2, 2, "k").ell(11, 16.5, 5, 3, "D");
    }, 1],
    camera: [30, 24, function (g) {
      g.box(3, 2, 5, 4, 1, "#").box(10, 0, 10, 6, 2, "#").box(0, 4, 30, 20, 3.5, "#");
      g.ell(15, 14, 7.6, 7.6, "w").ell(15, 14, 5.6, 5.6, "k").rect(12, 11, 2, 2, "w").rect(23, 7, 4, 3, "w");
    }, 1],
    cherry: [26, 26, function (g) {
      g.line(8, 15, 15, 3, 1.8, "g").line(19, 15, 15, 3, 1.8, "g").ell(19.5, 3.5, 4.2, 2.3, "g");
      g.ell(7, 19, 6.6, 6.6, "#").ell(19, 19.5, 6.2, 6.2, "#").rect(4, 16, 2, 2, "w").rect(16, 17, 2, 2, "w");
    }, 1],
    heart: [22, 20, function (g) {
      g.ell(6, 6, 6, 6, "#").ell(16, 6, 6, 6, "#").poly([[0.4, 8], [21.6, 8], [11, 20.5]], "#").rect(4, 3, 2, 2, "w");
    }, 1],
    coin: [20, 20, function (g, f) {
      if (f) { g.box(8, 0, 4, 20, 2, "#"); return; }
      g.ell(10, 10, 10, 10, "#").ell(10, 10, 7.4, 7.4, "D").ell(10, 10, 6.2, 6.2, "#").box(9, 5, 2, 10, 1, "D");
    }, 2],
    star: [9, 9, function (g) { g.rect(4, 0, 1, 9, "#").rect(0, 4, 9, 1, "#").rect(3, 3, 3, 3, "#"); }, 1],
    puff: [24, 24, function (g) {
      for (var i = 0; i < 8; i++) {
        var t = i * Math.PI / 4, c = Math.cos(t), s = Math.sin(t);
        g.line(12 + c * 6, 12 + s * 6, 12 + c * 11, 12 + s * 11, 2.2, "#");
      }
    }, 1]
  };

  /* ---------- Raster, bevel, and path building ---------- */
  var cache = {};
  function raster(name, frame) {
    var key = name + frame;
    if (cache[key]) return cache[key];
    var d = S[name], g = new Grid(d[0], d[1]);
    d[2](g, frame);
    /* Bevel: light comes from the top left. Thin features (lit and shaded at once) stay flat. */
    var deep = Math.min(d[0], d[1]) >= 18 ? 2 : 1, hi = [], sh = [];
    for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) {
      var c = g.at(x, y);
      if (c === "." || c === "k") continue;
      if (c === "D") { sh.push([x, y]); continue; }
      var lit = g.at(x - 1, y) === "." || g.at(x, y - 1) === ".";
      var dark = g.at(x + 1, y) === "." || g.at(x, y + 1) === "." || (deep > 1 && (g.at(x + 2, y) === "." || g.at(x, y + 2) === "." || g.at(x + 1, y + 1) === "."));
      if (lit && !dark) hi.push([x, y]); else if (dark && !lit) sh.push([x, y]);
    }
    return (cache[key] = { g: g, hi: hi, sh: sh });
  }
  /* Merge pixels into rectangles: horizontal runs first, then identical runs stacked vertically. */
  function rects(w, h, has) {
    var out = [], open = {};
    for (var y = 0; y <= h; y++) {
      var next = {};
      for (var x = 0; y < h && x < w; x++) {
        if (!has(x, y)) continue;
        var x0 = x;
        while (x < w && has(x, y)) x++;
        var k = x0 + "," + (x - x0);
        next[k] = open[k] || { x: x0, y: y, w: x - x0, h: 0 };
        next[k].h++;
        delete open[k];
      }
      for (var o in open) out.push(open[o]);
      open = next;
    }
    return out;
  }
  function path(list) { return list.map(function (r) { return "M" + r.x + " " + r.y + "h" + r.w + "v" + r.h + "h-" + r.w + "z"; }).join(""); }
  function set(points) { var s = {}; points.forEach(function (p) { s[p[0] + "," + p[1]] = 1; }); return function (x, y) { return s[x + "," + y] === 1; }; }

  /* layers(name, frame): rectangles per paint, used by the SVG symbols and by the game's canvas. */
  function layers(name, frame) {
    var r = raster(name, frame), g = r.g, out = { w: g.w, h: g.h, fills: {}, hi: rects(g.w, g.h, set(r.hi)), sh: rects(g.w, g.h, set(r.sh)) };
    out.fills["#"] = rects(g.w, g.h, function (x, y) { var c = g.at(x, y); return c === "#" || c === "D"; });
    ["k", "w", "g", "r"].forEach(function (ch) {
      var list = rects(g.w, g.h, function (x, y) { return g.at(x, y) === ch; });
      if (list.length) out.fills[ch] = list;
    });
    out.all = rects(g.w, g.h, function (x, y) { return g.at(x, y) !== "."; });
    return out;
  }

  var FILL = { "#": "currentColor", k: "var(--spr-ink)", w: "var(--spr-light)", g: "var(--lime)", r: "var(--orange)" };
  function symbols() {
    var out = "";
    Object.keys(S).forEach(function (name) {
      for (var f = 0; f < S[name][3]; f++) {
        var l = layers(name, f), box = ' viewBox="0 0 ' + l.w + " " + l.h + '"';
        out += '<symbol id="spr-' + name + "-" + f + '"' + box + ">" +
          Object.keys(l.fills).map(function (ch) { return '<path fill="' + FILL[ch] + '" d="' + path(l.fills[ch]) + '"/>'; }).join("") +
          '<path fill="#fff" opacity=".34" d="' + path(l.hi) + '"/><path fill="#000" opacity=".26" d="' + path(l.sh) + '"/></symbol>' +
          '<symbol id="sil-' + name + "-" + f + '"' + box + '><path fill="currentColor" d="' + path(l.all) + '"/></symbol>';
      }
    });
    return out;
  }
  var sheetMarkup = symbols();
  function installSheet() {
    if (document.getElementById("spr-sheet")) return;
    document.body.insertAdjacentHTML("afterbegin", '<svg id="spr-sheet" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' + sheetMarkup + "</svg>");
  }

  function size(name) { return { w: S[name][0], h: S[name][1] }; }
  function uses(prefix, name) {
    var out = "";
    for (var f = 0; f < S[name][3]; f++) out += '<use class="f' + f + '" href="#' + prefix + name + "-" + f + '"/>';
    return out;
  }
  /* opts.anim: add the two-frame cycle class (CSS decides whether it actually runs). */
  function svg(name, opts) {
    opts = opts || {};
    var s = size(name);
    return '<svg class="spr spr--' + name + (opts.anim && S[name][3] > 1 ? " is-anim" : "") + (opts.depth ? " vox__d" : "") +
      '" viewBox="0 0 ' + s.w + " " + s.h + '" style="--w:' + s.w + ";--h:" + s.h + (opts.depth ? ";--i:" + opts.depth : "") +
      '" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' + uses(opts.depth ? "sil-" : "spr-", name) + "</svg>";
  }

  /* mount(): every [data-sprite] gets a face. The face sits in a .vox wrapper so depth can be added later. */
  function mount(root) {
    installSheet();
    (root || document).querySelectorAll("[data-sprite]").forEach(function (el) {
      if (el.dataset.mounted) return;
      el.dataset.mounted = "1";
      el.insertAdjacentHTML("afterbegin", '<span class="vox">' + svg(el.dataset.sprite, { anim: el.hasAttribute("data-anim") }) + "</span>");
      if (el.dataset.depth === "always") extrude(el);
    });
  }
  /* extrude(): stack silhouette copies behind the face so the sprite has real sides when it turns.
     Built on first hover or tap, never for the whole page: each copy is its own compositor layer. */
  var DEPTH = 7;
  function extrude(el) {
    if (el.dataset.extruded) return;
    var vox = el.querySelector(".vox"), name = el.dataset.sprite, back = "";
    if (!vox) return;
    el.dataset.extruded = "1";
    for (var i = DEPTH; i >= 1; i--) back += svg(name, { anim: el.hasAttribute("data-anim"), depth: i });
    vox.insertAdjacentHTML("afterbegin", back);
    /* Restart the frame cycle so the new layers swap in step with the face. */
    var anim = vox.querySelectorAll(".is-anim");
    anim.forEach(function (s) { s.classList.remove("is-anim"); });
    void vox.offsetWidth;
    anim.forEach(function (s) { s.classList.add("is-anim"); });
  }

  window.BoundsSprites = { names: Object.keys(S), size: size, frames: function (name) { return S[name][3]; }, layers: layers, svg: svg, mount: mount, extrude: extrude, sheetSize: sheetMarkup.length };
})();
