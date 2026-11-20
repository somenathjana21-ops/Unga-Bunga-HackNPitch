import { createClient } from '@supabase/supabase-js';

// Optional integration seam. Import this only when the player opts into cloud saves.
// No requests or anonymous accounts are created by the foundation preview.
export function createOptionalSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  if (!key.startsWith('sb_publishable_')) {
    throw new Error('Use a Supabase publishable key, never a secret or service-role key.');
  }
  return createClient(url, key);
}
