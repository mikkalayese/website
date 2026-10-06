/* Image quote template (/social-media-post-quote).
   The design is laid out once as a "scene" (rectangles, text, images), then drawn
   to the canvas (preview + PNG) or written out as SVG, so both downloads match. */
(() => {
  const root = document.querySelector("[data-quote-tool]");
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const canvas = $("#qt-canvas");
  const ctx = canvas.getContext("2d");
  const els = {
    quote: $("#qt-quote"), author: $("#qt-author"), handle: $("#qt-handle"),
    bg: $("#qt-bg"), text: $("#qt-text"), accent: $("#qt-accent"),
    fontMain: $("#qt-font-main"), fontAccent: $("#qt-font-accent"),
  };
  const DEFAULTS = Object.fromEntries(Object.entries(els).map(([k, el]) => [k, el.value]));
  const status = $("[data-qt-status]");

  // Main fonts: weight + generic fallback. Secondary fonts: weight + size scale so the
  // handwritten words sit at a similar visual size whichever font is picked.
  const MAIN = {
    "Inter Tight": { w: 600, fb: "sans-serif" }, "Poppins": { w: 600, fb: "sans-serif" },
    "Montserrat": { w: 600, fb: "sans-serif" }, "Playfair Display": { w: 600, fb: "serif" },
    "Lora": { w: 600, fb: "serif" },
  };
  const ACCENT = {
    "Caveat": { w: 600, scale: 1.28 }, "Dancing Script": { w: 600, scale: 1.16 },
    "Pacifico": { w: 400, scale: 0.96 }, "Permanent Marker": { w: 400, scale: 1.0 },
    "Shadows Into Light": { w: 400, scale: 1.22 },
  };
  const LOGO_FONT = { fam: "Inter Tight", w: 700, fb: "sans-serif" };

  // Opening quote mark, drawn as a shape (not a font glyph) so it looks the same
  // with every font and in both PNG and SVG. One mark is ~58 x 67 units; two sit side by side.
  const MARK_D = "M0 47a19.5 19.5 0 1 1 39 0a19.5 19.5 0 1 1-39 0Z M0 47C0 24 20 7 56 0C40 9 34.5 21 34.4 34.5L19.5 47Z";
  const MARK_GAP = 64, MARK_W = 122, MARK_H = 67;

  let logo = null; // { img, src } when a custom logo is uploaded

  const val = (name) => root.querySelector(`input[name="${name}"]:checked`).value;
  const mainFont = () => ({ fam: els.fontMain.value, ...MAIN[els.fontMain.value] });
  const accentFont = () => ({ fam: els.fontAccent.value, fb: "cursive", ...ACCENT[els.fontAccent.value] });
  const css = (f, size) => `${f.w} ${size}px "${f.fam}", ${f.fb}`;
  const measure = (f, size, s) => { ctx.font = css(f, size); return ctx.measureText(s).width; };

  // "*words*" become the secondary (handwritten) font
  function tokens(text) {
    const out = [];
    text.split(/(\*[^*]+\*)/g).forEach((part) => {
      if (!part) return;
      const accent = part.startsWith("*") && part.endsWith("*") && part.length > 2;
      (accent ? part.slice(1, -1) : part).split(/\s+/).forEach((w) => { if (w) out.push({ w, accent }); });
    });
    return out;
  }

  function scene() {
    const [W, H] = val("qt-size").split("x").map(Number);
    const align = val("qt-align");
    const centred = align === "center";
    const bg = els.bg.value, ink = els.text.value, accent = els.accent.value;
    const M = mainFont(), A = accentFont();
    const pad = Math.round(W * 0.1), maxW = W - pad * 2;
    const ops = [{ t: "rect", x: 0, y: 0, w: W, h: H, fill: bg }];
    const text = (s, x, y, f, size, fill, anchor = "start", alpha = 1) => ops.push({ t: "text", s, x, y, f, size, fill, anchor, alpha });

    // Opening quote mark: two bold drawn shapes
    const markScale = (W * 0.19) / MARK_W;
    const markTop = pad * 0.9;
    const markX = centred ? (W - W * 0.19) / 2 : pad - W * 0.005;
    [0, MARK_GAP].forEach((dx) => ops.push({ t: "path", d: MARK_D, x: markX + dx * markScale, y: markTop, k: markScale, fill: accent }));
    const markBottom = markTop + MARK_H * markScale;

    // Footer block sizes (logo sits under the name in centred layouts)
    const nameSize = Math.round(W * 0.036), handleSize = Math.round(W * 0.028);
    const logoBoxH = W * 0.06, logoGap = W * 0.04;
    const footerShift = centred ? logoBoxH + logoGap : 0;

    // Quote: largest size whose wrapped block fits the space
    const toks = tokens(els.quote.value.trim() || " ");
    const top = markBottom + W * 0.05;
    const availH = H - top - W * 0.26 - footerShift - pad * 0.4; // keeps clear of the accent rule
    let size = Math.round(W * 0.085), lines = [], space = 0, lh = 0;
    for (; size > 26; size -= 2) {
      space = measure(M, size, " "); lh = size * 1.18; lines = [];
      let line = [], width = 0;
      for (const t of toks) {
        const f = t.accent ? A : M;
        const fs = t.accent ? Math.round(size * A.scale) : size;
        const w = measure(f, fs, t.w);
        const add = line.length ? space + w : w;
        if (line.length && width + add > maxW) { lines.push({ items: line, width }); line = []; width = 0; }
        line.push({ ...t, f, fs, width: w }); width += line.length > 1 ? space + w : w;
      }
      if (line.length) lines.push({ items: line, width });
      if (lines.length * lh <= availH) break;
    }
    let y = top + Math.max(0, (availH - lines.length * lh) / 2) + size;
    for (const line of lines) {
      let x = centred ? (W - line.width) / 2 : pad;
      line.items.forEach((t, i) => {
        if (i) x += space;
        text(t.w, x, y, t.f, t.fs, t.accent ? accent : ink);
        x += t.width;
      });
      y += lh;
    }

    // Footer: accent rule, name, handle
    const fy = H - pad - W * 0.06 - footerShift;
    ops.push({ t: "rect", x: centred ? W / 2 - W * 0.04 : pad, y: fy - W * 0.075, w: W * 0.08, h: Math.max(4, W * 0.005), fill: accent });
    const fx = centred ? W / 2 : pad, anchor = centred ? "middle" : "start";
    if (els.author.value.trim()) text(els.author.value.trim(), fx, fy, M, nameSize, ink, anchor);
    if (els.handle.value.trim()) text(els.handle.value.trim(), fx, fy + W * 0.045, M, handleSize, ink, anchor, 0.7);

    // Logo: bottom-right (left layout) or bottom-centre (centred layout)
    const baseY = centred ? H - pad * 0.7 : fy + W * 0.045;
    if (logo) {
      const maxH = logoBoxH, maxLW = W * 0.28;
      const k = Math.min(maxH / logo.img.naturalHeight, maxLW / logo.img.naturalWidth);
      const lw = logo.img.naturalWidth * k, lhh = logo.img.naturalHeight * k;
      const lx = centred ? (W - lw) / 2 : W - pad - lw;
      ops.push({ t: "image", img: logo.img, src: logo.src, x: lx, y: baseY - lhh + W * 0.008, w: lw, h: lhh });
    } else {
      const ls = Math.round(W * 0.034);
      const wordW = measure(LOGO_FONT, ls, "mikka"), dotW = measure(LOGO_FONT, ls, ".");
      const lx = centred ? (W - wordW - dotW) / 2 : W - pad - wordW - dotW;
      text("mikka", lx, baseY, LOGO_FONT, ls, ink);
      text(".", lx + wordW, baseY, LOGO_FONT, ls, accent);
    }
    return { W, H, ops };
  }

  function paint(S) {
    if (canvas.width !== S.W || canvas.height !== S.H) { canvas.width = S.W; canvas.height = S.H; }
    root.querySelector("[data-qt-size-label]").textContent = `${S.W}×${S.H} px`;
    ctx.textBaseline = "alphabetic";
    for (const o of S.ops) {
      ctx.globalAlpha = o.alpha ?? 1;
      if (o.t === "rect") { ctx.fillStyle = o.fill; ctx.fillRect(o.x, o.y, o.w, o.h); }
      else if (o.t === "text") {
        ctx.font = css(o.f, o.size); ctx.fillStyle = o.fill;
        ctx.textAlign = o.anchor === "middle" ? "center" : o.anchor === "end" ? "right" : "left";
        ctx.fillText(o.s, o.x, o.y);
      } else if (o.t === "path") {
        ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.k, o.k);
        ctx.fillStyle = o.fill; ctx.fill(new Path2D(o.d)); ctx.restore();
      } else if (o.t === "image") ctx.drawImage(o.img, o.x, o.y, o.w, o.h);
    }
    ctx.globalAlpha = 1;
  }

  const draw = () => paint(scene());

  // ---------- SVG export ----------
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const r = (n) => Math.round(n * 100) / 100;

  const toBase64 = (buf) => {
    let s = ""; const b = new Uint8Array(buf);
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  };

  // Embed only the letters actually used, so the SVG looks right on any computer
  async function fontFaces(S) {
    const want = new Map();
    for (const o of S.ops) if (o.t === "text") {
      const key = `${o.f.fam}|${o.f.w}`;
      want.set(key, (want.get(key) || "") + o.s);
    }
    const faces = [];
    for (const [key, chars] of want) {
      const [fam, w] = key.split("|");
      const uniq = [...new Set(chars)].join("");
      const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, "+")}:wght@${w}&text=${encodeURIComponent(uniq)}`;
      const cssText = await (await fetch(url)).text();
      for (const block of cssText.match(/@font-face\s*{[^}]*}/g) || []) {
        const src = (block.match(/url\(([^)]+)\)/) || [])[1];
        if (!src) continue;
        const data = toBase64(await (await fetch(src.replace(/['"]/g, ""))).arrayBuffer());
        const range = (block.match(/unicode-range:\s*([^;]+);/) || [])[1];
        faces.push(`@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;src:url(data:font/woff2;base64,${data}) format('woff2');${range ? `unicode-range:${range};` : ""}}`);
      }
    }
    return faces.join("");
  }

  function svgMarkup(S, faces) {
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${S.W}" height="${S.H}" viewBox="0 0 ${S.W} ${S.H}">`];
    if (faces) out.push(`<defs><style>${faces}</style></defs>`);
    for (const o of S.ops) {
      if (o.t === "rect") out.push(`<rect x="${r(o.x)}" y="${r(o.y)}" width="${r(o.w)}" height="${r(o.h)}" fill="${o.fill}"/>`);
      else if (o.t === "text") out.push(`<text x="${r(o.x)}" y="${r(o.y)}" font-family="'${esc(o.f.fam)}', ${o.f.fb}" font-weight="${o.f.w}" font-size="${o.size}" fill="${o.fill}"${o.anchor !== "start" ? ` text-anchor="${o.anchor}"` : ""}${o.alpha !== 1 ? ` fill-opacity="${o.alpha}"` : ""} xml:space="preserve">${esc(o.s)}</text>`);
      else if (o.t === "path") out.push(`<path d="${o.d}" transform="translate(${r(o.x)} ${r(o.y)}) scale(${r(o.k * 1000) / 1000})" fill="${o.fill}"/>`);
      else if (o.t === "image") out.push(`<image x="${r(o.x)}" y="${r(o.y)}" width="${r(o.w)}" height="${r(o.h)}" href="${o.src}" xlink:href="${o.src}" preserveAspectRatio="xMidYMid meet"/>`);
    }
    out.push("</svg>");
    return out.join("\n");
  }

  function save(blob, ext) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quote-${canvas.width}x${canvas.height}.${ext}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function download(kind) {
    status.textContent = "";
    const S = scene(); paint(S);
    if (kind === "png") {
      try {
        canvas.toBlob((blob) => blob ? save(blob, "png") : (status.textContent = "Couldn't create the PNG. Try a PNG or JPG logo."), "image/png");
      } catch (e) {
        status.textContent = "Your browser blocked the PNG because of the logo file. Try a PNG or JPG logo, or download the SVG.";
      }
      return;
    }
    status.textContent = "Preparing SVG…";
    let faces = "";
    try { faces = await fontFaces(S); } catch (e) { console.warn("Couldn't embed fonts in the SVG", e); }
    save(new Blob([svgMarkup(S, faces)], { type: "image/svg+xml" }), "svg");
    status.textContent = faces ? "" : "SVG downloaded. Fonts couldn't be embedded, so it will use fonts installed on the viewer's computer.";
  }

  // ---------- Logo upload ----------
  const logoInput = $("#qt-logo"), logoPreview = $("[data-qt-logo-preview]"), logoRemove = $("[data-qt-logo-remove]");
  const defaultPreview = logoPreview.innerHTML;
  logoInput.addEventListener("change", () => {
    const file = logoInput.files && logoInput.files[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) { status.textContent = "Please choose a PNG, JPG, WebP or SVG image."; return; }
    if (file.size > 5 * 1024 * 1024) { status.textContent = "That image is over 5 MB. Please choose a smaller file."; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        logo = { img, src: reader.result };
        logoPreview.innerHTML = "";
        const thumb = img.cloneNode(); thumb.alt = "Your logo"; logoPreview.appendChild(thumb);
        logoRemove.hidden = false; status.textContent = ""; draw();
      };
      img.onerror = () => { status.textContent = "Couldn't read that image. Try another file."; };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  const clearLogo = () => { logo = null; logoInput.value = ""; logoPreview.innerHTML = defaultPreview; logoRemove.hidden = true; };
  logoRemove.addEventListener("click", () => { clearLogo(); draw(); });

  // ---------- Controls ----------
  const themes = root.querySelectorAll("[data-theme]");
  themes.forEach((b) => b.addEventListener("click", () => {
    const [bg, text, accent] = b.dataset.theme.split(",");
    els.bg.value = bg; els.text.value = text; els.accent.value = accent;
    themes.forEach((t) => t.classList.toggle("is-active", t === b));
    draw();
  }));
  [els.bg, els.text, els.accent].forEach((i) => i.addEventListener("input", () => {
    themes.forEach((t) => t.classList.remove("is-active")); draw();
  }));
  [els.quote, els.author, els.handle].forEach((i) => i.addEventListener("input", draw));
  root.querySelectorAll('input[type="radio"]').forEach((i) => i.addEventListener("change", draw));
  [els.fontMain, els.fontAccent].forEach((sel) => sel.addEventListener("change", async () => {
    const f = sel === els.fontMain ? mainFont() : accentFont();
    draw();
    try { await document.fonts.load(css(f, 80)); } catch (e) { /* draw with fallback */ }
    draw();
  }));
  root.querySelectorAll("[data-qt-download]").forEach((b) => b.addEventListener("click", () => download(b.dataset.qtDownload)));

  $("[data-qt-reset]").addEventListener("click", () => {
    Object.entries(DEFAULTS).forEach(([k, v]) => { els[k].value = v; });
    root.querySelector('input[name="qt-size"][value="1080x1080"]').checked = true;
    root.querySelector('input[name="qt-align"][value="left"]').checked = true;
    themes.forEach((t, i) => t.classList.toggle("is-active", i === 0));
    clearLogo(); status.textContent = "";
    draw();
  });

  // Draw now, and again as fonts finish loading
  draw();
  Promise.all([mainFont(), accentFont(), LOGO_FONT].map((f) => document.fonts.load(css(f, 80)))).then(draw, draw);
  document.fonts.ready.then(draw);
})();
