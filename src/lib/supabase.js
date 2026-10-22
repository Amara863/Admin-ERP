// Supabase connection (keys come from the .env file – never put them in code)
// If the .env file is missing, supabase = null and the app runs on demo data.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
