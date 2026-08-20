import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail loudly and actionably. Without this, createClient throws a bare
// "supabaseUrl is required" at module load and the whole app renders a blank page.
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
  ]
    .filter(Boolean)
    .join(' and ');

  throw new Error(
    `Missing ${missing}. Copy .env.example to .env and fill in the values from ` +
      'your Supabase project (Settings → API Keys), then restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
