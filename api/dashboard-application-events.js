const respond = (res, status, payload) => {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const getSupabaseConfig = () => {
  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_ANON_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || ""
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    return { error: "Missing SUPABASE_URL and a valid Supabase API key" };
  }

  return { supabaseUrl, supabaseKey };
};

const countBy = (rows, field) => {
  const counts = {};
  for (const row of rows) {
    const key = String(row[field] || "Unknown").trim() || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
};

const dailyTrend = (rows) => {
  const counts = {};
  for (const row of rows) {
    if (!row.created_at) {
      continue;
    }
    const day = String(row.created_at).slice(0, 10);
    counts[day] = (counts[day] || 0) + 1;
  }

  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }));
};

const uniqueCount = (rows, field) => {
  const values = new Set();
  for (const row of rows) {
    const value = String(row[field] || "").trim();
    if (value) {
      values.add(value);
    }
  }
  return values.size;
};

const summarizeTracking = (rows) => {
  const summary = {
    totalEvents: rows.length,
    uniqueSessions: uniqueCount(rows, "session_id"),
    pageVisits: 0,
    languageClicks: 0,
    applicationStarts: 0,
    submitAttempts: 0,
    submitSuccess: 0,
    submitErrors: 0,
    languageSelections: {},
    eventTypes: {},
    formTypes: {}
  };

  for (const row of rows) {
    const eventType = String(row.event_type || "Unknown").trim() || "Unknown";
    const formType = String(row.form_type || "Unknown").trim() || "Unknown";
    const language = String(row.language || "unknown").trim() || "unknown";

    summary.eventTypes[eventType] = (summary.eventTypes[eventType] || 0) + 1;
    summary.formTypes[formType] = (summary.formTypes[formType] || 0) + 1;

    if (eventType === "page_visit") {
      summary.pageVisits += 1;
    }
    if (eventType === "language_selected") {
      summary.languageClicks += 1;
      summary.languageSelections[language] = (summary.languageSelections[language] || 0) + 1;
    }
    if (eventType === "application_started") {
      summary.applicationStarts += 1;
    }
    if (eventType === "submit_attempt") {
      summary.submitAttempts += 1;
    }
    if (eventType === "submit_success") {
      summary.submitSuccess += 1;
    }
    if (eventType === "submit_error") {
      summary.submitErrors += 1;
    }
  }

  return summary;
};

const normalizeEvent = (row) => ({
  id: row.id,
  created_at: row.created_at,
  session_id: row.session_id || "",
  form_type: row.form_type || "",
  event_type: row.event_type || "",
  language: row.language || "",
  source_page: row.source_page || "",
  application_id: row.application_id || "",
  error_message: row.error_message || "",
  draft_data: row.draft_data || {},
  metadata: row.metadata || {}
});

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

    const cfg = getSupabaseConfig();
    if (cfg.error) {
      return respond(res, 500, { error: cfg.error });
    }

    const response = await fetch(
      `${cfg.supabaseUrl}/rest/v1/application_events?select=id,created_at,session_id,form_type,event_type,language,source_page,application_id,error_message,draft_data,metadata&order=created_at.desc`,
      {
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          Accept: "application/json",
          "Accept-Profile": "public",
          "Range-Unit": "items",
          Range: "0-1999"
        }
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return respond(res, 500, { error: "Failed to load application events", detail });
    }

    const rows = await response.json();
    const summary = summarizeTracking(rows);
    const events = rows.map(normalizeEvent);
    const topErrors = countBy(rows.filter((row) => String(row.event_type || "") === "submit_error" && row.error_message), "error_message");
    const topSourcePages = countBy(rows.filter((row) => row.source_page), "source_page");

    return respond(res, 200, {
      ok: true,
      totalEvents: rows.length,
      summary,
      byEventType: summary.eventTypes,
      byFormType: summary.formTypes,
      byLanguage: countBy(rows, "language"),
      bySourcePage: topSourcePages,
      byErrorMessage: topErrors,
      trendByDay: dailyTrend(rows),
      recentEvents: events.slice(0, 300)
    });
  } catch (error) {
    return respond(res, 500, {
      error: "Unexpected server error",
      detail: String(error?.message || error)
    });
  }
}
