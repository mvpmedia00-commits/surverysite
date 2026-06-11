import { validateAdminRequest } from "./_admin-auth.js";

const respond = (res, status, payload) => {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
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
    if (!row.created_at) {
      continue;
    }
    const month = row.created_at.slice(0, 7);
    counts[month] = (counts[month] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
};

const toPhotoUrl = (supabaseUrl, value) => {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  // Legacy rows may contain only a filename (no object path), which 404s in storage.
  if (!String(value).includes("/")) {
    return null;
  }

  const encodedPath = String(value)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/applications/${encodedPath}`;
};


export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PATCH") {
    return respond(res, 405, { error: "Method not allowed" });
  }

  const auth = validateAdminRequest(req);
  if (!auth.ok) {
    return respond(res, auth.status, { error: auth.error });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return respond(res, 500, {
      error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    });
  }

  if (req.method === "PATCH") {
    const body = req.body || {};
    const id = body.id;
    const status = body.status;
    const allowed = ["pending", "contacted", "scheduled", "approved", "archived", "denied"];

    if (!id || !allowed.includes(status)) {
      return respond(res, 400, { error: "Invalid id or status" });
    }

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/artistic_nude_applications?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Content-Profile": "public",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          review_status: status,
          review_updated_at: new Date().toISOString()
        })
      }
    );

    if (!updateResponse.ok) {
      const detail = await updateResponse.text();
      return respond(res, 500, { error: "Failed to update candidate status", detail });
    }

    return respond(res, 200, { ok: true });
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/artistic_nude_applications?select=*&order=created_at.asc`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Accept-Profile": "public"
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    return respond(res, 500, { error: "Failed to load dashboard data", detail });
  }

  const rows = await response.json();
  const analyticsRows = rows.filter((row) => (row.review_status || "pending") !== "denied");
  const candidates = rows
    .slice()
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    .map((row) => ({
      id: row.id,
      created_at: row.created_at,
      full_name: row.full_name || "Unnamed",
      preferred_name: row.preferred_name || "",
      pronouns: row.pronouns || "",
      age: row.age || null,
      email: row.email || "",
      phone: row.phone || "",
      city: row.city || "",
      state_province: row.state_province || "",
      country: row.country || "",
      instagram: row.instagram || "",
      tiktok: row.tiktok || "",
      hear_about: row.hear_about || "Unknown",
      previous_modeling_experience: row.previous_modeling_experience || "",
      experience_types: Array.isArray(row.experience_types) ? row.experience_types : [],
      nude_experience_level: row.nude_experience_level || "",
      portfolio_link: row.portfolio_link || "",
      height: row.height || "",
      body_type: row.body_type || "",
      clothing_size: row.clothing_size || "",
      bra_size: row.bra_size || "",
      bust_measurement: row.bust_measurement || "",
      waist_measurement: row.waist_measurement || "",
      hip_measurement: row.hip_measurement || "",
      shoe_size: row.shoe_size || "",
      hair_color: row.hair_color || "",
      eye_color: row.eye_color || "",
      notable_features: row.notable_features || "",
      visible_marks: row.visible_marks || "",
      health_notes: row.health_notes || "",
      experience: row.experience || "Unknown",
      worked_with_photographers: row.worked_with_photographers || "",
      comfortable_snapshots: row.comfortable_snapshots || "",
      interests: Array.isArray(row.interests) ? row.interests : [],
      nudity_comfort_levels: Array.isArray(row.nudity_comfort_levels) ? row.nudity_comfort_levels : [],
      comfort_level: row.comfort_level || "",
      avoid_concepts: row.avoid_concepts || "",
      hard_limits: row.hard_limits || "",
      special_conditions: row.special_conditions || "",
      availability: Array.isArray(row.availability) ? row.availability : [],
      availability_notes: row.availability_notes || "",
      frequency: row.frequency || "",
      travel_willing: row.travel_willing || "",
      travel_distance: row.travel_distance || "",
      travel_preference: row.travel_preference || "",
      comp_interest: row.comp_interest || "",
      compensation_types: Array.isArray(row.compensation_types) ? row.compensation_types : [],
      unpaid_tfp_willing: row.unpaid_tfp_willing === true,
      expected_comp: row.expected_comp || "",
      why_work: row.why_work || "",
      good_fit: row.good_fit || "",
      release_understanding: row.release_understanding || "",
      intended_use: Array.isArray(row.intended_use) ? row.intended_use : [],
      emergency_contact_name: row.emergency_contact_name || "",
      emergency_contact_phone: row.emergency_contact_phone || "",
      organizer_questions: row.organizer_questions || "",
      confirm_18_truth: row.confirm_18_truth === true,
      anything_else: row.anything_else || "",
      consents: Array.isArray(row.consents) ? row.consents : [],
      language: row.language || "en",
      review_status: row.review_status || "pending",
      headshot_url: toPhotoUrl(supabaseUrl, row.headshot_filename),
      full_body_url: toPhotoUrl(supabaseUrl, row.full_body_filename)
    }));
  const recentPhotos = rows
    .filter((row) => row.headshot_filename || row.full_body_filename)
    .slice(-20)
    .map((row) => ({
      created_at: row.created_at,
      full_name: row.full_name || "Unnamed",
      headshot_url: toPhotoUrl(supabaseUrl, row.headshot_filename),
      full_body_url: toPhotoUrl(supabaseUrl, row.full_body_filename)
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
}
