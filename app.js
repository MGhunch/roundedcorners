// app.js (module)
import { loadImageFromFile, log, error } from "./loader.js";

const DST_W = 1200, DST_H = 628;
const $ = id => document.getElementById(id);
const fileInput   = $("file");
const zoomSlider  = $("zoom");
const radiusInput = $("rTR");
const resetBtn    = $("reset");
const downloadBtn = $("download");
const canvas = $("out");
const ctx = canvas.getContext("2d");
canvas.width = DST_W; canvas.height = DST_H;

let img = null, tx = 0, ty = 0, scale = 1, minScale = 1, dragging = false, lastX = 0, lastY = 0;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const clampRadius = r => clamp((r||0)|0, 0, Math.floor(Math.min(DST_W, DST_H)/2));
const coverScale = (sw, sh) => Math.max(DST_W / sw, DST_H / sh);

function draw() {
  ctx.clearRect(0,0,DST_W,DST_H);
  if (!img) return;
  const rTR = clampRadius(parseInt(radiusInput.value, 10) || 0);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.lineTo(DST_W - rTR, 0);
  if (rTR) ctx.quadraticCurveTo(DST_W, 0, DST_W, rTR); else ctx.lineTo(DST_W, 0);
  ctx.lineTo(DST_W, DST_H);
  ctx.lineTo(0, DST_H);
  ctx.closePath(); ctx.clip();

  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  const dx = Math.round((DST_W - dw)/2 + tx), dy = Math.round((DST_H - dh)/2 + ty);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(`zoom ${scale.toFixed(2)}  min ${minScale.toFixed(2)}`, 8, DST_H - 10);
}

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

fileInput.addEventListener("change", async (e) => {
  try {
    img = await loadImageFromFile(e.target.files?.[0]);
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
  if (!img) return; e.preventDefault();
  const factor = Math.exp(-e.deltaY * 0.0015);
  const newScale = clamp(scale * factor, minScale, parseFloat(zoomSlider.max));
  const cx = DST_W/2, cy = DST_H/2;
  tx = cx + (tx - cx) * (newScale/scale);
  ty = cy + (ty - cy) * (newScale/scale);
  scale = newScale;
  zoomSlider.value = String(scale);
  draw();
}, { passive:false });

zoomSlider.addEventListener("input", () => {
  if (!img) return;
  scale = clamp(parseFloat(zoomSlider.value)||minScale, minScale, parseFloat(zoomSlider.max));
  draw();
});
radiusInput.addEventListener("input", draw);
resetBtn.addEventListener("click", resetView);

downloadBtn.addEventListener("click", () => {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a"); a.href = url; a.download = "top-right-rounded.png";
  document.body.appendChild(a); a.click(); a.remove();
});

draw();
