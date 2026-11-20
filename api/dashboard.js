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
    languageClicks: 0,
    applicationStarts: 0,
    submitAttempts: 0,
    submitSuccess: 0,
    submitErrors: 0,
    languageSelections: {}
  };

  for (const row of rows) {
    const eventType = String(row.event_type || "");
    const language = String(row.language || "").trim() || "unknown";

    if (eventType === "page_visit") summary.totalVisits += 1;
    if (eventType === "language_selected") {
      summary.languageClicks += 1;
      summary.languageSelections[language] = (summary.languageSelections[language] || 0) + 1;
    }
    if (eventType === "application_started") summary.applicationStarts += 1;
    if (eventType === "submit_attempt") summary.submitAttempts += 1;
    if (eventType === "submit_success") summary.submitSuccess += 1;
    if (eventType === "submit_error") summary.submitErrors += 1;
  }

  return summary;
};

const toPhotoUrl = (supabaseUrl, value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!String(value).includes("/")) return null;
  const encodedPath = String(value).split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${supabaseUrl}/storage/v1/object/public/applications/${encodedPath}`;
};

const extractLegacyField = (text, label) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(text || "").match(new RegExp(`${escaped}:\\s*([^\\n]+)`, "i"));
  return match ? match[1].trim() : "";
};

const withModelTrackFields = (row) => ({
  ...row,
  model_opportunity: row.model_opportunity || extractLegacyField(row.anything_else, "Model opportunity") || "Not specified",
  opportunity_interest: row.opportunity_interest || extractLegacyField(row.anything_else, "Opportunity interest") || "",
  portfolio_link: row.portfolio_link || extractLegacyField(row.anything_else, "Portfolio link") || "",
  regular_availability: row.regular_availability || extractLegacyField(row.anything_else, "Regular availability") || ""
});

const foldAnswer = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/\s+/g, " ")
  .trim();

const answerAliases = {
  hear_about: {
    Indeed: ["indeed", "en efecto"],
    Instagram: ["instagram"],
    Facebook: ["facebook"],
    Referral: ["referral", "referido", "recomendacion"],
    Friend: ["friend", "amigo"],
    Website: ["website", "sitio web"],
    Other: ["other", "otro"]
  },
  experience: {
    Never: ["never", "nunca"],
    Beginner: ["beginner", "principiante"],
    "Some Experience": ["some experience", "algo de experiencia"],
    Experienced: ["experienced", "experimentado", "con experiencia"]
  },
  comfort_level: {
    "Not Comfortable": ["not comfortable", "no comoda/o", "no comodo", "no comoda", "no me siento comodo", "no me resulta comodo"],
    Maybe: ["maybe", "tal vez"],
    Comfortable: ["comfortable", "comoda/o", "comodo", "comoda", "me siento comodo", "me resulta comodo"]
  },
  frequency: {
    Weekly: ["weekly", "semanal", "semanalmente"],
    "Bi-Weekly": ["bi-weekly", "biweekly", "quincenal"],
    Monthly: ["monthly", "mensual", "menstrual"],
    Occasionally: ["occasionally", "ocasionalmente", "de vez en cuando"]
  },
  comp_interest: {
    "Paid Shoots": ["paid shoots", "sesiones pagadas", "sesiones fotograficas remuneradas"],
    "Portfolio Building": ["portfolio building", "construir portafolio", "armar portafolio"],
    Both: ["both", "ambas", "ambos"]
  },
  expected_comp: {
    "Under $50": ["under $50", "menos de $50"],
    "$50-$100": ["$50-$100"],
    "$100-$200": ["$100-$200"],
    "$200+": ["$200+", "mas de $200"]
  },
  travel_distance: {
    "5 km": ["5 km"],
    "10 km": ["10 km"],
    "25 km": ["25 km"],
    "50 km": ["50 km"],
    "100 km+": ["100 km+", "mas de 100 km", "100+ km"]
  },
  regular_availability: {
    Occasionally: ["occasionally", "de vez en cuando", "ocasionalmente"],
    "1-2 days per week": ["1-2 days per week", "1 o 2 dias por semana", "1-2 dias por semana"],
    "3-4 days per week": ["3-4 days per week", "3 o 4 dias por semana", "3-4 dias por semana"],
    "5+ days per week": ["5+ days per week", "5 dias o mas por semana", "5+ dias por semana"],
    "Availability varies": ["availability varies", "mi disponibilidad varia", "la disponibilidad varia"]
  }
};

const aliasLookup = Object.fromEntries(Object.entries(answerAliases).map(([field, groups]) => {
  const lookup = {};
  for (const [canonical, aliases] of Object.entries(groups)) {
    for (const alias of aliases) {
      lookup[foldAnswer(alias)] = canonical;
    }
  }
  return [field, lookup];
}));

export const canonicalizeAnswer = (field, value) => {
  if (value === null || value === undefined || value === "") {
    return value;
  }
  const lookup = aliasLookup[field];
  if (!lookup) {
    return value;
  }
  return lookup[foldAnswer(value)] || value;
};

const canonicalizeApplicationRow = (row) => {
  const next = { ...row };
  for (const field of Object.keys(aliasLookup)) {
    if (Object.prototype.hasOwnProperty.call(next, field)) {
      next[field] = canonicalizeAnswer(field, next[field]);
    }
  }
  return next;
};

const emptyPerformerApplications = () => ({
  total: 0,
  byTier: {},
  byLang: { EN: 0, ES: 0 },
  applications: []
});

const performerLangLabel = (value) => {
  const lang = String(value || "").trim().toLowerCase();
  if (lang === "en") return "EN";
  if (lang === "es") return "ES";
  return lang ? lang.toUpperCase() : "";
};

const loadPerformerApplications = async (cfg) => {
  const response = await fetch(`${cfg.supabaseUrl}/rest/v1/performer_applications?select=id,created_at,name,whatsapp,tier,lang,payload&order=created_at.desc`, {
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Accept-Profile": "public",
      "Range-Unit": "items",
      Range: "0-999999"
    }
  });

  if (!response.ok) {
    await response.text();
    return emptyPerformerApplications();
  }

  const rows = await response.json();
  const applications = (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row.id || "",
    created_at: row.created_at || "",
    name: row.name || "",
    whatsapp: row.whatsapp || "",
    tier: row.tier || "",
    lang: performerLangLabel(row.lang),
    payload: row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload : {}
  }));
  const byTier = {};
  const byLang = { EN: 0, ES: 0 };
  applications.forEach((application) => {
    const tier = application.tier || "Not set";
    byTier[tier] = (byTier[tier] || 0) + 1;
    if (application.lang === "EN" || application.lang === "ES") {
      byLang[application.lang] += 1;
    }
  });
  return { total: applications.length, byTier, byLang, applications };
};

const PERFORMER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const performerIdFrom = (req) => {
  const fromBody = req.body && typeof req.body === "object" ? req.body.id : "";
  let fromQuery = "";
  if (req.query && req.query.id) fromQuery = req.query.id;
  if (!fromQuery && req.url) {
    try {
      fromQuery = new URL(req.url, "http://localhost").searchParams.get("id") || "";
    } catch {
      fromQuery = "";
    }
  }
  return String(fromBody || fromQuery || "").trim();
};

const deletePerformerApplication = async (req, res, cfg) => {
  const id = performerIdFrom(req);
  if (!PERFORMER_ID.test(id)) {
    return respond(res, 400, { error: "Invalid id." });
  }

  const response = await fetch(`${cfg.supabaseUrl}/rest/v1/performer_applications?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Content-Profile": "public",
      "Accept-Profile": "public",
      Prefer: "return=representation"
    }
  });
  const detail = await response.text();
  if (!response.ok) {
    return respond(res, 500, { error: "Could not delete the application." });
  }
  let deleted = [];
  try {
    deleted = JSON.parse(detail);
  } catch {
    deleted = [];
  }
  if (!Array.isArray(deleted) || !deleted.length) {
    return respond(res, 404, { error: "Application was not found." });
  }
  return respond(res, 200, { ok: true, id });
};

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", "GET, PATCH, DELETE, OPTIONS");
      return res.status(204).end();
    }

    if (req.method !== "GET" && req.method !== "PATCH" && req.method !== "DELETE") {
      res.setHeader("Allow", "GET, PATCH, DELETE, OPTIONS");
      return respond(res, 405, { error: "Method not allowed" });
    }

    const cfg = getSupabaseConfig();
    if (cfg.error) {
      return respond(res, 500, { error: cfg.error });
    }

    if (req.method === "DELETE") {
      return deletePerformerApplication(req, res, cfg);
    }

    if (req.method === "PATCH") {
      const body = req.body || {};
      const id = body.id;
      const status = body.status;
      const allowed = ["pending", "contacted", "scheduled", "approved", "archived", "denied"];

      if (!id || !allowed.includes(status)) {
        return respond(res, 400, { error: "Invalid id or status" });
      }

      const updateResponse = await fetch(`${cfg.supabaseUrl}/rest/v1/model_applications?id=eq.${encodeURIComponent(id)}`, {
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

    const response = await fetch(`${cfg.supabaseUrl}/rest/v1/model_applications?select=*&order=created_at.desc`, {
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
    const enrichedRows = rows.map(withModelTrackFields).map(canonicalizeApplicationRow);

    const eventsResponse = await fetch(`${cfg.supabaseUrl}/rest/v1/application_events?select=event_type,language&form_type=eq.main&order=created_at.desc`, {
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Accept-Profile": "public",
        "Range-Unit": "items",
        Range: "0-999999"
      }
    });

    const eventRows = eventsResponse.ok ? await eventsResponse.json() : [];
    const analyticsRows = enrichedRows.filter((row) => (row.review_status || "pending") !== "denied");
    const candidates = enrichedRows.map((row) => ({
      ...row,
      full_name: row.full_name || "Unnamed",
      review_status: row.review_status || "pending",
      admin_notes: row.admin_notes || "",
      headshot_url: toPhotoUrl(cfg.supabaseUrl, row.headshot_filename),
      full_body_url: toPhotoUrl(cfg.supabaseUrl, row.full_body_filename)
    }));

    const recentPhotos = enrichedRows
      .filter((row) => row.headshot_filename || row.full_body_filename)
      .slice(0, 20)
      .map((row) => ({
        created_at: row.created_at,
        full_name: row.full_name || "Unnamed",
        headshot_url: toPhotoUrl(cfg.supabaseUrl, row.headshot_filename),
        full_body_url: toPhotoUrl(cfg.supabaseUrl, row.full_body_filename)
      }));

    let performerApplications = emptyPerformerApplications();
    try {
      performerApplications = await loadPerformerApplications(cfg);
    } catch {
      performerApplications = emptyPerformerApplications();
    }

    return respond(res, 200, {
      totalApplications: analyticsRows.length,
      bySource: countBy(analyticsRows, "hear_about"),
      byExperience: countBy(analyticsRows, "experience"),
      byModelOpportunity: countBy(analyticsRows, "model_opportunity"),
      byFrequency: countBy(analyticsRows, "frequency"),
      byCompInterest: countBy(analyticsRows, "comp_interest"),
      byExpectedComp: countBy(analyticsRows, "expected_comp"),
      byTravelWilling: countBy(analyticsRows, "travel_willing"),
      byStatus: countBy(analyticsRows, "review_status"),
      byInterest: countArrayField(analyticsRows, "interests"),
      trendByMonth: monthlyTrend(analyticsRows),
      tracking: summarizeEvents(eventRows),
      candidates,
      recentPhotos,
      performerApplications
    });
  } catch (error) {
    return respond(res, 500, {
      error: "Unexpected server error",
      detail: String(error?.message || error)
    });
  }
}
