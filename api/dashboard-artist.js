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
    const key = row[field] || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
};

const countArrayField = (rows, field) => {
  const counts = {};
  for (const row of rows) {
    const items = Array.isArray(row[field]) ? row[field] : [];
    for (const item of items) {
      counts[item] = (counts[item] || 0) + 1;
    }
  }
  return counts;
};

const monthlyTrend = (rows) => {
  const counts = {};
  for (const row of rows) {
    if (!row.created_at) continue;
    const month = String(row.created_at).slice(0, 7);
    counts[month] = (counts[month] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
};

const summarizeEvents = (rows) => {
  const summary = {
    totalVisits: 0,
    applicationStarts: 0,
    submitAttempts: 0,
    submitSuccess: 0,
    submitErrors: 0
  };

  for (const row of rows) {
    const eventType = String(row.event_type || "");
    if (eventType === "page_visit") summary.totalVisits += 1;
    if (eventType === "application_started") summary.applicationStarts += 1;
    if (eventType === "submit_attempt") summary.submitAttempts += 1;
    if (eventType === "submit_success") summary.submitSuccess += 1;
    if (eventType === "submit_error") summary.submitErrors += 1;
  }

  return summary;
};

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", "GET, PATCH, OPTIONS");
      return res.status(204).end();
    }

    if (req.method !== "GET" && req.method !== "PATCH") {
      res.setHeader("Allow", "GET, PATCH, OPTIONS");
      return respond(res, 405, { error: "Method not allowed" });
    }

    const cfg = getSupabaseConfig();
    if (cfg.error) {
      return respond(res, 500, { error: cfg.error });
    }

    if (req.method === "PATCH") {
      const body = req.body || {};
      const id = body.id;
      const status = body.status;
      const allowed = ["pending", "contacted", "scheduled", "approved", "archived", "denied"];

      if (!id || !allowed.includes(status)) {
        return respond(res, 400, { error: "Invalid id or status" });
      }

      const updateResponse = await fetch(`${cfg.supabaseUrl}/rest/v1/artist_applications?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          "Content-Profile": "public",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({ review_status: status, review_updated_at: new Date().toISOString() })
      });

      if (!updateResponse.ok) {
        const detail = await updateResponse.text();
        return respond(res, 500, { error: "Failed to update artist status", detail });
      }

      return respond(res, 200, { ok: true });
    }

    const response = await fetch(`${cfg.supabaseUrl}/rest/v1/artist_applications?select=*&order=created_at.desc`, {
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Accept-Profile": "public",
        "Range-Unit": "items",
        Range: "0-999999"
      }
    });

    if (!response.ok) {
      const detail = await response.text();
      return respond(res, 500, { error: "Failed to load artist dashboard data", detail });
    }

    const rows = await response.json();
    const eventsResponse = await fetch(`${cfg.supabaseUrl}/rest/v1/application_events?select=event_type&form_type=eq.artist&order=created_at.desc`, {
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Accept-Profile": "public",
        "Range-Unit": "items",
        Range: "0-999999"
      }
    });

    const eventRows = eventsResponse.ok ? await eventsResponse.json() : [];
    const analyticsRows = rows.filter((row) => (row.review_status || "pending") !== "denied");
    const artists = rows.map((row) => ({
      ...row,
      full_name: row.full_name || "Unnamed Artist",
      review_status: row.review_status || "pending",
      admin_notes: row.admin_notes || ""
    }));

    return respond(res, 200, {
      totalApplications: analyticsRows.length,
      bySource: countBy(analyticsRows, "hear_about"),
      byExperience: countBy(analyticsRows, "experience_level"),
      byBodyPaintExperience: countBy(analyticsRows, "body_paint_experience"),
      byTravelWilling: countBy(analyticsRows, "travel_willing"),
      byExpectedRate: countBy(analyticsRows, "expected_rate"),
      byStatus: countBy(analyticsRows, "review_status"),
      byDiscipline: countArrayField(analyticsRows, "artist_disciplines"),
      byPreferredWork: countArrayField(analyticsRows, "preferred_work"),
      trendByMonth: monthlyTrend(analyticsRows),
      tracking: summarizeEvents(eventRows),
      artists
    });
  } catch (error) {
    return respond(res, 500, {
      error: "Unexpected server error",
      detail: String(error?.message || error)
    });
  }
}
