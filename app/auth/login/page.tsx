// app/auth/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  async function handleGoogleSignIn() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  function startCooldown() {
    setCooldown(30);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  async function handleSendOtp() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setError('Something went wrong. Please try again.');
      return;
    }
    setOtpSent(true);
    startCooldown();
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: 'email',
    });
    setLoading(false);
    if (error) {
      setError('Invalid or expired code. Please try again.');
      return;
    }
    router.push('/account');
    router.refresh();
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-12 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <span className="text-xs font-medium tracking-widest text-primary mb-3 block">
            SRI BOUTIQUE
          </span>
          <h1 className="font-display text-3xl font-medium text-foreground mb-2">
            Welcome Back
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            Sign in to continue your shopping journey
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-5 shadow-sm">
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            size="lg"
            className="w-full font-body text-base h-12"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity=".9"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground font-body uppercase tracking-wider">
                Or
              </span>
            </div>
          </div>

          {!otpSent ? (
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 font-body"
                autoComplete="email"
                inputMode="email"
              />
              <Button
                onClick={handleSendOtp}
                disabled={loading || !email.includes('@') || cooldown > 0}
                variant="outline"
                size="lg"
                className="w-full font-body text-base h-12"
              >
                {loading ? 'Sending code...' : 'Continue with Email'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-body text-center">
                We sent a 6-digit code to<br />
                <span className="font-medium text-foreground">{email}</span>
              </p>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="• • • • • •"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="h-12 text-center text-lg tracking-[0.5em] font-body"
                autoComplete="one-time-code"
              />
              <Button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                size="lg"
                className="w-full font-body text-base h-12"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
              <div className="flex items-center justify-between text-xs font-body pt-1">
                <button
                  onClick={() => { setOtpSent(false); setOtp(''); setError(null); }}
                  className="text-muted-foreground underline underline-offset-2"
                >
                  Change email
                </button>
                <button
                  onClick={handleSendOtp}
                  disabled={cooldown > 0}
                  className="text-primary underline underline-offset-2 disabled:text-muted-foreground disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive font-body text-center">{error}</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground font-body text-center mt-6">
          By continuing, you agree to Sri Boutique&apos;s{' '}
          <a href="/terms" className="underline underline-offset-2">Terms</a> and{' '}
          <a href="/privacy" className="underline underline-offset-2">Privacy Policy</a>
        </p>
      </motion.div>
    </div>
  );
}