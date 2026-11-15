/* ============================================================================
   bounds.dev — theme.js
   Vanilla JS (no modules), first file in the deferred bundle:
     (a) Three-theme selection (light, dark, arcade) + localStorage persistence + pressed
         states; on toggle, restyle any Mapbox maps to match (arcade uses the dark style).
         Arcade's stylesheet and script (js/arcade.js: fx.js + arcade-skin.js) are fetched
         the first time it is chosen, unless theme-init.js already wrote them before paint;
         window.boundsArcade.enable()/disable() add and remove the arcade-only pieces.
     (b) Typed subtitle on the home page (respects prefers-reduced-motion, and arcade's
         still state).
     (c) Per-image dithering via window.ditherInit().
     (d) Lazy Mapbox: the library loads once, when a map nears the viewport;
         each map is created once and kept in an array for restyling.
   window.boundsTrack(name, params) is the one hook every module uses to report
   an interaction; analytics.js decides what (if anything) to do with it.
   ============================================================================ */
(function () {
  "use strict";

  var theme = window.boundsTheme;
  var maps = []; // module-scoped Mapbox map instances, for restyling on toggle.

  window.boundsTrack = function (name, params) {
    try {
      document.dispatchEvent(new CustomEvent("bounds:track", { detail: { name: name, params: params || {} } }));
    } catch (e) { /* ignore */ }
  };

  /* ---------- THEMES ---------- */
  function isCrt() {
    return document.documentElement.classList.contains("crt");
  }

  function applyMapStyles() {
    var dark = isCrt();
    for (var i = 0; i < maps.length; i++) {
      var entry = maps[i];
      if (!entry || !entry.map) continue;
      try {
        entry.map.setStyle(dark ? entry.darkStyle : entry.lightStyle);
      } catch (e) { /* ignore */ }
    }
  }

  /* The arcade files, once: resolves when its stylesheet and script have both loaded. */
  var arcadeLoad = null;
  function loadArcade() {
    if (arcadeLoad) return arcadeLoad;
    var assets = theme.assets || {};
    var link = document.getElementById("kc-arcade-css");
    // A link that never reported loading is an earlier attempt that failed (the pre-paint one
    // included): retry it. (link.sheet cannot tell: a disabled link has no sheet either.)
    if (link && !link.dataset.ready) { link.remove(); link = null; }
    if (link && window.boundsArcade) return Promise.resolve();
    arcadeLoad = new Promise(function (resolve, reject) {
      if (!assets.css || !assets.js) { arcadeLoad = null; reject(new Error("no arcade assets")); return; }
      var pending = 2;
      function done() { if (--pending === 0) { arcadeLoad = null; resolve(); } }
      function fail() { arcadeLoad = null; reject(new Error("arcade failed to load")); }
      if (link) done();
      else {
        link = document.createElement("link");
        link.id = "kc-arcade-css";
        link.rel = "stylesheet";
        link.href = assets.css;
        link.integrity = assets.cssSri;
        link.onload = function () {
          link.dataset.ready = "1";
          // Loaded for a selection that may since have been cancelled: stay inert until arcade applies.
          link.disabled = document.documentElement.dataset.theme !== "arcade";
          done();
        };
        link.onerror = function () { link.remove(); fail(); };
        var base = document.getElementById("kc-css");
        if (base && base.parentNode) base.parentNode.insertBefore(link, base.nextSibling);
        else document.head.appendChild(link);
      }
      if (window.boundsArcade) done();
      else {
        var script = document.createElement("script");
        script.src = assets.js;
        script.integrity = assets.jsSri;
        script.onload = function () { window.boundsArcade ? done() : fail(); };
        script.onerror = function () { script.remove(); fail(); };
        document.head.appendChild(script);
      }
    });
    return arcadeLoad;
  }

  function initCrtToggle() {
    var buttons = document.querySelectorAll("[data-theme-mode]");
    var preference = theme.read();
    var manual = !!preference;
    var systemTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    var selection = 0; // every press takes a number; only the latest press may apply

    function applyTheme(mode) {
      var arcade = window.boundsArcade;
      if (arcade && mode !== "arcade") arcade.disable();
      theme.apply(mode);
      if (arcade && mode === "arcade") arcade.enable();
      buttons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.themeMode === mode));
      });
      applyMapStyles();
    }

    // theme-init.js already chose (and fell back to dark if the arcade stylesheet failed).
    applyTheme(document.documentElement.dataset.theme || preference || (systemTheme && systemTheme.matches ? "dark" : "light"));
    if (systemTheme) {
      systemTheme.addEventListener("change", function (event) {
        if (!manual) applyTheme(event.matches ? "dark" : "light");
      });
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var mode = button.dataset.themeMode;
        var from = document.documentElement.dataset.theme;
        var ticket = ++selection;
        manual = true;
        if (mode !== from) {
          var go = function () {
            // A later press won, even one of the theme already showing (arcade still loading).
            if (ticket !== selection || document.documentElement.dataset.theme !== from) return;
            // The wipe may run this a moment later: a press in between still wins, and the change is
            // reported only if it was applied.
            var swap = function () {
              if (ticket !== selection) return;
              applyTheme(mode);
              window.boundsTrack("theme_change", { theme_from: from, theme_to: mode });
            };
            // A circular wipe from the pressed pill, where View Transitions exist and motion is welcome.
            if (window.boundsThemeTransition) window.boundsThemeTransition(button, swap);
            else swap();
          };
          if (mode === "arcade") loadArcade().then(go, function () { /* stay on the current theme */ });
          else go();
        }
        try {
          localStorage.setItem(theme.key, mode);
        } catch (e) { /* ignore */ }
      });
    });
  }

  /* ---------- TYPED SUBTITLE ---------- */
  function still() { return document.documentElement.dataset.motion === "still"; }

  function makeCursor() {
    var c = document.createElement("span");
    c.className = "kc-cursor";
    c.setAttribute("aria-hidden", "true");
    return c;
  }

  function initTypedSubtitle() {
    var el = document.querySelector(".kc-typeline[data-type-text]");
    if (!el) return;
    var text = el.getAttribute("data-type-text") || el.textContent || "";
    var reduce = false;
    try {
      reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { reduce = false; }
    if (still()) reduce = true;

    if (reduce) {
      // Leave the text in place, just append a blinking cursor.
      el.appendChild(makeCursor());
      return;
    }

    el.textContent = "";
    var cursor = makeCursor();
    el.appendChild(cursor);
    var i = 0;
    function step() {
      if (still()) { // arcade paused mid-line: finish at once
        cursor.insertAdjacentText("beforebegin", text.slice(i));
        i = text.length;
      }
      if (i < text.length) {
        cursor.insertAdjacentText("beforebegin", text.charAt(i));
        i++;
        setTimeout(step, 42);
      }
    }
    setTimeout(step, 42);
  }

  /* ---------- DITHER ---------- */
  function initDither() {
    if (typeof window.ditherInit === "function") {
      try { window.ditherInit(); } catch (e) { /* ignore */ }
    }
  }

  /* ---------- MAPBOX (lazy) ---------- */
  function decodeEntities(str) {
    var ta = document.createElement("textarea");
    ta.innerHTML = str;
    return ta.value;
  }

  var mapboxReady = null; // one shared loader promise for every map on the page
  function loadMapbox() {
    if (mapboxReady) return mapboxReady;
    var cfg = window.boundsMapbox || {};
    mapboxReady = new Promise(function (resolve, reject) {
      if (window.mapboxgl) { resolve(window.mapboxgl); return; }
      if (!cfg.js) { reject(new Error("no mapbox config")); return; }
      if (cfg.css) {
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = cfg.css;
        document.head.appendChild(link);
      }
      var script = document.createElement("script");
      script.src = cfg.js;
      script.async = true;
      script.onload = function () { window.mapboxgl ? resolve(window.mapboxgl) : reject(new Error("mapbox missing")); };
      script.onerror = function () { reject(new Error("mapbox failed to load")); };
      document.head.appendChild(script);
    });
    return mapboxReady;
  }

  function createMap(el) {
    if (el.dataset.mapReady) return;
    el.dataset.mapReady = "pending";
    var raw = el.getAttribute("data-mapbox");
    var opts;
    try {
      opts = JSON.parse(decodeEntities(raw || ""));
    } catch (e) {
      opts = null; // malformed JSON
    }
    if (!opts) { mapFailed(el); return; }

    var lng = parseFloat(opts.lng);
    var lat = parseFloat(opts.lat);
    var zoom = opts.zoom != null ? parseFloat(opts.zoom) : 10;
    var lightStyle = opts.lightStyle;
    var darkStyle = opts.darkStyle || opts.lightStyle;

    try {
      if (window.mapboxgl.supported && !window.mapboxgl.supported()) throw new Error("WebGL unavailable");
      window.mapboxgl.accessToken = window.boundsMapbox.accessToken;
      var map = new window.mapboxgl.Map({
        container: el.id,
        center: [lng, lat],
        zoom: zoom,
        minZoom: 0.2,
        style: isCrt() ? darkStyle : lightStyle, // resolved now, so a theme change before load is honored
        attributionControl: false
      });

      if (opts.marked) {
        new window.mapboxgl.Marker().setLngLat([lng, lat]).addTo(map);
      }
      if (opts.navigation) {
        map.addControl(new window.mapboxgl.NavigationControl(), "bottom-right");
      }
      if (opts.scale) {
        map.addControl(new window.mapboxgl.ScaleControl());
      }
      if (opts.fullscreen) {
        map.addControl(new window.mapboxgl.FullscreenControl());
      }

      maps.push({ map: map, lightStyle: lightStyle, darkStyle: darkStyle });
      el.dataset.mapReady = "1";
    } catch (e) {
      // Constructor failures (e.g. no WebGL) can leave partial Mapbox markup behind: clear it.
      el.innerHTML = "";
      el.className = el.className.split(/\s+/).filter(function (c) { return c && c.indexOf("mapboxgl") !== 0; }).join(" ");
      mapFailed(el);
    }
  }

  function mapFailed(el) {
    if (el.dataset.mapReady && el.dataset.mapReady !== "pending") return;
    el.dataset.mapReady = "failed";
    el.classList.add("mapbox--failed");
    el.setAttribute("aria-label", "Map of the photo location (unavailable)");
    var note = document.createElement("p");
    note.className = "mapbox__fallback";
    note.textContent = "Map unavailable.";
    el.appendChild(note);
  }

  function initMapbox() {
    var els = document.querySelectorAll(".mapbox[data-mapbox]");
    if (!els.length || !window.boundsMapbox) return;

    function start(el) {
      loadMapbox().then(function () { createMap(el); }, function () { mapFailed(el); });
    }

    if (!("IntersectionObserver" in window)) {
      els.forEach(start);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        start(entry.target);
      });
    }, { rootMargin: "600px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- BOOT ---------- */
  function boot() {
    initCrtToggle();
    initTypedSubtitle();
    initDither();
    initMapbox();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
