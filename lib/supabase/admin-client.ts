import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// SERVICE ROLE CLIENT — bypasses RLS entirely.
// Only import/use this inside server-only files (API routes, Edge Functions)
// that perform their own independent security check (like signature verification)
// before touching the database. NEVER import this in any client component.
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase URL or service role key in environment variables');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}