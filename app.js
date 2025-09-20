// app.js (module)
import { loadImageFromFile, log, error } from "./loader.js";

// --- export size & corner radii ---
const DST_W = 470, DST_H = 200;
const R_TL = 0, R_TR = 40, R_BR = 12, R_BL = 12;

const $ = id => document.getElementById(id);
const fileInput   = $("file");
const zoomSlider  = $("zoom");
const resetBtn    = $("reset");
const downloadBtn = $("download");
const canvas = $("out");
const ctx = canvas.getContext("2d");
canvas.width = DST_W; canvas.height = DST_H;

let img = null, tx = 0, ty = 0, scale = 1, minScale = 1, dragging = false, lastX = 0, lastY = 0;
let originalNameBase = "image";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const coverScale = (sw, sh) => Math.max(DST_W / sw, DST_H / sh);

function makeSafeBase(filename = "") {
  const base = String(filename).replace(/\.[^.]+$/, "");
  let safe = base.normalize?.("NFKD").replace(/[\u0300-\u036f]/g, "") || base;
  safe = safe.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
  if (!safe) safe = "image";
  if (safe.length > 60) safe = safe.slice(0,60).replace(/-+$/,"");
  return safe;
}

function roundedClipPath(g) {
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(DST_W - R_TR, 0);
  if (R_TR) g.arcTo(DST_W,0,DST_W,R_TR,R_TR); else g.lineTo(DST_W,0);
  g.lineTo(DST_W, DST_H - R_BR);
  if (R_BR) g.arcTo(DST_W,DST_H,DST_W-R_BR,DST_H,R_BR); else g.lineTo(DST_W,DST_H);
  g.lineTo(R_BL, DST_H);
  if (R_BL) g.arcTo(0,DST_H,0,DST_H-R_BL,R_BL); else g.lineTo(0,DST_H);
  g.closePath();
}

function draw() {
  ctx.clearRect(0, 0, DST_W, DST_H);
  if (!img) return;

  ctx.save();
  roundedClipPath(ctx);
  ctx.clip();

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = Math.round((DST_W - dw) / 2 + tx);
  const dy = Math.round((DST_H - dh) / 2 + ty);

  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// --- slider UI sync ---
function updateZoomUI() {
  const pctEl = document.getElementById("zoomPct");
  if (pctEl && minScale) {
    const pct = Math.round((scale / minScale) * 100);
    pctEl.textContent = `${pct}%`;
  }
  const min = parseFloat(zoomSlider.min);
  const max = parseFloat(zoomSlider.max);
  const fill = ((scale - min) / (max - min)) * 100;
  zoomSlider.style.setProperty("--fill", `${clamp(fill, 0, 100)}%`);
}

// --- initialize slider to midpoint visually ---
(function bootSliderToMid() {
  const min = parseFloat(zoomSlider.min) || 0.5;
  const max = parseFloat(zoomSlider.max) || 2.0;
  const mid = (min + max) / 2;
  zoomSlider.value = String(mid);
  scale = mid;
  const fill = ((mid - min) / (max - min)) * 100;
  zoomSlider.style.setProperty("--fill", `${fill}%`);
})();

function resetView() {
  if (!img) return;
  minScale = coverScale(img.naturalWidth, img.naturalHeight);
  zoomSlider.min = String(minScale * 0.5);
  zoomSlider.max = String(minScale * 2.0);
  scale = minScale;
  zoomSlider.value = String(scale);
  tx = 0; ty = 0;

  const hint = document.getElementById("emptyHint");
  if (hint) hint.style.display = "none";

  updateZoomUI();
  draw();
}

// --- events ---
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  try {
    if (file) originalNameBase = makeSafeBase(file.name);
    img = await loadImageFromFile(file);
    resetView();
    downloadBtn.disabled = false;
  } catch (err) {
    error(err);
    alert(err.message || "Failed to load image.");
    const hint = document.getElementById("emptyHint");
    if (hint) hint.style.display = "";
    downloadBtn.disabled = true;
  }
});

canvas.addEventListener("pointerdown", (e) => {
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  tx += (e.clientX - lastX); ty += (e.clientY - lastY);
  lastX = e.clientX; lastY = e.clientY;
  draw();
});
canvas.addEventListener("pointerup",   (e) => { dragging = false; canvas.releasePointerCapture(e.pointerId); });
canvas.addEventListener("pointercancel", () => { dragging = false; });

canvas.addEventListener("wheel", (e) => {
  if (!img) return; e.preventDefault();
  const min = parseFloat(zoomSlider.min);
  const max = parseFloat(zoomSlider.max);
  const factor = Math.exp(-e.deltaY * 0.0015);
  const newScale = clamp(scale * factor, min, max);

  const cx = DST_W / 2, cy = DST_H / 2;
  tx = cx + (tx - cx) * (newScale / scale);
  ty = cy + (ty - cy) * (newScale / scale);
  scale = newScale;

  zoomSlider.value = String(scale);
  updateZoomUI();
  draw();
}, { passive:false });

zoomSlider.addEventListener("input", () => {
  if (!img) return;
  const min = parseFloat(zoomSlider.min);
  const max = parseFloat(zoomSlider.max);
  scale = clamp(parseFloat(zoomSlider.value) || minScale, min, max);
  updateZoomUI();
  draw();
});

resetBtn.addEventListener("click", resetView);

downloadBtn.addEventListener("click", () => {
  if (!img) return;
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${originalNameBase}rounded.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

downloadBtn.disabled = true;

// initial paint
updateZoomUI();
draw();
