import { getSupabaseConfig } from "./_supabase.js";
import { getBunnyConfig, isSafeStoragePath, newStoragePath, putStorageObject, sniffImage } from "../lib/bunny-storage.js";

const MAX_BODY_BYTES = 64 * 1024;
const SETUP_MESSAGE = "Performer application table is not set up yet. Run supabase/migrations/20261120_performer_applications.sql in the Supabase SQL editor, then reload the API schema.";
const SERVICE_ROLE_MESSAGE = "Performer applications need the Supabase service role key. Row level security blocks the public key.";

const EXPERIENCE_LEVELS = ["None", "A few shoots", "Experienced", "Agency-represented"];
const TIER_CHOICES = ["Tier 1", "Tier 2", "Both", "Open to discussion"];
const PAID_TIERS = ["Tier 1", "Tier 2", "Both"];
const AVAILABILITY = ["Overnight", "All day", "After work"];
const ACTS = ["Solo", "Toy", "Girl on Girl", "Boy on Girl", "Anal", "2 girls one guy", "Fetish/BDSM", "Other"];
const YES_NO = ["", "Yes", "No"];
const PLATFORM = ["", "Yes", "No", "Audition first"];
const BASE_CONSENTS = ["18-plus", "adult-explicit-content", "voluntary", "can-decline", "comp-usage-release", "sti-disclosure", "contact"];
const TIER2_CONSENT = "tier2-unprotected-sti";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

const respond = (res, status, payload) => {
  res.status(status).setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.end(JSON.stringify(payload));
};

const text = (value) => String(value == null ? "" : value).trim();

const limited = (value, max) => {
  const cleaned = text(value);
  return cleaned.length <= max ? cleaned : null;
};

const oneOf = (value, allowed) => allowed.includes(value);

const storedPhoto = (value, max) => {
  const cleaned = text(value);
  if (!cleaned) return "";
  if (cleaned.length > max) return null;
  if (/^https:\/\/\S+$/i.test(cleaned)) return cleaned;
  if (cleaned.startsWith("bunny:")) {
    const path = isSafeStoragePath(cleaned.slice("bunny:".length));
    return path ? `bunny:${path}` : null;
  }
  return null;
};

const tablesMissing = (status, detail) => {
  const message = String(detail || "");
  return status === 404 || /PGRST205|42P01|does not exist|schema cache/i.test(message);
};

const permissionDenied = (status, detail) => {
  const message = String(detail || "");
  return status === 401 || status === 403 || /row-level security|permission denied|JWT/i.test(message);
};

const bodyTooLarge = (req) => {
  const declared = Number(req.headers["content-length"] || 0);
  if (declared > MAX_BODY_BYTES) return true;
  if (typeof req.body === "string") return Buffer.byteLength(req.body) > MAX_BODY_BYTES;
  if (req.body && typeof req.body === "object") {
    return Buffer.byteLength(JSON.stringify(req.body)) > MAX_BODY_BYTES;
  }
  return false;
};

