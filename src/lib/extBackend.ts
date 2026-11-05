import { createClient } from "@supabase/supabase-js";

// Free external project that hosts tasks, Telegram bot and shared notes.
// URL and anon key are public by design (data is protected server-side).
const EXT_URL = "https://ivrrkjatjnljqhzwajan.supabase.co";
const EXT_ANON_KEY = "sb_publishable_rxrCgVmGjID9_AXfq_ToSg_m6MM_41O";

export const extBackend = createClient(EXT_URL, EXT_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
