import crypto from "node:crypto";
import { Readable } from "node:stream";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "dale5sd8p";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

const ASSETS = {
  hero1: {
    resourceType: "image",
    version: "1785605567",
    publicId: "IMG_2548_w3fawy",
    format: "jpg",
    transformations: ["f_auto,q_auto"]
  },
  hero2: {
    resourceType: "image",
    version: "1785605586",
    publicId: "IMG_2728_hdh3b9",
    format: "jpg",
    transformations: ["f_auto,q_auto"]
  },
  bodypaintPhoto: {
    resourceType: "image",
    version: "1785625713",
    publicId: "5B1A0399_uawzvr",
    format: "jpg",
    transformations: ["f_auto,q_auto"]
  },
  bodypaintVideo: {
    resourceType: "video",
    version: "1785625712",
    publicId: "IMG_3581_mkgbfe",
    format: "mp4",
    transformations: ["f_mp4,q_auto"]
  }
};

const respond = (res, status, payload) => {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const base64Url = (buffer) => buffer
  .toString("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/g, "");

const signDeliveryPath = (path) => {
  const digest = crypto.createHash("sha1").update(`${path}${API_SECRET}`).digest();
  return base64Url(digest).slice(0, 8);
};

const buildSignedUrl = (asset, deliveryType) => {
  const parts = [
    ...asset.transformations,
    `v${asset.version}`,
    `${asset.publicId}.${asset.format}`
  ];
  const deliveryPath = parts.join("/");
  const signature = signDeliveryPath(deliveryPath);
  return `https://res.cloudinary.com/${CLOUD_NAME}/${asset.resourceType}/${deliveryType}/s--${signature}--/${deliveryPath}`;
};

const copyHeader = (source, target, name) => {
  const value = source.headers.get(name);
  if (value) {
    target.setHeader(name, value);
  }
};

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", "GET, OPTIONS");
      return res.status(204).end();
    }

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET, OPTIONS");
      return respond(res, 405, { error: "Method not allowed" });
    }

    const assetKey = String(req.query?.asset || "");
    const asset = ASSETS[assetKey];
    if (!asset) {
      return respond(res, 404, { error: "Unknown media asset" });
    }

    if (!API_SECRET) {
      return respond(res, 503, { error: "Missing CLOUDINARY_API_SECRET" });
    }

    const headers = {};
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const deliveryTypes = ["upload", "authenticated"];
    let lastStatus = 0;
    let lastDetail = "";

    for (const deliveryType of deliveryTypes) {
      const signedUrl = buildSignedUrl(asset, deliveryType);
      const response = await fetch(signedUrl, { headers });
      lastStatus = response.status;

      if (response.ok || response.status === 206) {
        res.status(response.status);
        copyHeader(response, res, "content-type");
        copyHeader(response, res, "content-length");
        copyHeader(response, res, "content-range");
        copyHeader(response, res, "accept-ranges");
        res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");

        if (!response.body) {
          return res.end();
        }

        return Readable.fromWeb(response.body).pipe(res);
      }

      lastDetail = await response.text().catch(() => "");
    }

    return respond(res, lastStatus || 502, {
      error: "Cloudinary media delivery failed",
      detail: lastDetail
    });
  } catch (error) {
    return respond(res, 500, {
      error: "Unexpected Cloudinary media error",
      detail: String(error?.message || error)
    });
  }
}
