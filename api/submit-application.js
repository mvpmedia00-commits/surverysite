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
      return respond(res, 200, { ok: true, endpoint: "submit-application", method: "POST" });
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
    const required = ["full_name", "preferred_name", "age", "email", "city", "country", "hear_about", "height", "clothing_size", "waist_measurement", "experience", "comfort_level", "avoid_concepts", "frequency", "travel_willing", "comp_interest", "expected_comp", "why_work", "good_fit"];

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
      full_name: body.full_name,
      preferred_name: body.preferred_name,
      age,
      email,
      city: body.city,
      country: body.country,
      instagram: body.instagram || "",
      tiktok: body.tiktok || "",
      hear_about: body.hear_about,
      height: body.height,
      clothing_size: body.clothing_size,
      bra_size: body.bra_size || "",
      bust_measurement: body.bust_measurement || "",
      waist_measurement: body.waist_measurement,
      hip_measurement: body.hip_measurement || "",
      shoe_size: body.shoe_size || "",
      hair_color: body.hair_color || "",
      eye_color: body.eye_color || "",
      experience: body.experience,
      worked_with_photographers: body.worked_with_photographers || "",
      comfortable_snapshots: body.comfortable_snapshots || "",
      interests: Array.isArray(body.interests) ? body.interests : [],
      comfort_level: body.comfort_level,
      avoid_concepts: body.avoid_concepts,
      availability: Array.isArray(body.availability) ? body.availability : [],
      frequency: body.frequency,
      travel_willing: body.travel_willing,
      travel_distance: body.travel_distance || "",
      comp_interest: body.comp_interest,
      expected_comp: body.expected_comp,
      unpaid_tfp_willing: body.unpaid_tfp_willing === true,
      why_work: body.why_work,
      good_fit: body.good_fit,
      anything_else: body.anything_else || "",
      consents: Array.isArray(body.consents) ? body.consents : [],
      headshot_filename: body.headshot_filename || "",
      full_body_filename: body.full_body_filename || "",
      language: body.language || "en",
      review_status: "pending"
    };

    const response = await fetch(`${cfg.supabaseUrl}/rest/v1/model_applications`, {
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
