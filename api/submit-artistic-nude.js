import { getSupabaseConfig } from "./_supabase.js";

const requiredFields = [
  "full_name",
  "preferred_name",
  "age",
  "email",
  "city",
  "country",
  "hear_about",
  "nude_experience_level",
  "height",
  "clothing_size",
  "waist_measurement",
  "experience",
  "comfort_level",
  "avoid_concepts",
  "hard_limits",
  "special_conditions",
  "frequency",
  "travel_willing",
  "comp_interest",
  "expected_comp",
  "why_work",
  "release_understanding"
];

const respond = (res, status, payload) => {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const ensureArrayWithValues = (value) => Array.isArray(value) && value.length > 0;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hasRecentApplication = async (supabaseUrl, supabaseKey, email) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    select: "id",
    email: `eq.${email}`,
    created_at: `gte.${since}`,
    limit: "1"
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/artistic_nude_applications?${params.toString()}`, {
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

const getMissingRequiredField = (body) => {
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return field;
    }
  }
  return "";
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

    const supabaseConfig = getSupabaseConfig();
    if (supabaseConfig.error) {
      return respond(res, 500, { error: supabaseConfig.error });
    }
    const { supabaseUrl, supabaseKey } = supabaseConfig;

    const body = req.body || {};

    if (body.website) {
      return respond(res, 400, { error: "Invalid submission" });
    }

    const missingField = getMissingRequiredField(body);
    if (missingField) {
      return respond(res, 400, { error: `Missing required field: ${missingField}` });
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

    if (!ensureArrayWithValues(body.interests)) {
      return respond(res, 400, { error: "At least one interest is required" });
    }

    if (!ensureArrayWithValues(body.nudity_comfort_levels)) {
      return respond(res, 400, { error: "At least one nudity comfort level is required" });
    }

    if (!ensureArrayWithValues(body.availability)) {
      return respond(res, 400, { error: "At least one availability option is required" });
    }

    if (body.travel_willing !== "No" && !body.travel_distance) {
      return respond(res, 400, { error: "Travel distance is required" });
    }

    if (!ensureArrayWithValues(body.compensation_types)) {
      return respond(res, 400, { error: "At least one compensation type is required" });
    }

    if (!ensureArrayWithValues(body.intended_use)) {
      return respond(res, 400, { error: "At least one intended use is required" });
    }

    if (!Array.isArray(body.consents) || body.consents.length < 5) {
      return respond(res, 400, { error: "All consent items must be accepted" });
    }

    if (body.confirm_18_truth !== true) {
      return respond(res, 400, { error: "18+ accuracy confirmation is required" });
    }

    const row = {
      full_name: body.full_name,
      preferred_name: body.preferred_name,
      pronouns: body.pronouns || null,
      age,
      email,
      phone: body.phone || null,
      city: body.city,
      state_province: body.state_province || null,
      country: body.country,
      instagram: body.instagram || null,
      tiktok: body.tiktok || null,
      hear_about: body.hear_about,
      previous_modeling_experience: body.previous_modeling_experience || null,
      experience_types: Array.isArray(body.experience_types) ? body.experience_types : [],
      nude_experience_level: body.nude_experience_level,
      portfolio_link: body.portfolio_link || null,
      height: body.height,
      body_type: body.body_type || null,
      clothing_size: body.clothing_size,
      bra_size: body.bra_size || null,
      bust_measurement: body.bust_measurement || null,
      waist_measurement: body.waist_measurement,
      hip_measurement: body.hip_measurement || null,
      shoe_size: body.shoe_size || "",
      hair_color: body.hair_color || "",
      eye_color: body.eye_color || "",
      notable_features: body.notable_features || null,
      visible_marks: body.visible_marks || null,
      health_notes: body.health_notes || null,
      experience: body.experience,
      worked_with_photographers: body.worked_with_photographers || "",
      comfortable_snapshots: body.comfortable_snapshots || "",
      interests: body.interests,
      nudity_comfort_levels: body.nudity_comfort_levels,
      comfort_level: body.comfort_level,
      avoid_concepts: body.avoid_concepts,
      hard_limits: body.hard_limits,
      special_conditions: body.special_conditions,
      availability: body.availability,
      availability_notes: body.availability_notes || null,
      frequency: body.frequency,
      travel_willing: body.travel_willing,
      travel_distance: body.travel_willing === "No" ? "Not applicable" : body.travel_distance,
      travel_preference: body.travel_willing === "No" ? "Not applicable" : body.travel_preference || null,
      comp_interest: body.comp_interest,
      compensation_types: body.compensation_types,
      unpaid_tfp_willing: body.unpaid_tfp_willing === true,
      expected_comp: body.expected_comp,
      why_work: body.why_work,
      good_fit: body.good_fit || "",
      release_understanding: body.release_understanding,
      intended_use: body.intended_use,
      emergency_contact_name: body.emergency_contact_name || null,
      emergency_contact_phone: body.emergency_contact_phone || null,
      organizer_questions: body.organizer_questions || null,
      confirm_18_truth: body.confirm_18_truth === true,
      anything_else: body.anything_else || null,
      consents: body.consents,
      headshot_filename: body.headshot_filename || null,
      full_body_filename: body.full_body_filename || null,
      language: body.language || "en",
      review_status: "pending"
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/artistic_nude_applications`, {
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
