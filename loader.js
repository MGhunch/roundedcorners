// loader.js (module)
export const log = (...a) => console.log("[cropper]", ...a);
export const error = (...a) => console.error("[cropper]", ...a);

// Accept JPEG, PNG, GIF (added), WebP
const SUPPORTED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

// File size thresholds
const MIN_SIZE = 250 * 1024;       // 250 KB
const MAX_SIZE = 4 * 1024 * 1024;  // 4 MB

export async function loadImageFromFile(file) {
  if (!file) throw new Error("No file selected.");

  log("picked", file.name, file.type, Math.round(file.size / 1024) + "KB");

  // File size checks
  if (file.size < MIN_SIZE) {
    throw new Error("That image is quite small. Please choose one that's over 250 KB.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("That image is quite big. Please choose one that's under 4 MB.");
  }

  // File type check
  if (!SUPPORTED.has(file.type || "")) {
    throw new Error("Can't read that image. Please upload a JPEG, PNG, GIF or WebP.");
  }

  // Try ImageBitmap first (fast path)
  if ("createImageBitmap" in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const off = document.createElement("canvas");
      off.width = bmp.width;
      off.height = bmp.height;
      off.getContext("2d").drawImage(bmp, 0, 0);
      const dataUrl = off.toDataURL("image/png");
      const img = await loadImageFromDataURL(dataUrl);
      log("loaded via ImageBitmap", bmp.width + "x" + bmp.height);
      return img;
    } catch (e) {
      error("ImageBitmap failed, falling back", e);
    }
  }

  // Fallback: createObjectURL
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageFromURL(url);
    log("loaded via Image", img.naturalWidth + "x" + img.naturalHeight);
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImageFromURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image decode failed for URL"));
    img.src = url;
  });
}

function loadImageFromDataURL(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image decode failed for DataURL"));
    img.src = dataUrl;
  });
}
