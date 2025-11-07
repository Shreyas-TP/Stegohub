import { createClient } from '@supabase/supabase-js';

// Support both Vite (VITE_*) and CRA (REACT_APP_*) env vars
const url = import.meta?.env?.VITE_SUPABASE_URL ?? process.env.REACT_APP_SUPABASE_URL!;
const key = import.meta?.env?.VITE_SUPABASE_ANON_KEY ?? process.env.REACT_APP_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);
