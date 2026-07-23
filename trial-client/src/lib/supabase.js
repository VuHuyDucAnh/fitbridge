import { createClient } from "@supabase/supabase-js";

// These are PUBLIC, client-side keys. The publishable/anon key is designed to be
// shipped in the browser bundle; Row Level Security (see the SQL migrations) is
// what actually protects data. Real overrides can be supplied at build time via
// Vite env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) — e.g. on Vercel.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://wurkhgxhrqqhdzjzmawy.supabase.co";

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_gKWhHrAd4JSMNfSYNEevkA_Nh292CYJ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "fb-auth",
  },
});

/** True when the client is pointed at a real project (always true with the fallback). */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
