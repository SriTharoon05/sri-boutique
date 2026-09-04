import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin-client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
  const body = await request.json();

  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: 'Status required' }, { status: 400 });
  }

  const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data: previousOrder } = await supabase
    .from('orders')
    .select('id, status, user_id, order_number')
    .eq('id', id)
    .maybeSingle();
  if (!previousOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (previousOrder.status === status) return NextResponse.json({ order: previousOrder });

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

  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey && previousOrder.user_id && ['shipped', 'delivered', 'cancelled', 'refunded'].includes(status)) {
    try {
      const adminSupabase = createAdminClient();
      const { data: userData } = await adminSupabase.auth.admin.getUserById(previousOrder.user_id);
      const email = userData.user?.email;
      if (email) {
        const labels: Record<string, string> = {
          shipped: 'has been shipped',
          delivered: 'has been delivered',
          cancelled: 'has been cancelled',
          refunded: 'has been refunded',
        };
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'api-key': brevoApiKey },
          body: JSON.stringify({
            sender: { name: 'Sri Boutique', email: 'orders@sriboutique.com' },
            to: [{ email }],
            subject: `Order ${previousOrder.order_number} ${labels[status]}`,
            htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h1>Sri Boutique</h1><p>Your order <strong>${previousOrder.order_number}</strong> ${labels[status]}.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://sriboutique.com'}/account/orders/${id}">View order details</a></p></div>`,
          }),
        });
      }
    } catch (emailError) {
      console.error('Order status email failed:', emailError);
    }
  }

  return NextResponse.json({ order: data });
}