const validate = (body) => {
  const name = limited(body.name, 200);
  const city = limited(body.city, 160);
  const whatsapp = limited(body.whatsapp, 80);
  const email = limited(body.email, 200);
  const instagram = limited(body.instagram, 120);
  const notes = limited(body.notes, 8000);
  const sceneVideo = limited(body.scene_video_link, 2000);
  const experience = text(body.experience_level);
  const tierChoice = text(body.tier_choice);
  const age = Number(body.age);

  if (name == null || !name) return "Name is required.";
  if (!Number.isInteger(age) || age < 18 || age > 120) return "Age must be a whole number from 18 to 120.";
  if (city == null || !city) return "City is required.";
  if (whatsapp == null || !whatsapp) return "WhatsApp is required.";
  if (email == null) return "Email is too long.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email must be empty or valid.";
  if (instagram == null) return "Instagram or TikTok is too long.";
  if (!oneOf(experience, EXPERIENCE_LEVELS)) return "Experience level is required.";
  if (!oneOf(tierChoice, TIER_CHOICES)) return "Tier choice is required.";
  if (typeof body.audition_ack !== "boolean") return "Audition acknowledgement is required.";
  if (PAID_TIERS.includes(tierChoice) && tierChoice !== "Tier 1" && body.audition_ack !== true) {
    return "The paid audition acknowledgement is required for Tier 2 or Both.";
  }

  const availability = Array.isArray(body.availability_types) ? body.availability_types.map(text) : null;
  if (!availability || !availability.length || availability.some((value) => !AVAILABILITY.includes(value))) {
    return "At least one availability type is required.";
  }
  if (new Set(availability).size !== availability.length) return "Availability types must be unique.";

  const acts = Array.isArray(body.acts_performed) ? body.acts_performed.map(text) : [];
  if (acts.some((value) => !ACTS.includes(value)) || new Set(acts).size !== acts.length) {
    return "Acts performed contains an unknown value.";
  }

  const consents = Array.isArray(body.consents) ? body.consents.map(text) : [];
  const allowedConsents = new Set([...BASE_CONSENTS, TIER2_CONSENT]);
  if (consents.some((value) => !allowedConsents.has(value)) || new Set(consents).size !== consents.length) {
    return "Consent list is invalid.";
  }
  const requiredConsents = tierChoice === "Tier 2" || tierChoice === "Both"
    ? [...BASE_CONSENTS, TIER2_CONSENT]
    : BASE_CONSENTS;
  if (requiredConsents.some((value) => !consents.includes(value))) return "Every required consent must be ticked.";

  const payTier = text(body.pay_tier);
  const expectedPay = PAID_TIERS.includes(tierChoice) ? tierChoice : "";
  if (payTier !== expectedPay) return "Pay tier does not match the tier choice.";

  if (!oneOf(text(body.sti_tested_last_6_months), YES_NO)) return "STI testing answer is invalid.";
  if (!oneOf(text(body.willing_to_test_before_booking), YES_NO)) return "Testing-before-booking answer is invalid.";
  if (!oneOf(text(body.explicit_paid_platform), PLATFORM)) return "Work-understanding answer is invalid.";
  if (!oneOf(text(body.willing_travel_resort), YES_NO)) return "Resort travel answer is invalid.";
  if (!oneOf(text(body.own_wardrobe_toys_props), YES_NO)) return "Wardrobe answer is invalid.";
  if (notes == null) return "Questions are too long.";
  if (sceneVideo == null) return "Shared content links are too long.";

  const headshot = storedPhoto(body.headshot_url, 2000);
  const fullBody = storedPhoto(body.full_body_front_url, 2000);
  if (headshot == null || fullBody == null) return "Photos must be empty, an https link, or a stored photo.";

  const samples = Array.isArray(body.explicit_sample_urls) ? body.explicit_sample_urls : null;
  if (!samples || samples.length > 8) return "Sample images must be a list of at most 8 photos.";
  const sampleUrls = [];
  for (const sample of samples) {
    const url = storedPhoto(sample, 2000);
    if (url == null || !url) return "Each sample image must be an https link or a stored photo.";
    sampleUrls.push(url);
  }

  const lang = text(body.lang) || "en";
  if (lang !== "en" && lang !== "es") return "Language must be en or es.";
  const invite = text(body.invite_token);
  if (invite && !TOKEN_PATTERN.test(invite)) return "Invite token is invalid.";

  return {
    lang,
    invite_token: invite,
    name,
    whatsapp,
    tier: tierChoice,
    payload: {
      name,
      age,
      city,
      instagram: instagram || "",
      email,
      whatsapp,
      experience_level: experience,
      acts_performed: acts,
      sti_tested_last_6_months: text(body.sti_tested_last_6_months),
      willing_to_test_before_booking: text(body.willing_to_test_before_booking),
      explicit_paid_platform: text(body.explicit_paid_platform),
      availability_types: availability,
      pay_tier: payTier,
      tier_choice: tierChoice,
      audition_ack: body.audition_ack,
      willing_travel_resort: text(body.willing_travel_resort),
      own_wardrobe_toys_props: text(body.own_wardrobe_toys_props),
      notes: notes || "",
      headshot_url: headshot,
      full_body_front_url: fullBody,
      explicit_sample_urls: sampleUrls,
      scene_video_link: sceneVideo || "",
      consents,
      lang,
      invite_token: invite
    }
  };
};

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const isPhotoUpload = (req) => {
  const type = String(req.headers["content-type"] || "").toLowerCase();
  return type.startsWith("image/") || String(req.url || "").includes("upload=1");
};

