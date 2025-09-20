// loader.js (module)
export const log = (...a) => console.log("[cropper]", ...a);
export const error = (...a) => console.error("[cropper]", ...a);

// Tweak here if you ever change limits
const MIN_KB = 250;     // 250 KB minimum
const MAX_MB = 4;       // 4 MB maximum

// Supported image formats
const SUPPORTED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function loadImageFromFile(file) {
  if (!file) throw new Error("No file selected.");

  const sizeBytes = file.size || 0;
  const sizeKB = sizeBytes / 1024;
  const sizeMB = sizeBytes / (1024 * 1024);

  // Size guards
  if (sizeMB > MAX_MB) {
    throw new Error(`That image is quite big. Please choose one that's under ${MAX_MB} MB.`);
  }
  if (sizeKB < MIN_KB) {
    throw new Error(`That image is quite small. Please choose one that's over ${MIN_KB} KB.`);
  }

  log("picked", file.name, file.type || "unknown", Math.round(sizeKB) + "KB");

  // Type guard
  if (!SUPPORTED.has(file.type || "")) {
    throw new Error("Can't read that image. Please upload a JPEG, PNG or WebP file.");
  }

  // Use ImageBitmap when available (honors EXIF orientation)
  if ("createImageBitmap" in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const off = document.createElement("canvas");
      off.width = bmp.width; off.height = bmp.height;
      off.getContext("2d").drawImage(bmp, 0, 0);
      const dataUrl = off.toDataURL("image/png");
      const img = await loadImageFromDataURL(dataUrl);
      log("loaded via ImageBitmap", bmp.width + "x" + bmp.height);
      return img;
    } catch (e) {
      error("ImageBitmap failed, falling back", e);
    }
  }

  // Fallback: object URL → Image
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
