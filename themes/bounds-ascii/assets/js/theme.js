/* ============================================================================
   bounds.dev — theme.js
   Vanilla JS (no modules), first file in the deferred bundle:
     (a) Four-mode theme selection + localStorage persistence + pressed states;
         on toggle, restyle any Mapbox maps to match.
     (b) Typed subtitle on the home page (respects prefers-reduced-motion).
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

  /* ---------- CRT DARK MODE ---------- */
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

  function initCrtToggle() {
    var buttons = document.querySelectorAll("[data-theme-mode]");
    var preference = theme.read();
    var manual = !!preference;
    var systemTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme(mode) {
      theme.apply(mode);
      buttons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.themeMode === mode));
      });
      applyMapStyles();
    }

    applyTheme(preference || (systemTheme && systemTheme.matches ? "dark" : "light"));
    if (systemTheme) {
      systemTheme.addEventListener("change", function (event) {
        if (!manual) applyTheme(event.matches ? "dark" : "light");
      });
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var mode = button.dataset.themeMode;
        var from = document.documentElement.dataset.theme;
        manual = true;
        if (mode !== from) {
          var swap = function () { applyTheme(mode); };
          // A circular wipe from the pressed pill, where View Transitions exist and motion is welcome.
          if (window.boundsThemeTransition) window.boundsThemeTransition(button, swap);
          else swap();
          window.boundsTrack("theme_change", { theme_from: from, theme_to: mode });
        }
        try {
          localStorage.setItem(theme.key, mode);
        } catch (e) { /* ignore */ }
      });
    });
  }

  /* ---------- TYPED SUBTITLE ---------- */
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
    el.dataset.mapReady = "1";
    var raw = el.getAttribute("data-mapbox");
    var opts;
    try {
      opts = JSON.parse(decodeEntities(raw || ""));
    } catch (e) {
      return; // malformed JSON: skip this map.
    }
    if (!opts) return;

    var lng = parseFloat(opts.lng);
    var lat = parseFloat(opts.lat);
    var zoom = opts.zoom != null ? parseFloat(opts.zoom) : 10;
    var lightStyle = opts.lightStyle;
    var darkStyle = opts.darkStyle || opts.lightStyle;

    try {
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
    } catch (e) { /* ignore failed map */ }
  }

  function mapFailed(el) {
    if (el.dataset.mapReady) return;
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
