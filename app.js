// app.js
import { loadImageFromFile, log, error } from "./loader.js";

// ===== Config =====
const DST_W = 1200;
const DST_H = 628;

// ===== DOM =====
const $ = id => document.getElementById(id);
const fileInput   = $("file");
const zoomSlider  = $("zoom");
const radiusInput = $("rTR");
const resetBtn    = $("reset");
const downloadBtn = $("download");
const canvas = $("out");
const ctx = canvas.getContext("2d");
canvas.width = DST_W; canvas.height = DST_H;

// ===== State =====
let img = null;           // HTMLImageElement
let tx = 0, ty = 0;       // translation (px)
let scale = 1;            // current zoom
let minScale = 1;         // cover zoom
let dragging = false, lastX = 0, lastY = 0;

// ===== Helpers =====
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function clampRadius(r){ return clamp((r||0)|0, 0, Math.floor(Math.min(DST_W, DST_H)/2)); }
function coverScale(sw, sh){ return Math.max(DST_W / sw, DST_H / sh); }

// ===== Drawing =====
function draw() {
  ctx.clearRect(0,0,DST_W,DST_H);
  if (!img) return;

  const rTR = clampRadius(parseInt(radiusInput.value, 10) || 0);

  // Clip path: only top-right corner rounded
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.lineTo(DST_W - rTR, 0);
  if (rTR) ctx.quadraticCurveTo(DST_W, 0, DST_W, rTR); else ctx.lineTo(DST_W, 0);
  ctx.lineTo(DST_W, DST_H);
  ctx.lineTo(0, DST_H);
  ctx.closePath();
  ctx.clip();

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = Math.round((DST_W - dw)/2 + tx);
  const dy = Math.round((DST_H - dh)/2 + ty);
  ctx.drawImage(img, dx, dy, dw, dh);

  ctx.restore();

  // debug overlay
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(`zoom ${scale.toFixed(2)}  min ${minScale.toFixed(2)}`, 8, DST_H - 10);
}

// ===== View control =====
function resetView() {
  if (!img) return;
  minScale = coverScale(img.naturalWidth, img.naturalHeight);
  scale = minScale;
  zoomSlider.min = String(minScale);
  zoomSlider.max = String(Math.max(minScale*3, minScale + 0.5));
  zoomSlider.value = String(scale);
  tx = 0; ty = 0;
  draw();
}

// ===== Events =====
fileInput.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  try {
    img = await loadImageFromFile(f);
    resetView();
  } catch (err) {
    error(err);
    alert(err.message || "Failed to load image.");
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
  if (!img) return;
  e.preventDefault();
  const delta = -e.deltaY; // up = zoom in
  const factor = Math.exp(delta * 0.0015);
  const maxZ = parseFloat(zoomSlider.max);
  const newScale = clamp(scale * factor, minScale, maxZ);

  // zoom relative to canvas center
  const cx = DST_W/2, cy = DST_H/2;
  tx = cx + (tx - cx) * (newScale/scale);
  ty = cy + (ty - cy) * (newScale/scale);

  scale = newScale;
  zoomSlider.value = String(scale);
  draw();
}, { passive:false });

zoomSlider.addEventListener("input", () => {
  if (!img) return;
  const maxZ = parseFloat(zoomSlider.max);
  scale = clamp(parseFloat(zoomSlider.value) || minScale, minScale, maxZ);
  draw();
});

radiusInput.addEventListener("input", draw);
resetBtn.addEventListener("click", resetView);

downloadBtn.addEventListener("click", () => {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url; a.download = "top-right-rounded.png";
  document.body.appendChild(a); a.click(); a.remove();
});

// initial paint
draw();
