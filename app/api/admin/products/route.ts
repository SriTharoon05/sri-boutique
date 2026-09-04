import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  description: z.string().trim().max(5000).nullable().optional(),
  base_price: z.number().finite().nonnegative(),
  category_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
  variant: z.object({
    id: z.string().uuid().optional(),
    sku: z.string().trim().min(2).max(80),
    color: z.string().trim().max(80).nullable().optional(),
    size: z.string().trim().max(40).nullable().optional(),
    stock_quantity: z.number().int().nonnegative(),
    image_urls: z.array(z.string().url()).max(8),
    is_active: z.boolean().default(true),
  }),
});

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
  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid product or variant details' }, { status: 400 });
  const { variant, ...productInput } = parsed.data;

  const { data, error } = await supabase
    .from('products')
    .insert(productInput)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }


  const { id: _variantId, ...variantInsert } = variant;
  const { error: variantError } = await supabase.from('product_variants').insert({
    ...variantInsert,
    product_id: data.id,
  });
  if (variantError) {
    await supabase.from('products').delete().eq('id', data.id);
    return NextResponse.json({ error: variantError.message }, { status: 500 });
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
  const id = body.id;
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
  }
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid product or variant details' }, { status: 400 });
  const { variant, ...updates } = parsed.data;

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const variantPayload = { ...variant, product_id: id };
  const variantResult = variant.id
    ? await supabase.from('product_variants').update(variantPayload).eq('id', variant.id)
    : await supabase.from('product_variants').insert(variantPayload);
  if (variantResult.error) return NextResponse.json({ error: variantResult.error.message }, { status: 500 });

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
