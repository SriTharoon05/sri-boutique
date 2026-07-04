import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return { error: 'Forbidden', status: 403 };
  }

  return { user, supabase };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const verify = await verifyAdmin();
  if ('error' in verify) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const { supabase } = verify;
  const { id } = await params;
  const body = await request.json();

  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: 'Status required' }, { status: 400 });
  }

  const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('orders')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send status update email if delivered
  if (status === 'delivered' && process.env.RESEND_API_KEY) {
    // TODO: Send delivery confirmation email via Resend
  }

  return NextResponse.json({ order: data });
}
