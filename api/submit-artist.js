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

const asArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

const clean = (value) => String(value || "").trim();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const insertRow = (cfg, table, payload) => fetch(`${cfg.supabaseUrl}/rest/v1/${table}`, {
  method: "POST",
  headers: {
    apikey: cfg.supabaseKey,
    Authorization: `Bearer ${cfg.supabaseKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    "Content-Profile": "public"
  },
  body: JSON.stringify(payload)
});

const summarizeArtistApplication = (row) => [
  `ARTIST APPLICATION`,
  ``,
  `Artist disciplines: ${row.artist_disciplines.join(", ") || "Not specified"}`,
  `Experience level: ${row.experience_level || "Not specified"}`,
  `Portfolio: ${row.portfolio_link || "Not provided"}`,
  `Instagram: ${row.instagram || "Not provided"}`,
  `Website: ${row.website || "Not provided"}`,
  `Parent/guardian: ${row.guardian_name || "Not provided"}`,
  `Parent/guardian contact: ${row.guardian_contact || "Not provided"}`,
  `Body paint interest/experience: ${row.body_paint_experience || "Not specified"}`,
  `Painting/drawing strengths: ${row.artist_strengths || "Not specified"}`,
  `Preferred work: ${row.preferred_work.join(", ") || "Not specified"}`,
  `Tools/materials: ${row.tools_materials || "Not specified"}`,
  `Availability: ${row.availability.join(", ") || "Not specified"}`,
  `Availability notes: ${row.availability_notes || "Not specified"}`,
  `Travel: ${row.travel_willing || "Not specified"}`,
  `Expected rate: ${row.expected_rate || "Not specified"}`,
  `Why MVP: ${row.why_work || "Not specified"}`,
  `What makes them a fit: ${row.good_fit || "Not specified"}`,
  `Questions/notes: ${row.anything_else || "None"}`
].join("\n");

const toDashboardFallbackRow = (row) => ({
  full_name: row.full_name,
  preferred_name: row.preferred_name,
  age: row.age,
  email: row.email || `artist-no-email+${Date.now()}@placeholder.local`,
  city: row.city,
  country: row.country,
  instagram: row.instagram,
  tiktok: "",
  hear_about: row.hear_about,
  height: "Artist applicant - not applicable",
  clothing_size: "Artist applicant - not applicable",
  bra_size: "",
  bust_measurement: "",
  waist_measurement: "Artist applicant - not applicable",
  hip_measurement: "",
  shoe_size: "Artist applicant - not applicable",
  hair_color: "Artist applicant - not applicable",
  eye_color: "Artist applicant - not applicable",
  experience: row.experience_level || "Artist application",
  worked_with_photographers: row.body_paint_experience || row.guardian_contact || "",
  comfortable_snapshots: "Artist applicant",
  interests: row.artist_disciplines,
  model_opportunity: "Artist",
  opportunity_interest: row.preferred_work.join(", "),
  portfolio_link: row.portfolio_link || row.website || "",
  regular_availability: row.availability_notes || row.availability.join(", "),
  comfort_level: "Artist role - not a model application",
  avoid_concepts: "Artist applicant",
  availability: row.availability,
  frequency: row.availability_notes || "Not specified",
  travel_willing: row.travel_willing || "Not specified",
  travel_distance: row.travel_distance || "",
  comp_interest: "Paid artist work",
  expected_comp: row.expected_rate || "Not specified",
  unpaid_tfp_willing: false,
  why_work: row.why_work,
  good_fit: row.good_fit,
  anything_else: summarizeArtistApplication(row),
  consents: row.consents,
  headshot_filename: "",
  full_body_filename: "",
  language: "en",
  review_status: "pending"
});

const toLegacyDashboardFallbackRow = (row) => {
  const legacy = toDashboardFallbackRow(row);
  legacy.anything_else = [
    legacy.anything_else,
    legacy.model_opportunity ? `Artist role: ${legacy.model_opportunity}` : "",
    legacy.opportunity_interest ? `Artist work interest: ${legacy.opportunity_interest}` : "",
    legacy.portfolio_link ? `Portfolio link: ${legacy.portfolio_link}` : "",
    legacy.regular_availability ? `Artist availability: ${legacy.regular_availability}` : ""
  ].filter(Boolean).join("\n\n");
  delete legacy.model_opportunity;
  delete legacy.opportunity_interest;
  delete legacy.portfolio_link;
  delete legacy.regular_availability;
  return legacy;
};

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", "POST, OPTIONS, GET");
      return res.status(204).end();
    }

    if (req.method === "GET") {
      return respond(res, 200, { ok: true, endpoint: "submit-artist", method: "POST" });
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
    const age = Number(body.age);
    const email = clean(body.email).toLowerCase();
    const phone = clean(body.phone);
    const instagram = clean(body.instagram);
    const guardianName = clean(body.guardian_name);
    const guardianContact = clean(body.guardian_contact);

    const row = {
      full_name: clean(body.full_name),
      preferred_name: clean(body.preferred_name || body.full_name),
      age,
      email,
      phone,
      guardian_name: guardianName,
      guardian_contact: guardianContact,
      city: clean(body.city),
      state_province: clean(body.state_province),
      country: clean(body.country || "United States"),
      instagram,
      website: clean(body.website),
      portfolio_link: clean(body.portfolio_link),
      hear_about: clean(body.hear_about),
      artist_disciplines: asArray(body.artist_disciplines),
      preferred_work: asArray(body.preferred_work),
      experience_level: clean(body.experience_level),
      body_paint_experience: clean(body.body_paint_experience),
      artist_strengths: clean(body.artist_strengths),
      tools_materials: clean(body.tools_materials),
      availability: asArray(body.availability),
      availability_notes: clean(body.availability_notes),
      travel_willing: clean(body.travel_willing),
      travel_distance: clean(body.travel_distance),
      expected_rate: clean(body.expected_rate),
      why_work: clean(body.why_work),
      good_fit: clean(body.good_fit),
      anything_else: clean(body.anything_else),
      consents: asArray(body.consents),
      review_status: "pending"
    };

    const required = ["full_name", "preferred_name", "city", "country", "hear_about", "experience_level", "artist_strengths", "expected_rate", "why_work", "good_fit"];
    for (const field of required) {
      if (!row[field]) {
        return respond(res, 400, { error: `Missing required field: ${field}` });
      }
    }

    if (!Number.isFinite(age) || age < 1 || age > 120) {
      return respond(res, 400, { error: "Please provide a valid applicant age" });
    }

    if (!email && !phone && !instagram && !guardianContact) {
      return respond(res, 400, { error: "At least one contact method is required: email, phone, instagram, or guardian contact" });
    }

    if (email && !isValidEmail(email)) {
      return respond(res, 400, { error: "If provided, email must be valid" });
    }

    if (!row.artist_disciplines.length) {
      return respond(res, 400, { error: "Please select at least one art discipline" });
    }

    if (!row.preferred_work.length) {
      return respond(res, 400, { error: "Please select at least one preferred work type" });
    }

    if (age < 18 && (!guardianName || !guardianContact || !row.consents.includes("guardian_permission"))) {
      return respond(res, 400, { error: "Artists under 18 require parent/guardian name, contact, and guardian permission confirmation" });
    }

    if (!row.consents.includes("truthful") || !row.consents.includes("contact")) {
      return respond(res, 400, { error: "Please confirm the required consent items" });
    }

    let response = await insertRow(cfg, "artist_applications", row);
    let savedTable = "artist_applications";

    if (!response.ok) {
      const detail = await response.text();
      if (/artist_applications|schema cache|relation|does not exist|could not find the table/i.test(detail)) {
        if (age < 18) {
          return respond(res, 500, { error: "The artist_applications SQL table must be set up before accepting under-18 artist applications" });
        }
        response = await insertRow(cfg, "model_applications", toDashboardFallbackRow(row));
        if (!response.ok) {
          const fallbackDetail = await response.text();
          if (/model_opportunity|opportunity_interest|portfolio_link|regular_availability|schema cache|column/i.test(fallbackDetail)) {
            response = await insertRow(cfg, "model_applications", toLegacyDashboardFallbackRow(row));
          } else {
            return respond(res, 500, { error: "Failed to save artist application", detail: fallbackDetail });
          }
        }
        savedTable = "model_applications";
      } else {
        return respond(res, 500, { error: "Failed to save artist application", detail });
      }
    }

    if (!response.ok) {
      const detail = await response.text();
      return respond(res, 500, { error: "Failed to save artist application", detail });
    }

    const saved = await response.json();
    return respond(res, 200, { ok: true, id: saved?.[0]?.id || null, table: savedTable });
  } catch (error) {
    return respond(res, 500, {
      error: "Unexpected server error",
      detail: String(error && error.message ? error.message : error)
    });
  }
}
