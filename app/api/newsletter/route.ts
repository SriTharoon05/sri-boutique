import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { SITE_URL } from '@/lib/site';

const subscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  website: z.string().max(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(SITE_URL).origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const parsed = subscriptionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('newsletter_subscribers').upsert(
      { email: parsed.data.email, is_active: true },
      { onConflict: 'email' },
    );

    if (error) {
      console.error('Newsletter subscription failed:', error);
      return NextResponse.json({ error: 'Could not subscribe right now' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Newsletter error:', error);
    return NextResponse.json({ error: 'Could not subscribe right now' }, { status: 500 });
  }
}
