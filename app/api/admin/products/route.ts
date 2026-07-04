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

export async function POST(request: NextRequest) {
  const verify = await verifyAdmin();
  if ('error' in verify) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const { supabase } = verify;
  const body = await request.json();

  const { name, slug, description, base_price, category_id, is_active } = body;

  if (!name || !slug || base_price === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      name,
      slug,
      description,
      base_price,
      category_id: category_id || null,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

export async function PATCH(request: NextRequest) {
  const verify = await verifyAdmin();
  if ('error' in verify) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const { supabase } = verify;
  const body = await request.json();

  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

export async function DELETE(request: NextRequest) {
  const verify = await verifyAdmin();
  if ('error' in verify) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const { supabase } = verify;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
