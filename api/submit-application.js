const isUsableKey = (value) => {
  const key = String(value || "").trim();
  if (!key) {
    return false;
  }
  return !/PASTE|REPLACE|YOUR_|EXAMPLE/i.test(key) && !(key.startsWith("[") && key.endsWith("]"));
};

const getSupabaseConfig = () => {
  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const keyCandidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ];
  const supabaseKey = keyCandidates.find(isUsableKey);

  if (!supabaseUrl || !supabaseKey) {
    return {
      error: "Missing SUPABASE_URL and a valid Supabase API key"
    };
  }

  return {
    supabaseUrl,
    supabaseKey: supabaseKey.trim()
  };
};

const requiredFields = [
  "full_name",
  "preferred_name",
  "age",
  "email",
  "city",
  "country",
  "hear_about",
  "height",
  "clothing_size",
  "waist_measurement",
  "experience",
  "comfort_level",
  "avoid_concepts",
  "frequency",
  "travel_willing",
  "comp_interest",
  "expected_comp",
  "why_work",
  "why_work"
];

const respond = (res, status, payload) => {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hasRecentApplication = async (supabaseUrl, supabaseKey, email) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    select: "id",
    email: `eq.${email}`,
    created_at: `gte.${since}`,
    limit: "1"
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/model_applications?${params.toString()}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Accept-Profile": "public"
    }
  });

  if (!response.ok) {
    return false;
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
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

    const supabaseConfig = getSupabaseConfig();
    if (supabaseConfig.error) {
      return respond(res, 500, { error: supabaseConfig.error });
    }
    const { supabaseUrl, supabaseKey } = supabaseConfig;

    const body = req.body || {};

    if (body.website) {
      return respond(res, 400, { error: "Invalid submission" });
    }

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return respond(res, 400, { error: `Missing required field: ${field}` });
      }
    }

    const age = Number(body.age);
    if (!Number.isFinite(age) || age < 18) {
      return respond(res, 400, { error: "Applicant must be at least 18 years old" });
    }

    const email = String(body.email || "").trim().toLowerCase();
    if (!emailPattern.test(email)) {
      return respond(res, 400, { error: "A valid email address is required" });
    }

    const hasInstagram = String(body.instagram || "").trim() !== "";
    const hasRequiredPhotos = String(body.headshot_filename || "").trim() !== "" && String(body.full_body_filename || "").trim() !== "";
    if (!hasInstagram && !hasRequiredPhotos) {
      return respond(res, 400, { error: "Headshot and full body photo are required when Instagram is not provided" });
    }

    if (await hasRecentApplication(supabaseUrl, supabaseKey, email)) {
      return respond(res, 409, { error: "An application from this email was already received recently" });
    }

    if (!Array.isArray(body.interests) || body.interests.length === 0) {
      return respond(res, 400, { error: "At least one interest is required" });
    }

    if (!Array.isArray(body.availability) || body.availability.length === 0) {
      return respond(res, 400, { error: "At least one availability option is required" });
    }

    if (body.travel_willing !== "No" && !body.travel_distance) {
      return respond(res, 400, { error: "Maximum travel distance is required" });
    }

    if (!Array.isArray(body.consents) || body.consents.length < 5) {
      return respond(res, 400, { error: "All consent items must be accepted" });
    }

    const row = {
      full_name: body.full_name,
      preferred_name: body.preferred_name,
      age,
      email,
      city: body.city,
      country: body.country,
      instagram: body.instagram || null,
      tiktok: body.tiktok || null,
      hear_about: body.hear_about,
      height: body.height,
      clothing_size: body.clothing_size,
      bra_size: body.bra_size || null,
      bust_measurement: body.bust_measurement || null,
      waist_measurement: body.waist_measurement,
      hip_measurement: body.hip_measurement || null,
      shoe_size: body.shoe_size || "",
      hair_color: body.hair_color || "",
      eye_color: body.eye_color || "",
      experience: body.experience,
      worked_with_photographers: body.worked_with_photographers || "",
      comfortable_snapshots: body.comfortable_snapshots || "",
      interests: body.interests,
      comfort_level: body.comfort_level,
      avoid_concepts: body.avoid_concepts,
      availability: body.availability,
      frequency: body.frequency,
      travel_willing: body.travel_willing,
      travel_distance: body.travel_willing === "No" ? "Not applicable" : body.travel_distance,
      comp_interest: body.comp_interest,
      expected_comp: body.expected_comp,
      unpaid_tfp_willing: body.unpaid_tfp_willing === true,
      why_work: body.why_work,
      good_fit: body.good_fit || "",
      anything_else: body.anything_else || null,
      consents: body.consents,
      headshot_filename: body.headshot_filename || null,
      full_body_filename: body.full_body_filename || null,
      language: body.language || "en"
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/model_applications`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Content-Profile": "public",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(row)
    });

    if (!response.ok) {
      const detail = await response.text();
      return respond(res, 500, { error: "Database insert failed", detail });
    }

    return respond(res, 201, { ok: true });
  } catch (error) {
    return respond(res, 500, {
      error: "Unhandled submit error",
      detail: error?.message || "Unknown server error"
    });
  }
}
