import { getSupabaseConfig } from "./_supabase.js";

const respond = (res, status, payload) => {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return respond(res, 405, { error: "Method not allowed" });
  }

  const config = getSupabaseConfig();
  return respond(res, 200, {
    ok: true,
    hasError: Boolean(config.error),
    error: config.error || null,
    hasUrl: Boolean(config.supabaseUrl),
    hasKey: Boolean(config.supabaseKey)
  });
}
