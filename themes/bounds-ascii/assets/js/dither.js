/* ============================================================================
   bounds.dev — dither.js
   Framework-agnostic 1-bit Floyd–Steinberg dithering for images.
   The SAME algorithm used to bake the static assets, but applied live so any
   image can be rendered DITHERED or NORMAL on demand.

   Two ways to use it:

   1) Declarative (Hugo / plain HTML) — opt IN per image with data-dither:
        <img src="photo.jpg" data-dither>                      <!-- dithered -->
        <img src="photo.jpg" data-dither data-dither-res="160"> <!-- coarser -->
        <img src="photo.jpg">                                   <!-- normal  -->
      Then once on the page:  ditherInit();
      (Images WITHOUT data-dither are left completely untouched.)

   2) Programmatic — ditherToCanvas(imgEl, canvasEl, opts).

   Options (all optional):
     res        target width in px before dithering (lower = chunkier). def 200
     contrast   1 = none, >1 punchier.                                  def 1.0
     brightness -255..255 added before threshold.                       def 0
     ink/paper  output colors (default pure black / white).
   ========================================================================== */
(function (global) {
  function ditherToCanvas(img, canvas, opts) {
    opts = opts || {};
    const res = Math.max(8, opts.res || 200);
    const contrast = opts.contrast != null ? opts.contrast : 1.0;
    const bright = opts.brightness || 0;
    const ink = hexToRgb(opts.ink || "#000000");
    const paper = hexToRgb(opts.paper || "#ffffff");

    const ratio = img.naturalHeight / img.naturalWidth || 1;
    const w = res, h = Math.max(1, Math.round(res * ratio));

    const work = document.createElement("canvas");
    work.width = w; work.height = h;
    const wctx = work.getContext("2d", { willReadFrequently: true });
    wctx.drawImage(img, 0, 0, w, h);
    const id = wctx.getImageData(0, 0, w, h);
    const d = id.data;

    // grayscale + contrast/brightness
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      let v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      v = (v - 128) * contrast + 128 + bright;
      gray[i] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
    // Floyd–Steinberg error diffusion to 1-bit
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const old = gray[i];
        const nw = old < 128 ? 0 : 255;
        const err = old - nw;
        gray[i] = nw;
        if (x + 1 < w) gray[i + 1] += (err * 7) / 16;
        if (x - 1 >= 0 && y + 1 < h) gray[i - 1 + w] += (err * 3) / 16;
        if (y + 1 < h) gray[i + w] += (err * 5) / 16;
        if (x + 1 < w && y + 1 < h) gray[i + 1 + w] += (err * 1) / 16;
      }
    }
    for (let i = 0; i < w * h; i++) {
      const on = gray[i] < 128; // black pixel
      const c = on ? ink : paper;
      d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
    }
    wctx.putImageData(id, 0, 0);

    // paint onto the target canvas at its own pixel size (nearest-neighbour = crisp)
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(work, 0, 0);
    return canvas;
  }

  // Replace an <img data-dither> in place with a matching <canvas>
  function ditherImg(img) {
    if (img.dataset.dithered) return;
    const run = () => {
      const canvas = document.createElement("canvas");
      // carry over layout-affecting attributes
      canvas.className = img.className;
      canvas.style.cssText = img.style.cssText;
      if (img.getAttribute("aria-label")) canvas.setAttribute("aria-label", img.getAttribute("aria-label"));
      else if (img.alt) canvas.setAttribute("aria-label", img.alt);
      canvas.classList.add("is-dithered");
      try {
        ditherToCanvas(img, canvas, {
          res: parseInt(img.dataset.ditherRes || "200", 10),
          contrast: parseFloat(img.dataset.ditherContrast || "1"),
          brightness: parseFloat(img.dataset.ditherBrightness || "0"),
          ink: img.dataset.ditherInk, paper: img.dataset.ditherPaper,
        });
        img.dataset.dithered = "1";
        if (img.parentNode) img.parentNode.replaceChild(canvas, img);
      } catch (e) { /* CORS-tainted or load error: leave the normal image */ }
    };
    if (img.complete && img.naturalWidth) run();
    else img.addEventListener("load", run, { once: true });
  }

  function ditherInit(root) {
    (root || document).querySelectorAll("img[data-dither]").forEach(ditherImg);
  }

  global.ditherToCanvas = ditherToCanvas;
  global.ditherInit = ditherInit;

  function hexToRgb(hex) {
    if (!hex) return [0, 0, 0];
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
})(window);
