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

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", "POST, OPTIONS, GET");
      return res.status(204).end();
    }

    if (req.method === "GET") {
      return respond(res, 200, { ok: true, endpoint: "submit-artistic-nude", method: "POST" });
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
    const required = ["preferred_name", "age", "email", "city", "country", "hear_about", "expected_comp", "why_work"];

    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return respond(res, 400, { error: `Missing required field: ${field}` });
      }
    }

    const age = Number(body.age);
    if (!Number.isFinite(age) || age < 18) {
      return respond(res, 400, { error: "Applicant must be at least 18 years old" });
    }

    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return respond(res, 400, { error: "A valid email address is required" });
    }

    const row = {
      full_name: body.full_name || body.preferred_name,
      preferred_name: body.preferred_name,
      pronouns: body.pronouns || "",
      age,
      email,
      phone: body.phone || "",
      city: body.city,
      state_province: body.state_province || "",
      country: body.country,
      instagram: body.instagram || "",
      tiktok: body.tiktok || "",
      hear_about: body.hear_about,
      previous_modeling_experience: body.previous_modeling_experience || "",
      experience_types: Array.isArray(body.experience_types) ? body.experience_types : [],
      nude_experience_level: body.nude_experience_level || "Not specified",
      portfolio_link: body.portfolio_link || "",
      height: body.height || "",
      body_type: body.body_type || "",
      clothing_size: body.clothing_size || "",
      bra_size: body.bra_size || "",
      bust_measurement: body.bust_measurement || "",
      waist_measurement: body.waist_measurement || "",
      hip_measurement: body.hip_measurement || "",
      shoe_size: body.shoe_size || "",
      hair_color: body.hair_color || "",
      eye_color: body.eye_color || "",
      notable_features: body.notable_features || "",
      visible_marks: body.visible_marks || "",
      health_notes: body.health_notes || "",
      experience: body.experience || "Not specified",
      worked_with_photographers: body.worked_with_photographers || "",
      comfortable_snapshots: body.comfortable_snapshots || "Yes",
      interests: Array.isArray(body.interests) ? body.interests : [],
      nudity_comfort_levels: Array.isArray(body.nudity_comfort_levels) ? body.nudity_comfort_levels : [],
      comfort_level: body.comfort_level || "Not specified",
      avoid_concepts: body.avoid_concepts || "",
      hard_limits: body.hard_limits || body.avoid_concepts || "",
      special_conditions: body.special_conditions || "",
      availability: Array.isArray(body.availability) ? body.availability : [],
      availability_notes: body.availability_notes || "",
      frequency: body.frequency || "Not specified",
      travel_willing: body.travel_willing || "Not specified",
      travel_distance: body.travel_distance || "Not specified",
      travel_preference: body.travel_preference || "",
      comp_interest: body.comp_interest || "Not specified",
      compensation_types: Array.isArray(body.compensation_types) ? body.compensation_types : [],
      unpaid_tfp_willing: body.unpaid_tfp_willing === true,
      expected_comp: body.expected_comp,
      why_work: body.why_work,
      good_fit: body.good_fit || "",
      release_understanding: body.release_understanding || "Discussed before shooting",
      intended_use: Array.isArray(body.intended_use) ? body.intended_use : [],
      emergency_contact_name: body.emergency_contact_name || "",
      emergency_contact_phone: body.emergency_contact_phone || "",
      organizer_questions: body.organizer_questions || "",
      confirm_18_truth: body.confirm_18_truth === true,
      anything_else: body.anything_else || "",
      consents: Array.isArray(body.consents) ? body.consents : [],
      headshot_filename: body.headshot_filename || "",
      full_body_filename: body.full_body_filename || "",
      language: body.language || "en",
      review_status: "pending"
    };

    const response = await fetch(`${cfg.supabaseUrl}/rest/v1/artistic_nude_applications`, {
      method: "POST",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        "Content-Profile": "public"
      },
      body: JSON.stringify(row)
    });

    if (!response.ok) {
      const detail = await response.text();
      return respond(res, 500, { error: "Failed to save application", detail });
    }

    const saved = await response.json();
    return respond(res, 200, { ok: true, id: saved?.[0]?.id || null });
  } catch (error) {
    return respond(res, 500, {
      error: "Unexpected server error",
      detail: String(error && error.message ? error.message : error)
    });
  }
}
