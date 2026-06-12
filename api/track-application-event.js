import { getSupabaseConfig } from "./_supabase.js";

const respond = (res, status, payload) => {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const allowedEvents = new Set([
  "page_visit",
  "language_selected",
  "application_started",
  "submit_attempt",
  "submit_success",
  "submit_error"
]);

const allowedForms = new Set(["main", "artistic"]);

const trimTo = (value, max) => String(value || "").trim().slice(0, max);

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", "POST, OPTIONS, GET");
      return res.status(204).end();
    }

    if (req.method === "GET") {
      return respond(res, 200, { ok: true, endpoint: "track-application-event", method: "POST" });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST, OPTIONS, GET");
      return respond(res, 405, { error: "Method not allowed" });
    }

    const cfg = getSupabaseConfig();
    if (cfg.error) {
      return respond(res, 500, { error: cfg.error });
    }

    const body = req.body || {};
    const eventType = trimTo(body.event_type, 64);
    const formType = trimTo(body.form_type, 32);
    const sessionId = trimTo(body.session_id, 120);

    if (!allowedEvents.has(eventType)) {
      return respond(res, 400, { error: "Invalid event_type" });
    }

    if (!allowedForms.has(formType)) {
      return respond(res, 400, { error: "Invalid form_type" });
    }

    if (!sessionId) {
      return respond(res, 400, { error: "Missing session_id" });
    }

    const row = {
      session_id: sessionId,
      form_type: formType,
      event_type: eventType,
      language: trimTo(body.language, 10) || null,
      source_page: trimTo(body.source_page, 200) || null,
      application_id: trimTo(body.application_id, 64) || null,
      error_message: trimTo(body.error_message, 800) || null,
      draft_data: body.draft_data && typeof body.draft_data === "object" && !Array.isArray(body.draft_data)
        ? body.draft_data
        : {},
      metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {}
    };

    const response = await fetch(`${cfg.supabaseUrl}/rest/v1/application_events`, {
      method: "POST",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
        "Content-Profile": "public"
      },
      body: JSON.stringify(row)
    });

    if (!response.ok) {
      const detail = await response.text();
      return respond(res, 500, { error: "Failed to record tracking event", detail });
    }

    return respond(res, 200, { ok: true });
  } catch (error) {
    return respond(res, 500, {
      error: "Unexpected server error",
      detail: String(error && error.message ? error.message : error)
    });
  }
}
