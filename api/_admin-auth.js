import crypto from "node:crypto";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const getSecret = () => process.env.ADMIN_DASHBOARD_PASSWORD || "";

const sign = (timestamp, secret) =>
  crypto.createHmac("sha256", secret).update(String(timestamp)).digest("hex");

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const createAdminToken = () => {
  const secret = getSecret();
  if (!secret) {
    return { error: "Missing ADMIN_DASHBOARD_PASSWORD" };
  }

  const timestamp = Date.now();
  return { token: `${timestamp}.${sign(timestamp, secret)}`, expiresInMs: TOKEN_TTL_MS };
};

export const validateAdminRequest = (req) => {
  const secret = getSecret();
  if (!secret) {
    return { ok: false, status: 500, error: "Missing ADMIN_DASHBOARD_PASSWORD" };
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const [timestamp, signature] = token.split(".");
  const issuedAt = Number(timestamp);

  if (!timestamp || !signature || !Number.isFinite(issuedAt)) {
    return { ok: false, status: 401, error: "Admin authentication required" };
  }

  if (Date.now() - issuedAt > TOKEN_TTL_MS || issuedAt > Date.now() + 60000) {
    return { ok: false, status: 401, error: "Admin session expired" };
  }

  const expected = sign(timestamp, secret);
  if (!safeEqual(signature, expected)) {
    return { ok: false, status: 401, error: "Invalid admin session" };
  }

  return { ok: true };
};
