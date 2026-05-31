/* ============================================================================
   bounds.dev — theme.js
   Vanilla JS (no modules). Wired on DOMContentLoaded:
     (a) CRT dark-mode toggle + localStorage persistence + button label;
         on toggle, restyle any Mapbox maps to match.
     (b) Typed subtitle on the home page (respects prefers-reduced-motion).
     (c) Per-image dithering via window.ditherInit().
     (d) Mapbox initialization (guarded; keeps maps in an array for restyling).
   ============================================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "bounds-crt";
  var maps = []; // module-scoped Mapbox map instances, for restyling on toggle.

  /* ---------- CRT DARK MODE ---------- */
  function isCrt() {
    return document.documentElement.classList.contains("crt");
  }

  function updateToggleLabel(btn) {
    if (!btn) return;
    // Label offers the OTHER mode: "[ crt ]" while light, "[ paper ]" while dark.
    btn.textContent = isCrt() ? "[ paper ]" : "[ crt ]";
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
    var btn = document.getElementById("crt-toggle");
    updateToggleLabel(btn);
    if (!btn) return;
    btn.addEventListener("click", function () {
      var nowCrt = !isCrt();
      document.documentElement.classList.toggle("crt", nowCrt);
      try {
        localStorage.setItem(STORAGE_KEY, nowCrt ? "crt" : "paper");
      } catch (e) { /* ignore */ }
      updateToggleLabel(btn);
      applyMapStyles();
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

  /* ---------- MAPBOX ---------- */
  function decodeEntities(str) {
    var ta = document.createElement("textarea");
    ta.innerHTML = str;
    return ta.value;
  }

  function initMapbox() {
    if (!window.mapboxgl || !window.boundsMapbox) return;
    var els = document.querySelectorAll(".mapbox");
    if (!els.length) return;

    try {
      window.mapboxgl.accessToken = window.boundsMapbox.accessToken;
    } catch (e) { /* ignore */ }

    var dark = isCrt();

    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var raw = el.getAttribute("data-mapbox");
      if (!raw) continue;
      var opts;
      try {
        opts = JSON.parse(decodeEntities(raw));
      } catch (e) {
        continue; // malformed JSON: skip this map.
      }
      if (!opts) continue;

      var lng = parseFloat(opts.lng);
      var lat = parseFloat(opts.lat);
      var zoom = opts.zoom != null ? parseFloat(opts.zoom) : 10;
      var lightStyle = opts.lightStyle;
      var darkStyle = opts.darkStyle || opts.lightStyle;

      try {
        var map = new window.mapboxgl.Map({
          container: el.id,
          center: [lng, lat],
          zoom: zoom,
          minZoom: 0.2,
          style: dark ? darkStyle : lightStyle,
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
