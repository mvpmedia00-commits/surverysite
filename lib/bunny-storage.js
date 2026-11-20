const SAFE_PATH = /^performers\/\d{4}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|heic)$/i;

export const getBunnyConfig = () => {
  const host = String(process.env.BUNNY_STORAGE_HOST || "storage.bunnycdn.com")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
  const zone = String(process.env.BUNNY_STORAGE_ZONE || "").trim();
  const password = String(process.env.BUNNY_STORAGE_PASSWORD || "").trim();
  if (!host || !zone || !password) {
    return { error: "Photo storage is not configured." };
  }
  return { host, zone, password };
};

export const isSafeStoragePath = (value) => {
  const path = String(value || "").trim().replace(/^\/+/, "");
  if (!path || path.includes("..") || path.includes("\\") || path.includes("\0") || path.includes("//")) return "";
  return SAFE_PATH.test(path) ? path : "";
};

export const newStoragePath = (extension) => {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const id = crypto.randomUUID();
  const ext = String(extension || "jpg").toLowerCase().replace(/^\./, "");
  return `performers/${month}/${id}.${ext}`;
};

const storageUrl = (config, path) => `https://${config.host}/${config.zone}/${path}`;

export const putStorageObject = async (config, path, bytes, contentType) => {
  const response = await fetch(storageUrl(config, path), {
    method: "PUT",
    headers: {
      AccessKey: config.password,
      "Content-Type": contentType || "application/octet-stream"
    },
    body: bytes
  });
  if (!response.ok) await response.arrayBuffer().catch(() => null);
  return response.ok;
};

export const deleteStorageObject = async (config, path) => {
  const response = await fetch(storageUrl(config, path), {
    method: "DELETE",
    headers: { AccessKey: config.password }
  });
  if (response.status === 404) return true;
  if (!response.ok) await response.arrayBuffer().catch(() => null);
  return response.ok;
};

export const getStorageObject = async (config, path) => fetch(storageUrl(config, path), {
  headers: { AccessKey: config.password, Accept: "*/*" }
});

export const sniffImage = (bytes) => {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (buf.length >= 8 && buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return { ext: "png", type: "image/png" };
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return { ext: "webp", type: "image/webp" };
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12).toLowerCase();
    if (brand.startsWith("hei") || brand === "mif1" || brand === "msf1") return { ext: "heic", type: "image/heic" };
  }
  return null;
};

export const bunnyRefsIn = (value, found = []) => {
  if (typeof value === "string" && value.startsWith("bunny:")) {
    const path = isSafeStoragePath(value.slice("bunny:".length));
    if (path) found.push(path);
  } else if (Array.isArray(value)) {
    value.forEach((item) => bunnyRefsIn(item, found));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => bunnyRefsIn(item, found));
  }
  return [...new Set(found)];
};
