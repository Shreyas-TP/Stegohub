import { createClient } from "@supabase/supabase-js";

// ✅ Use Vite-style environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug log (optional): check if they're loaded
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase environment variables missing!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
