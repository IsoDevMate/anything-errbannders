/**
 * ⚠ ANYTHING PLATFORM — DO NOT REWRITE THIS FILE ⚠
 *
 * Shipped v2 auth scaffolding. The <form onSubmit>, e.preventDefault(), and
 * window.location.href redirect are load-bearing for the mobile WebView auth
 * flow (AuthWebView intercepts the navigation to capture the session). A
 * prior AI rewrite replaced <form onSubmit> with <button onClick> and broke
 * signup platform-wide — "credentials cleared" / "button does nothing" for
 * every user until a human reverted it. DO NOT repeat that mistake.
 *
 *   Safe:   restyle, rewrite copy, add form fields (pass `name` explicitly).
 *   Unsafe: replacing <form>, removing preventDefault, bypassing
 *           authClient.signUp.email, changing the callbackUrl redirect.
 */
'use client';

import { useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useState } from 'react';
import { SocialSignInButtons } from '@/components/SocialSignInButtons';
import { authClient } from '@/lib/auth-client';

function SignUpForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name: name || '',
    });

    if (signUpError) {
      setError(signUpError.message ?? 'Sign up failed');
      setLoading(false);
      return;
    }

    if (typeof window !== 'undefined') {
      window.location.href = callbackUrl;
    } else {
      console.warn('signup: window is undefined; cannot redirect to callbackUrl');
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#F9FAFB] p-[16px]">
      <div className="w-full max-w-[420px]">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-black">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-[28px] font-bold text-[#111827]">Join ErrandEconomy</h1>
          <p className="mt-1 text-[14px] text-[#6B7280]">Your trusted errand platform in Nairobi</p>
        </div>

        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          className="flex w-full flex-col gap-[16px] rounded-[24px] bg-white p-[28px] shadow-sm border border-[#F3F4F6]"
        >
          <label className="flex flex-col gap-[6px] text-[14px] font-medium text-[#374151]">
            Full Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kelvin Mutua"
              className="rounded-[12px] border border-[#E5E7EB] p-[12px] text-[16px] outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
            />
          </label>

          <label className="flex flex-col gap-[6px] text-[14px] font-medium text-[#374151]">
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-[12px] border border-[#E5E7EB] p-[12px] text-[16px] outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
            />
          </label>

          <label className="flex flex-col gap-[6px] text-[14px] font-medium text-[#374151]">
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="rounded-[12px] border border-[#E5E7EB] p-[12px] text-[16px] outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
            />
          </label>

          {error && (
            <div className="rounded-[12px] bg-red-50 p-[12px] text-[14px] text-red-600 border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-[14px] bg-black p-[14px] text-[16px] font-semibold text-white disabled:opacity-50 hover:bg-[#1a1a1a] transition-colors mt-1"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

          <SocialSignInButtons callbackUrl={callbackUrl} />

          <a
            href={`/account/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-center text-[14px] text-[#6B7280] hover:text-black transition-colors"
          >
            Already have an account? <span className="font-semibold text-[#10B981]">Sign in</span>
          </a>
        </form>

        <p className="mt-6 text-center text-[12px] text-[#9CA3AF]">
          🔒 ID-verified agents. Funds held in escrow.
        </p>
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
