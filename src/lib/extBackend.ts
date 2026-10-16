import { createClient } from "@supabase/supabase-js";

// Free external project that hosts tasks, Telegram bot and shared notes.
// URL and anon key are public by design (data is protected server-side).
const EXT_URL = "https://ivrrkjatjnljqhzwajan.supabase.co";
const EXT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cnJramF0am5sanFoendhamFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTE0MjcsImV4cCI6MjEwNzcyNzQyN30.5y9ASNO7SQzA_LM7KJXBIwMFFs8aMkcj7VeqG8l7gTA";

export const extBackend = createClient(EXT_URL, EXT_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
