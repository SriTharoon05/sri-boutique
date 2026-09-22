import { NextResponse } from 'next/server';
import { getVendorDailyQuota } from '@/lib/suppliers/daily-quota';
export async function GET() {
  try {
    return NextResponse.json(await getVendorDailyQuota(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ready: false, remaining: 0 }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
