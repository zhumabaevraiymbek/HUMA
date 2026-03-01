'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface University {
  id: string;
  name: string;
  domain: string | null;
  is_active: boolean;
  created_at: string;
}

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();
  const { lang, t } = useLanguage();

  const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', kk: 'kk-KZ' };

  const loadUniversities = async () => {
    const { data } = await supabase
      .from('universities')
      .select('*')
      .order('created_at', { ascending: false });
    setUniversities(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadUniversities();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) { setError(t('uni.error.nameRequired')); return; }
    setSaving(true);
    setError('');

    const { error } = await supabase
      .from('universities')
      .insert({ name: name.trim(), domain: domain.trim() || null, is_active: true });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setName('');
    setDomain('');
    setShowForm(false);
    setSaving(false);
    loadUniversities();
  };

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-amber-400 transition-colors text-sm"
            >
              {t('nav.back')}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 border border-amber-500/60 rotate-45 flex items-center justify-center">
                <div className="w-2 h-2 bg-amber-500 rotate-[-45deg]" />
              </div>
              <span className="font-display text-xl tracking-[0.15em] text-gray-900">VERIDOC</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-xs px-4 py-2 rounded transition-all"
              style={{ background: 'var(--color-accent, #f59e0b)', color: 'var(--color-text, #111827)', fontWeight: 600 }}
            >
              {t('uni.addBtn')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs tracking-[0.4em] text-amber-500 uppercase mb-2">{t('uni.subtitle')}</p>
          <h1 className="font-display text-4xl text-gray-900">{t('uni.heading')}</h1>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="rounded-lg border border-border bg-surface p-6 mb-8 animate-fade-in-up">
            <p className="text-sm text-gray-900 font-semibold mb-4">{t('uni.formTitle')}</p>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">
                  {t('uni.labelName')}
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Нархоз Университет"
                  className="w-full bg-input border border-border rounded px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-amber-500/40 transition-colors font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">
                  {t('uni.labelDomain')}
                </label>
                <input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="narxoz.kz"
                  className="w-full bg-input border border-border rounded px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-amber-500/40 transition-colors font-mono"
                />
              </div>
            </div>

            {error && (
              <div className="rounded border border-red-500/30 bg-red-500/5 px-4 py-3 mb-4">
                <p className="text-red-400 text-xs">⚠ {error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-6 py-2 rounded text-sm font-semibold transition-all"
                style={{ background: 'var(--color-accent, #f59e0b)', color: 'var(--color-text, #111827)' }}
              >
                {saving ? t('common.saving') : t('common.create')}
              </button>
              <button
                onClick={() => { setShowForm(false); setError(''); }}
                className="px-6 py-2 rounded text-sm border border-border text-gray-500 hover:text-gray-900 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Universities list */}
        {loading ? (
          <div className="text-amber-400 text-sm animate-pulse">{t('common.loading')}</div>
        ) : universities.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-12 text-center">
            <p className="text-gray-600 text-sm">{t('uni.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {universities.map((uni) => (
              <div
                key={uni.id}
                className="rounded-lg border border-border bg-surface p-5 flex items-center justify-between hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded border border-amber-500/20 bg-amber-500/10 flex items-center justify-center text-amber-400 font-display text-lg">
                    {uni.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-gray-900 text-sm font-semibold">{uni.name}</p>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {uni.domain ? `@${uni.domain}` : t('uni.noDomain')}
                      {' · '}
                      {new Date(uni.created_at).toLocaleDateString(localeMap[lang])}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-[10px] px-2 py-1 rounded border"
                    style={{
                      color: uni.is_active ? '#22c55e' : 'var(--color-muted, #6b7280)',
                      borderColor: uni.is_active ? '#22c55e40' : 'var(--color-border, #e5e7eb)',
                      background: uni.is_active ? '#22c55e10' : 'transparent',
                    }}
                  >
                    {uni.is_active ? t('uni.active') : t('uni.inactive')}
                  </span>
                  <button
                    onClick={() => router.push(`/dashboard/universities/${uni.id}`)}
                    className="text-xs text-gray-600 hover:text-amber-400 transition-colors border border-border hover:border-amber-500/40 px-3 py-1.5 rounded"
                  >
                    {t('uni.manageBtn')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
