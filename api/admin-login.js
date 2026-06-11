import { createAdminToken } from "./_admin-auth.js";

const respond = (res, status, payload) => {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS, GET");
    return res.status(204).end();
  }

  if (req.method === "GET") {
    return respond(res, 200, { ok: true, endpoint: "admin-login", method: "POST" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS, GET");
    return respond(res, 405, { error: "Method not allowed" });
  }

  const configuredPassword = process.env.ADMIN_DASHBOARD_PASSWORD || "";
  if (!configuredPassword) {
    return respond(res, 500, { error: "Missing ADMIN_DASHBOARD_PASSWORD" });
  }

  const password = req.body?.password || "";
  if (password !== configuredPassword) {
    return respond(res, 401, { error: "Invalid admin password" });
  }

  const tokenResult = createAdminToken();
  if (tokenResult.error) {
    return respond(res, 500, { error: tokenResult.error });
  }

  return respond(res, 200, { ok: true, token: tokenResult.token, expiresInMs: tokenResult.expiresInMs });
}
