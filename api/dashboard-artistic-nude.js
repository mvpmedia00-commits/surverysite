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

const toPhotoUrl = (supabaseUrl, value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!String(value).includes("/")) return null;
  const encodedPath = String(value).split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${supabaseUrl}/storage/v1/object/public/applications/${encodedPath}`;
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

      const updateResponse = await fetch(`${cfg.supabaseUrl}/rest/v1/artistic_nude_applications?id=eq.${encodeURIComponent(id)}`, {
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
        return respond(res, 500, { error: "Failed to update candidate status", detail });
      }

      return respond(res, 200, { ok: true });
    }

    const response = await fetch(`${cfg.supabaseUrl}/rest/v1/artistic_nude_applications?select=*&order=created_at.desc`, {
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
      return respond(res, 500, { error: "Failed to load dashboard data", detail });
    }

    const rows = await response.json();
    const analyticsRows = rows.filter((row) => (row.review_status || "pending") !== "denied");
    const candidates = rows.map((row) => ({
      ...row,
      full_name: row.full_name || "Unnamed",
      review_status: row.review_status || "pending",
      admin_notes: row.admin_notes || "",
      headshot_url: toPhotoUrl(cfg.supabaseUrl, row.headshot_filename),
      full_body_url: toPhotoUrl(cfg.supabaseUrl, row.full_body_filename)
    }));

    const recentPhotos = rows
      .filter((row) => row.headshot_filename || row.full_body_filename)
      .slice(0, 20)
      .map((row) => ({
        created_at: row.created_at,
        full_name: row.full_name || "Unnamed",
        headshot_url: toPhotoUrl(cfg.supabaseUrl, row.headshot_filename),
        full_body_url: toPhotoUrl(cfg.supabaseUrl, row.full_body_filename)
      }));

    return respond(res, 200, {
      totalApplications: analyticsRows.length,
      bySource: countBy(analyticsRows, "hear_about"),
      byExperience: countBy(analyticsRows, "experience"),
      byFrequency: countBy(analyticsRows, "frequency"),
      byCompInterest: countBy(analyticsRows, "comp_interest"),
      byExpectedComp: countBy(analyticsRows, "expected_comp"),
      byTravelWilling: countBy(analyticsRows, "travel_willing"),
      byStatus: countBy(analyticsRows, "review_status"),
      byInterest: countArrayField(analyticsRows, "interests"),
      trendByMonth: monthlyTrend(analyticsRows),
      candidates,
      recentPhotos
    });
  } catch (error) {
    return respond(res, 500, {
      error: "Unexpected server error",
      detail: String(error && error.message ? error.message : error)
    });
  }
}
