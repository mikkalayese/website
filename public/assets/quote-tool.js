/* Image quote template (/social-media-post-quote): draws the quote on a canvas
   in the site's colours and fonts, and downloads it as a PNG. */
(() => {
  const root = document.querySelector("[data-quote-tool]");
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const canvas = $("#qt-canvas");
  const ctx = canvas.getContext("2d");
  const els = { quote: $("#qt-quote"), author: $("#qt-author"), handle: $("#qt-handle"),
    bg: $("#qt-bg"), text: $("#qt-text"), accent: $("#qt-accent") };
  const DEFAULTS = { quote: els.quote.value, author: els.author.value, handle: els.handle.value,
    bg: els.bg.value, text: els.text.value, accent: els.accent.value };

  const SANS = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';
  const HAND = '"Caveat", "Segoe Print", cursive';
  const val = (name) => root.querySelector(`input[name="${name}"]:checked`).value;

  // "*words*" become handwritten accent words
  function tokens(text) {
    const out = [];
    text.split(/(\*[^*]+\*)/g).forEach((part) => {
      if (!part) return;
      const accent = part.startsWith("*") && part.endsWith("*") && part.length > 2;
      const clean = accent ? part.slice(1, -1) : part;
      clean.split(/(\s+)/).forEach((w) => { if (w && !/^\s+$/.test(w)) out.push({ w, accent }); });
    });
    return out;
  }

  const font = (t, size) => t.accent ? `600 ${Math.round(size * 1.28)}px ${HAND}` : `600 ${size}px ${SANS}`;

  function layout(toks, size, maxW) {
    const lines = []; let line = []; let width = 0;
    ctx.save();
    ctx.font = `600 ${size}px ${SANS}`; const space = ctx.measureText(" ").width;
    for (const t of toks) {
      ctx.font = font(t, size); const w = ctx.measureText(t.w).width;
      const add = line.length ? space + w : w;
      if (line.length && width + add > maxW) { lines.push({ items: line, width }); line = []; width = 0; }
      line.push({ ...t, width: w }); width += line.length > 1 ? space + w : w;
    }
    if (line.length) lines.push({ items: line, width });
    ctx.restore();
    return { lines, space };
  }

  function draw() {
    const [W, H] = val("qt-size").split("x").map(Number);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    root.querySelector("[data-qt-size-label]").textContent = `${W}×${H} px`;
    const align = val("qt-align");
    const bg = els.bg.value, ink = els.text.value, accent = els.accent.value;
    const pad = Math.round(W * 0.1);
    const maxW = W - pad * 2;

    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Big opening quote mark
    ctx.fillStyle = accent; ctx.textBaseline = "alphabetic";
    ctx.font = `600 ${Math.round(W * 0.24)}px ${HAND}`;
    ctx.textAlign = align === "center" ? "center" : "left";
    const markY = pad + W * 0.15;
    ctx.fillText("“", align === "center" ? W / 2 : pad - W * 0.01, markY);

    // Fit the quote: largest size whose wrapped block fits the space
    const toks = tokens(els.quote.value.trim() || " ");
    const top = markY + W * 0.02;
    const footerH = W * 0.2;
    const availH = H - top - footerH - pad * 0.4;
    let size = Math.round(W * 0.085), lay, lh;
    for (; size > 26; size -= 2) {
      lay = layout(toks, size, maxW); lh = size * 1.18;
      if (lay.lines.length * lh <= availH) break;
    }
    const blockH = lay.lines.length * lh;
    let y = top + Math.max(0, (availH - blockH) / 2) + size;
    for (const line of lay.lines) {
      let x = align === "center" ? (W - line.width) / 2 : pad;
      ctx.textAlign = "left";
      line.items.forEach((t, i) => {
        if (i) x += lay.space;
        ctx.font = font(t, size); ctx.fillStyle = t.accent ? accent : ink;
        ctx.fillText(t.w, x, y);
        x += t.width;
      });
      y += lh;
    }

    // Footer: accent rule, name, handle, brand mark
    const fy = H - pad - W * 0.06;
    ctx.fillStyle = accent;
    const ruleX = align === "center" ? W / 2 - W * 0.04 : pad;
    ctx.fillRect(ruleX, fy - W * 0.075, W * 0.08, Math.max(4, W * 0.005));
    ctx.textAlign = align === "center" ? "center" : "left";
    const fx = align === "center" ? W / 2 : pad;
    ctx.fillStyle = ink;
    ctx.font = `600 ${Math.round(W * 0.036)}px ${SANS}`;
    if (els.author.value.trim()) ctx.fillText(els.author.value.trim(), fx, fy);
    ctx.globalAlpha = 0.7;
    ctx.font = `500 ${Math.round(W * 0.028)}px ${SANS}`;
    if (els.handle.value.trim()) ctx.fillText(els.handle.value.trim(), fx, fy + W * 0.045);
    ctx.globalAlpha = 1;
    if (align !== "center") {
      ctx.textAlign = "right";
      ctx.font = `700 ${Math.round(W * 0.034)}px ${SANS}`;
      ctx.fillStyle = ink; ctx.fillText("mikka", W - pad - W * 0.014, fy + W * 0.045);
      ctx.fillStyle = accent; ctx.fillText(".", W - pad, fy + W * 0.045);
    }
  }

  // Theme presets fill the colour pickers; pickers can then be adjusted freely
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
  root.querySelectorAll("input, textarea").forEach((i) => i.addEventListener("input", draw));
  root.querySelectorAll('input[type="radio"]').forEach((i) => i.addEventListener("change", draw));

  root.querySelector("[data-qt-reset]").addEventListener("click", () => {
    Object.entries(DEFAULTS).forEach(([k, v]) => { els[k].value = v; });
    root.querySelector('input[name="qt-size"][value="1080x1080"]').checked = true;
    root.querySelector('input[name="qt-align"][value="left"]').checked = true;
    themes.forEach((t, i) => t.classList.toggle("is-active", i === 0));
    draw();
  });

  root.querySelector("[data-qt-download]").addEventListener("click", () => {
    draw();
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `quote-${canvas.width}x${canvas.height}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, "image/png");
  });

  // Draw once now, and again when the brand fonts have loaded
  draw();
  Promise.all([
    document.fonts.load(`600 80px ${SANS}`), document.fonts.load(`700 80px ${SANS}`),
    document.fonts.load(`600 80px ${HAND}`), document.fonts.load(`500 80px ${HAND}`),
  ]).then(draw, draw);
  document.fonts.ready.then(draw);
})();
