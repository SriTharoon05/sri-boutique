import { createClient } from '@supabase/supabase-js';

let publicClient: any;

export function createPublicClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  publicClient ??= createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return publicClient;
}
