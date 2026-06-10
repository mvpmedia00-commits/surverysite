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
  "shoe_size",
  "hair_color",
  "eye_color",
  "experience",
  "worked_with_photographers",
  "comfortable_snapshots",
  "comfort_level",
  "avoid_concepts",
  "frequency",
  "travel_willing",
  "travel_distance",
  "comp_interest",
  "expected_comp",
  "why_work",
  "good_fit"
];

const respond = (res, status, payload) => {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return respond(res, 405, { error: "Method not allowed" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return respond(res, 500, {
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      });
    }

    const body = req.body || {};

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return respond(res, 400, { error: `Missing required field: ${field}` });
      }
    }

    const age = Number(body.age);
    if (!Number.isFinite(age) || age < 18) {
      return respond(res, 400, { error: "Applicant must be at least 18 years old" });
    }

    if (!Array.isArray(body.interests) || body.interests.length === 0) {
      return respond(res, 400, { error: "At least one interest is required" });
    }

    if (!Array.isArray(body.availability) || body.availability.length === 0) {
      return respond(res, 400, { error: "At least one availability option is required" });
    }

    if (!Array.isArray(body.consents) || body.consents.length < 5) {
      return respond(res, 400, { error: "All consent items must be accepted" });
    }

    if (typeof body.unpaid_tfp_willing !== "boolean") {
      return respond(res, 400, {
        error: "Unpaid shoots in exchange for edited pictures must be Yes or No"
      });
    }

    const hasInstagram = typeof body.instagram === "string" && body.instagram.trim() !== "";
    const hasHeadshot = typeof body.headshot_filename === "string" && body.headshot_filename.trim() !== "";
    const hasFullBody = typeof body.full_body_filename === "string" && body.full_body_filename.trim() !== "";
    if (!hasInstagram && !hasHeadshot && !hasFullBody) {
      return respond(res, 400, {
        error: "Upload at least one photo or provide an Instagram profile"
      });
    }

    const row = {
      full_name: body.full_name,
      preferred_name: body.preferred_name,
      age,
      email: body.email,
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
      shoe_size: body.shoe_size,
      hair_color: body.hair_color,
      eye_color: body.eye_color,
      experience: body.experience,
      worked_with_photographers: body.worked_with_photographers,
      comfortable_snapshots: body.comfortable_snapshots,
      interests: body.interests,
      comfort_level: body.comfort_level,
      avoid_concepts: body.avoid_concepts,
      availability: body.availability,
      frequency: body.frequency,
      travel_willing: body.travel_willing,
      travel_distance: body.travel_distance,
      comp_interest: body.comp_interest,
      expected_comp: body.expected_comp,
      unpaid_tfp_willing: body.unpaid_tfp_willing === true,
      why_work: body.why_work,
      good_fit: body.good_fit,
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
