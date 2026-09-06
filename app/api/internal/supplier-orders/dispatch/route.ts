import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { dispatchDropshipOrder } from '@/lib/suppliers/orders';

function secretsMatch(received: string, expected: string) {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.DROPSHIP_DISPATCH_SECRET || '';
  const received = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!expected || !received || !secretsMatch(received, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { orderId } = await request.json();
  if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  try {
    return NextResponse.json({ results: await dispatchDropshipOrder(orderId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Dispatch failed' }, { status: 502 });
  }
}

