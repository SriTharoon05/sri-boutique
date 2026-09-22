import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin-client';

export async function getVendorDailyQuota() {
  const db: any = createAdminClient();
  const { data, error } = await db.rpc('vendor_daily_quota');
  // Fail closed until the concurrency-safe DB trigger is installed.
  if (error || !data || !Number.isInteger(data.remaining)) {
    return { limit: 10, remaining: 0, ready: false, resetsAt: null, day: null };
  }
  return { ...data, ready: true } as { limit: number; remaining: number; ready: boolean; resetsAt: string | null; day: string | null };
}
