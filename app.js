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

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const coverScale = (sw, sh) => Math.max(DST_W / sw, DST_H / sh);

function roundedClipPath(ctx) {
  ctx.beginPath();

  // Start at top-left (square)
  ctx.moveTo(0, 0);

  // Top edge → before TR
  ctx.lineTo(DST_W - R_TR, 0);
  // TR corner
  if (R_TR) ctx.quadraticCurveTo(DST_W, 0, DST_W, R_TR); else ctx.lineTo(DST_W, 0);

  // Right edge → before BR
  ctx.lineTo(DST_W, DST_H - R_BR);
  // BR corner
  if (R_BR) ctx.quadraticCurveTo(DST_W, DST_H, DST_W - R_BR, DST_H); else ctx.lineTo(DST_W, DST_H);

  // Bottom edge → before BL
  ctx.lineTo(R_BL, DST_H);
  // BL corner
  if (R_BL) ctx.quadraticCurveTo(0, DST_H, 0, DST_H - R_BL); else ctx.lineTo(0, DST_H);

  // Left edge back up (TL is 0 so straight line)
  ctx.lineTo(0, 0);
  ctx.closePath();
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

// Keep the UI bits (percent label + filled track) in sync with the slider value
function updateZoomUI() {
  const pctEl = document.getElementById("zoomPct");
  if (pctEl && minScale) {
    // Percent relative to the cover scale (minScale): 100% at default
    const pct = Math.round((scale / minScale) * 100);
    pctEl.textContent = `${pct}%`;
  }

  // Filled track (based on slider position within its range)
  const min = parseFloat(zoomSlider.min);
  const max = parseFloat(zoomSlider.max);
  const fill = ((scale - min) / (max - min)) * 100;
  zoomSlider.style.setProperty("--fill", `${clamp(fill, 0, 100)}%`);
}

function resetView() {
  if (!img) return;

  // Cover scale to fill 470×200
  minScale = coverScale(img.naturalWidth, img.naturalHeight);

  // Range symmetric around 100% so the thumb sits in the middle at default
  zoomSlider.min = String(minScale * 0.5);  // 50%
  zoomSlider.max = String(minScale * 1.5);  // 150%
  scale = minScale;                         // 100% (middle)
  zoomSlider.value = String(scale);

  tx = 0; ty = 0;

  // Hide the “Upload your image” hint now that we have an image
  const hint = document.getElementById("emptyHint");
  if (hint) hint.style.display = "none";

  updateZoomUI();
  draw();
}

// --- events ---
fileInput.addEventListener("change", async (e) => {
  try {
    img = await loadImageFromFile(e.target.files?.[0]); // JPG/PNG/WebP support
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

  // Zoom about the canvas center
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
  a.download = "content-card.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// Disable download until an image is loaded
downloadBtn.disabled = true;

// initial paint (blank)
updateZoomUI();
draw();
