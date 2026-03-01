'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo + language switcher */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-amber-500/60 rotate-45 flex items-center justify-center">
              <div className="w-2 h-2 bg-amber-500 rotate-[-45deg]" />
            </div>
            <span className="font-display text-xl tracking-[0.15em] text-gray-900">VERIDOC</span>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-surface p-8 amber-glow">
          <p className="text-xs tracking-[0.3em] text-amber-500 uppercase mb-2">{t('login.welcome')}</p>
          <h1 className="font-display text-2xl text-gray-900 mb-8">{t('login.signIn')}</h1>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">
                {t('login.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full bg-input border border-border rounded px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-amber-500/40 transition-colors font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">
                {t('login.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-input border border-border rounded px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-amber-500/40 transition-colors font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded border border-red-500/30 bg-red-500/5 px-4 py-3">
                <p className="text-red-400 text-xs">⚠ {error}</p>
              </div>
            )}

            {/* Button */}
            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full py-3 rounded text-sm font-semibold transition-all mt-2"
              style={{
                background: loading || !email || !password ? 'var(--color-border, #e5e7eb)' : 'var(--color-accent, #f59e0b)',
                color: loading || !email || !password ? '#374151' : 'var(--color-text, #111827)',
                cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? t('login.loading') : t('login.submit')}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">
          {t('login.noAccount')}
        </p>
      </div>
    </div>
  );
}
