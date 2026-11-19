import crypto from "node:crypto";
import { validateAdminRequest } from "./_admin-auth.js";
import { getSupabaseConfig } from "./_supabase.js";

const SETUP_MESSAGE = "Performer invite tables are not set up yet. Run supabase/migrations/20261119_performer_invites.sql in the Supabase SQL editor, then reload the API schema.";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

const respond = (res, status, payload) => {
  res.status(status).setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.end(JSON.stringify(payload));
};

const tablesMissing = (status, detail) => {
  const text = String(detail || "");
  return status === 404 || /PGRST205|42P01|does not exist|schema cache/i.test(text);
};

const permissionDenied = (status, detail) => {
  const text = String(detail || "");
  return status === 401 || status === 403 || /row-level security|permission denied|JWT/i.test(text);
};

const supabaseFetch = async (cfg, path, options = {}) => {
  const response = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: options.prefer || "return=representation",
      "Content-Profile": "public",
      "Accept-Profile": "public"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const detail = await response.text();
  let data = null;
  if (detail) {
    try {
      data = JSON.parse(detail);
    } catch {
      data = null;
    }
  }
  return { ok: response.ok, status: response.status, detail, data };
};

const failForStorage = (res, result) => {
  if (tablesMissing(result.status, result.detail)) {
    return respond(res, 503, { error: SETUP_MESSAGE });
  }
  if (permissionDenied(result.status, result.detail)) {
    return respond(res, 503, { error: "Performer invites need the Supabase service role key. Row level security blocks the public key." });
  }
  return respond(res, 500, { error: "Could not reach invite storage." });
};

const clientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  return String(forwarded || req.headers["x-real-ip"] || "").split(",")[0].trim();
};

const hashIp = (ip) => {
  const value = String(ip || "").trim();
  if (!value) return "";
  const secret = process.env.ADMIN_DASHBOARD_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (secret) {
    return crypto.createHmac("sha256", secret).update(value).digest("hex");
  }
  return crypto.createHash("sha256").update(value).digest("hex");
};

const summarize = (rows) => (Array.isArray(rows) ? rows : []).map((row) => {
  const events = Array.isArray(row.performer_invite_events) ? row.performer_invite_events : [];
  const lastOpened = events.reduce((latest, event) => {
    const opened = event && event.opened_at ? event.opened_at : "";
    return opened > latest ? opened : latest;
  }, "");
  return {
    id: row.id,
    token: row.token,
    label: row.label || "",
    notes: row.notes || "",
    blocked: Boolean(row.blocked),
    created_at: row.created_at,
    open_count: events.length,
    last_opened: lastOpened || null
  };
});

const trackOpen = async (req, res, rawToken) => {
  const token = String(rawToken || "").trim();
  if (!TOKEN_PATTERN.test(token)) {
    return respond(res, 200, { ok: false, available: false });
  }

  const cfg = getSupabaseConfig();
  if (cfg.error) {
    return respond(res, 503, { ok: false, available: false, error: cfg.error });
  }

  const found = await supabaseFetch(
    cfg,
    `performer_invites?select=id,token,blocked&token=eq.${encodeURIComponent(token)}&limit=1`
  );
  if (!found.ok) return failForStorage(res, found);
  const invite = Array.isArray(found.data) ? found.data[0] : null;
  if (!invite || invite.blocked) {
    return respond(res, 200, { ok: false, available: false });
  }

  const opened = await supabaseFetch(cfg, "performer_invite_events", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      invite_id: invite.id,
      token,
      user_agent: String(req.headers["user-agent"] || "").slice(0, 400),
      country: String(req.headers["x-vercel-ip-country"] || "").slice(0, 8),
      ip_hash: hashIp(clientIp(req))
    }
  });
  if (!opened.ok) return failForStorage(res, opened);
  return respond(res, 200, { ok: true, available: true });
};

const listInvites = async (res) => {
  const cfg = getSupabaseConfig();
  if (cfg.error) return respond(res, 503, { error: cfg.error });
  const result = await supabaseFetch(
    cfg,
    "performer_invites?select=id,token,label,notes,blocked,created_at,performer_invite_events(opened_at)&order=created_at.desc"
  );
  if (!result.ok) return failForStorage(res, result);
  return respond(res, 200, { ok: true, invites: summarize(result.data) });
};

const createInvite = async (res, body) => {
  const label = String(body.label || "").trim().slice(0, 120);
  const notes = String(body.notes || "").trim().slice(0, 2000);
  if (!label) return respond(res, 400, { error: "A name or label is required." });
  const cfg = getSupabaseConfig();
  if (cfg.error) return respond(res, 503, { error: cfg.error });
  const token = crypto.randomBytes(24).toString("base64url");
  const result = await supabaseFetch(cfg, "performer_invites", {
    method: "POST",
    body: { token, label, notes }
  });
  if (!result.ok) return failForStorage(res, result);
  const created = Array.isArray(result.data) ? result.data[0] : null;
  return respond(res, 200, {
    ok: true,
    invite: created ? { ...created, open_count: 0, last_opened: null } : { token, label, notes, blocked: false, open_count: 0, last_opened: null }
  });
};

const setBlocked = async (res, body) => {
  const id = String(body.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return respond(res, 400, { error: "Invalid invite." });
  const cfg = getSupabaseConfig();
  if (cfg.error) return respond(res, 503, { error: cfg.error });
  const result = await supabaseFetch(cfg, `performer_invites?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { blocked: body.blocked === true, updated_at: new Date().toISOString() }
  });
  if (!result.ok) return failForStorage(res, result);
  return respond(res, 200, { ok: true });
};

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", "GET, POST, OPTIONS");
      return res.status(204).end();
    }

    if (req.method === "GET") {
      // Auth is temporarily disabled at Matthew's request. To turn it back on:
      // const auth = validateAdminRequest(req);
      // if (!auth.ok) return respond(res, auth.status, { error: auth.error });
      return listInvites(res);
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST, OPTIONS");
      return respond(res, 405, { error: "Method not allowed" });
    }

    const body = req.body || {};
    if (body.action) {
      // Auth is temporarily disabled at Matthew's request for create and block/unblock.
      // To turn it back on, require validateAdminRequest(req) here again.
      if (body.action === "create") return createInvite(res, body);
      if (body.action === "set-blocked") return setBlocked(res, body);
      return respond(res, 400, { error: "Unknown action." });
    }

    return trackOpen(req, res, body.invite || body.token);
  } catch (error) {
    return respond(res, 500, { error: "Unexpected server error" });
  }
}
