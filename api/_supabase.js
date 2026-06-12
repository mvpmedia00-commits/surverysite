const isUsableKey = (value) => {
  const key = String(value || "").trim();
  if (!key) {
    return false;
  }
  return !/PASTE|REPLACE|YOUR_|EXAMPLE/i.test(key) && !(key.startsWith("[") && key.endsWith("]"));
};

export const getSupabaseConfig = () => {
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
