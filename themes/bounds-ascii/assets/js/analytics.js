/* ============================================================================
   bounds.dev — analytics.js
   One GA4 event layer with one naming scheme (schema: docs/analytics.md).
   Live only when the guarded snippet in <head> set window.boundsAnalyticsLive
   (a production build on an allowlisted host). Anywhere else it runs in dev
   mode: events go to the console as "[analytics:dev]" and to
   window.__boundsAnalytics, and nothing leaves the browser.
   Never sent: email addresses, query strings, fragments, visitor-typed text.
   ============================================================================ */
(function () {
  "use strict";

  var live = !!window.boundsAnalyticsLive && typeof window.gtag === "function";
  var log = (window.__boundsAnalytics = window.__boundsAnalytics || []);
  var body = document.body;

  function clean(params) {
    var out = {};
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value === undefined || value === null || value === "") return;
      out[key] = typeof value === "string" ? value.slice(0, 100) : value; // GA4 caps values at 100 chars
    });
    return out;
  }

  function send(name, params) {
    params = clean(params);
    if (live) {
      window.gtag("event", name, params);
    } else {
      log.push({ name: name, params: params });
      if (window.console && console.debug) console.debug("[analytics:dev]", name, params);
    }
  }

  function uiLocation(node) {
    var scope = node.closest("[data-ui]");
    if (scope) return scope.getAttribute("data-ui");
    return node.closest(".post-content") ? "post_body" : "page";
  }

  /* Interactions reported by theme.js and site.js through window.boundsTrack. */
  document.addEventListener("bounds:track", function (event) {
    var detail = event.detail || {};
    if (!detail.name) return;
    send(detail.name, detail.params);
    if (detail.name === "theme_change" && live) {
      window.gtag("set", "user_properties", { site_theme: detail.params.theme_to });
    }
  });

  /* Link clicks, classified once in a fixed order. Capture phase, so every click is seen
     before anything (like the lightbox) handles it. */
  var POST_PATH = /^\/posts\/([^/]+)\/?$/;
  function classify(link, event) {
    var href = link.getAttribute("href") || "";
    var ui = uiLocation(link);
    if (/^mailto:/i.test(href)) return ["email_click", { ui_location: ui }];
    var url;
    try { url = new URL(link.href, window.location.href); } catch (e) { return null; }
    if (!/^https?:$/.test(url.protocol)) return null;
    if (/\/index\.xml$/.test(url.pathname)) return ["rss_click", { ui_location: ui }];
    if (link.dataset.social) return ["social_click", { social_network: link.dataset.social, ui_location: ui }];
    if (url.origin !== window.location.origin) {
      return ["outbound_click", { link_domain: url.hostname.replace(/^www\./, ""), link_path: url.pathname, ui_location: ui }];
    }
    // Same site from here on.
    var plain = !(event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
    if (link.hasAttribute("data-photo") && plain) return null; // the lightbox reports photo_open
    if (link.dataset.contentId) {
      return ["select_content", { content_type: link.dataset.kind || "post", content_id: link.dataset.contentId, ui_location: ui }];
    }
    var post = url.pathname.match(POST_PATH);
    if (post) return ["select_content", { content_type: "post", content_id: post[1], ui_location: ui }];
    if (link.dataset.nav) return ["nav_click", { nav_item: link.dataset.nav, ui_location: ui }];
    if (url.hash === "#top" && url.pathname === window.location.pathname) return ["nav_click", { nav_item: "top", ui_location: ui }];
    if (link.closest(".kc-pager")) return ["nav_click", { nav_item: "page", ui_location: "pager" }];
    if (url.pathname !== window.location.pathname) return ["nav_click", { nav_item: "page", ui_location: ui }];
    return null;
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    var hit = classify(link, event);
    if (hit) send(hit[0], hit[1]);
  }, true);
  // Middle-click opens a tab without a click event.
  document.addEventListener("auxclick", function (event) {
    if (event.button !== 1) return;
    var link = event.target.closest && event.target.closest("a[href]");
    var hit = link && classify(link, event);
    if (hit) send(hit[0], hit[1]);
  }, true);

  /* First play of each native <video> (YouTube would be Enhanced Measurement's video_start). */
  var played = typeof WeakSet === "function" ? new WeakSet() : null;
  document.addEventListener("play", function (event) {
    var video = event.target;
    if (!video || video.tagName !== "VIDEO" || !played || played.has(video)) return;
    played.add(video);
    var user = navigator.userActivation ? navigator.userActivation.isActive : !video.autoplay;
    var src = (video.currentSrc || video.src || "").split(/[?#]/)[0];
    var article = video.closest(".kc-post[data-content-id]");
    send("native_video_start", {
      content_id: article ? article.getAttribute("data-content-id") : "",
      video_name: src.split("/").pop(),
      video_trigger: user ? "user" : "autoplay"
    });
  }, true);

  /* Page-level. */
  if (body && body.getAttribute("data-content-group") === "error") send("page_not_found", {});
  if (!live) {
    // Dev mode only: show the sanitized page context that the live snippet would send.
    var notFound = body && body.getAttribute("data-content-group") === "error";
    log.unshift({ name: "page_view", params: {
      page_location: notFound ? window.location.origin + "/404.html" : window.location.origin + window.location.pathname,
      content_group: body ? body.getAttribute("data-content-group") : "",
      site_theme: document.documentElement.dataset.theme
    } });
  }
})();
