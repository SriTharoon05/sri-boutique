import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This MUST be a Route Handler (route.ts), not a page component.
// The PKCE code verifier is stored in a cookie during login initiation,
// and only a server-side handler using the SSR server client can read
// that cookie and complete the exchange correctly.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirectTo') || '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }

    console.error('Auth callback error:', error.message);
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // No code present — nothing to exchange, send home
  return NextResponse.redirect(`${origin}/`);
}