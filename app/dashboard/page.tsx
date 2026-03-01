'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface Profile {
  full_name: string;
  role: string;
  university_id: string | null;
}

interface Stats {
  checks: number;
  universities: number;
  users: number;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ checks: 0, universities: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, role, university_id')
        .eq('id', user.id)
        .single();

      setProfile(prof);

      if (prof) {
        const isSuperadmin = prof.role === 'superadmin';

        const checksQuery = supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'done');
        if (!isSuperadmin && prof.university_id) checksQuery.eq('university_id', prof.university_id);
        const { count: checksCount } = await checksQuery;

        let uniCount = 0;
        if (isSuperadmin) {
          const { count } = await supabase
            .from('universities')
            .select('id', { count: 'exact', head: true });
          uniCount = count || 0;
        }

        const usersQuery = supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        if (!isSuperadmin && prof.university_id) usersQuery.eq('university_id', prof.university_id);
        const { count: usersCount } = await usersQuery;

        setStats({
          checks: checksCount || 0,
          universities: uniCount,
          users: usersCount || 0,
        });
      }

      setLoading(false);
    };

    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-amber-400 text-sm animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    superadmin: 'var(--color-accent, #f59e0b)',
    admin: '#818cf8',
    teacher: '#34d399',
    student: '#94a3b8',
  };

  const statCards = [
    { labelKey: 'dashboard.stat.checks', value: stats.checks, href: '/dashboard/documents' },
    { labelKey: 'dashboard.stat.universities', value: stats.universities, href: '/dashboard/universities', superadminOnly: true },
    { labelKey: 'dashboard.stat.users', value: stats.users, href: '/dashboard/users', adminOnly: true },
  ];

  const actions = [
    {
      titleKey: 'dashboard.action.check',
      descKey: 'dashboard.action.checkDesc',
      href: '/dashboard/upload',
      color: 'var(--color-accent, #f59e0b)',
      superadminOnly: false,
      adminOnly: false,
    },
    {
      titleKey: 'dashboard.action.unis',
      descKey: 'dashboard.action.unisDesc',
      href: '/dashboard/universities',
      color: '#818cf8',
      superadminOnly: true,
      adminOnly: false,
    },
  ];

  return (
    <div className="min-h-screen grid-bg">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-amber-500/60 rotate-45 flex items-center justify-center">
              <div className="w-2 h-2 bg-amber-500 rotate-[-45deg]" />
            </div>
            <span className="font-display text-xl tracking-[0.15em] text-gray-900">VERIDOC</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2 py-1 rounded border"
                style={{
                  color: roleColors[profile?.role || 'student'],
                  borderColor: roleColors[profile?.role || 'student'] + '40',
                  background: roleColors[profile?.role || 'student'] + '10',
                }}
              >
                {t(`role.${profile?.role || 'student'}`)}
              </span>
              <span className="text-sm text-gray-400">{profile?.full_name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-600 hover:text-amber-400 transition-colors border border-border hover:border-amber-500/40 px-3 py-1.5 rounded"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <p className="text-xs tracking-[0.4em] text-amber-500 uppercase mb-2">{t('dashboard.subtitle')}</p>
          <h1 className="font-display text-4xl text-gray-900">
            {t('dashboard.greetingPrefix')} <span className="italic text-amber-400">{profile?.full_name}</span>
          </h1>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {statCards
            .filter(s =>
              (!s.superadminOnly || profile?.role === 'superadmin') &&
              (!s.adminOnly || ['superadmin', 'admin'].includes(profile?.role || ''))
            )
            .map(stat => (
              <div
                key={stat.labelKey}
                onClick={() => stat.href && router.push(stat.href)}
                className={`rounded-lg border border-border bg-surface p-5 ${stat.href ? 'cursor-pointer hover:border-amber-500/30 transition-all' : ''}`}
              >
                <p className="text-2xl text-amber-400 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-600 uppercase tracking-widest">{t(stat.labelKey)}</p>
              </div>
            ))}
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 gap-4">
          {actions
            .filter(a =>
              (!a.superadminOnly || profile?.role === 'superadmin') &&
              (!a.adminOnly || ['superadmin', 'admin'].includes(profile?.role || ''))
            )
            .map(action => (
              <button
                key={action.titleKey}
                onClick={() => router.push(action.href)}
                className="rounded-lg border border-border bg-surface p-6 text-left hover:border-amber-500/30 transition-all group"
              >
                <div
                  className="w-10 h-10 rounded border flex items-center justify-center mb-4 transition-colors"
                  style={{ borderColor: action.color + '40', color: action.color, background: action.color + '10' }}
                >
                  ⬡
                </div>
                <p className="text-gray-900 text-sm font-semibold mb-1 group-hover:text-amber-400 transition-colors">
                  {t(action.titleKey)}
                </p>
                <p className="text-gray-600 text-xs leading-relaxed">{t(action.descKey)}</p>
              </button>
            ))}
        </div>
      </main>
    </div>
  );
}
