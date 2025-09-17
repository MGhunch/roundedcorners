// loader.js (module)
export const log = (...a) => console.log("[cropper]", ...a);
export const error = (...a) => console.error("[cropper]", ...a);

const SUPPORTED = new Set(["image/jpeg","image/png","image/webp"]);

export async function loadImageFromFile(file) {
  if (!file) throw new Error("No file selected.");
  log("picked", file.name, file.type, Math.round(file.size/1024)+"KB");
  if (!SUPPORTED.has(file.type || "")) {
    throw new Error(`Unsupported type: ${file.type || "unknown"} (need JPG/PNG/WebP).`);
  }

  if ("createImageBitmap" in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const off = document.createElement("canvas");
      off.width = bmp.width; off.height = bmp.height;
      off.getContext("2d").drawImage(bmp, 0, 0);
      const dataUrl = off.toDataURL("image/png");
      const img = await loadImageFromDataURL(dataUrl);
      log("loaded via ImageBitmap", bmp.width+"x"+bmp.height);
      return img;
    } catch (e) {
      error("ImageBitmap failed, falling back", e);
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageFromURL(url);
    log("loaded via Image", img.naturalWidth+"x"+img.naturalHeight);
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