const readUpload = async (req) => {
  const declared = Number(req.headers["content-length"] || 0);
  if (declared > MAX_UPLOAD_BYTES) return { error: "too-large" };
  if (Buffer.isBuffer(req.body)) return req.body.length > MAX_UPLOAD_BYTES ? { error: "too-large" } : { bytes: req.body };
  if (req.body instanceof Uint8Array) {
    const bytes = Buffer.from(req.body);
    return bytes.length > MAX_UPLOAD_BYTES ? { error: "too-large" } : { bytes };
  }
  if (typeof req.body === "string") {
    const bytes = Buffer.from(req.body, "latin1");
    return bytes.length > MAX_UPLOAD_BYTES ? { error: "too-large" } : { bytes };
  }
  if (req.body && typeof req.body === "object") return { error: "not-image" };
  const chunks = [];
  let size = 0;
  if (req[Symbol.asyncIterator]) {
    for await (const chunk of req) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > MAX_UPLOAD_BYTES) return { error: "too-large" };
      chunks.push(bytes);
    }
  }
  return { bytes: Buffer.concat(chunks) };
};

const handlePhotoUpload = async (req, res) => {
  const upload = await readUpload(req);
  if (upload.error === "too-large") return respond(res, 413, { error: "Photo is too large." });
  const bytes = upload.bytes || Buffer.alloc(0);
  const sniffed = sniffImage(bytes);
  if (!sniffed) return respond(res, 400, { error: "Photo must be a JPG, PNG, WEBP, or HEIC." });
  const storage = getBunnyConfig();
  if (storage.error) return respond(res, 503, { error: storage.error });
  const path = newStoragePath(sniffed.ext);
  const saved = await putStorageObject(storage, path, bytes, sniffed.type);
  if (!saved) return respond(res, 500, { error: "Photo could not be stored." });
  return respond(res, 200, { ok: true, ref: `bunny:${path}` });
};

const insertApplication = async (cfg, row) => {
  const response = await fetch(`${cfg.supabaseUrl}/rest/v1/performer_applications`, {
    method: "POST",
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: "return=representation",
      "Content-Profile": "public"
    },
    body: JSON.stringify(row)
  });
  const detail = await response.text();
  return { ok: response.ok, status: response.status, detail };
};

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", "POST, OPTIONS, GET");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return res.status(204).end();
    }

    if (req.method === "GET") {
      return respond(res, 200, { ok: true, endpoint: "submit-performer", method: "POST" });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST, OPTIONS, GET");
      return respond(res, 405, { error: "Method not allowed" });
    }

    if (isPhotoUpload(req)) return handlePhotoUpload(req, res);

    if (bodyTooLarge(req)) {
      return respond(res, 413, { error: "Application is too large." });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return respond(res, 400, { error: "Application body must be a JSON object." });
    }

    const record = validate(body);
    if (typeof record === "string") return respond(res, 400, { error: record });

    const cfg = getSupabaseConfig();
    if (cfg.error) return respond(res, 503, { error: cfg.error });

    const saved = await insertApplication(cfg, record);
    if (!saved.ok) {
      if (tablesMissing(saved.status, saved.detail)) return respond(res, 503, { error: SETUP_MESSAGE });
      if (permissionDenied(saved.status, saved.detail)) return respond(res, 503, { error: SERVICE_ROLE_MESSAGE });
      return respond(res, 500, { error: "Could not save the application." });
    }

    let id = null;
    try {
      const parsed = JSON.parse(saved.detail);
      id = Array.isArray(parsed) ? parsed[0]?.id || null : null;
    } catch {
      id = null;
    }
    return respond(res, 200, { ok: true, id });
  } catch {
    return respond(res, 500, { error: "Unexpected server error" });
  }
};
