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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return respond(res, 405, { error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return respond(res, 500, {
      error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    });
  }

  const query = encodeURI(
    "created_at,hear_about,experience,frequency,travel_willing,comp_interest,expected_comp,interests"
  );

  const response = await fetch(`${supabaseUrl}/rest/v1/model_applications?select=${query}&order=created_at.asc`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    return respond(res, 500, { error: "Failed to load dashboard data", detail });
  }

  const rows = await response.json();

  return respond(res, 200, {
    totalApplications: rows.length,
    bySource: countBy(rows, "hear_about"),
    byExperience: countBy(rows, "experience"),
    byFrequency: countBy(rows, "frequency"),
    byCompInterest: countBy(rows, "comp_interest"),
    byExpectedComp: countBy(rows, "expected_comp"),
    byTravelWilling: countBy(rows, "travel_willing"),
    byInterest: countArrayField(rows, "interests"),
    trendByMonth: monthlyTrend(rows)
  });
}
