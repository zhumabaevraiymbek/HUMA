'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface Document {
  id: string;
  title: string;
  file_name: string;
  word_count: number;
  ai_score: number;
  ai_verdict: string;
  plagiarism_score: number;
  status: string;
  created_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const { lang, t } = useLanguage();

  const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', kk: 'kk-KZ' };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('university_id, role')
        .eq('id', user.id)
        .single();

      const query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile?.role !== 'superadmin' && profile?.university_id) {
        query.eq('university_id', profile.university_id);
      }

      const { data } = await query;
      setDocuments(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const getAiColor = (score: number) =>
    score > 60 ? '#ef4444' : score > 35 ? '#eab308' : '#22c55e';

  const getPlagColor = (score: number) =>
    score > 30 ? '#ef4444' : score > 15 ? '#eab308' : '#22c55e';

  return (
    <div className="min-h-screen grid-bg">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-amber-400 transition-colors text-sm">
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
              onClick={() => router.push('/dashboard/upload')}
              className="text-xs px-4 py-2 rounded transition-all"
              style={{ background: 'var(--color-accent, #f59e0b)', color: 'var(--color-text, #111827)', fontWeight: 600 }}
            >
              {t('docs.addBtn')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs tracking-[0.4em] text-amber-500 uppercase mb-2">{t('docs.subtitle')}</p>
          <h1 className="font-display text-4xl text-gray-900">{t('docs.heading')}</h1>
        </div>

        {loading ? (
          <div className="text-amber-400 text-sm animate-pulse">{t('common.loading')}</div>
        ) : documents.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-12 text-center">
            <p className="text-gray-600 text-sm mb-4">{t('docs.empty')}</p>
            <button
              onClick={() => router.push('/dashboard/upload')}
              className="text-xs px-4 py-2 rounded"
              style={{ background: 'var(--color-accent, #f59e0b)', color: 'var(--color-text, #111827)', fontWeight: 600 }}
            >
              {t('docs.uploadFirst')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-4 px-5 pb-2">
              <p className="col-span-5 text-xs text-gray-600 uppercase tracking-widest">{t('docs.col.name')}</p>
              <p className="col-span-2 text-xs text-gray-600 uppercase tracking-widest text-center">{t('docs.col.ai')}</p>
              <p className="col-span-2 text-xs text-gray-600 uppercase tracking-widest text-center">{t('docs.col.plagiarism')}</p>
              <p className="col-span-2 text-xs text-gray-600 uppercase tracking-widest text-center">{t('docs.col.date')}</p>
              <p className="col-span-1 text-xs text-gray-600 uppercase tracking-widest"></p>
            </div>

            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => router.push(`/dashboard/documents/${doc.id}`)}
                className="grid grid-cols-12 gap-4 items-center rounded-lg border border-border bg-surface p-5 cursor-pointer hover:border-amber-500/30 transition-all"
              >
                <div className="col-span-5">
                  <p className="text-gray-900 text-sm font-semibold truncate">{doc.title}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{doc.file_name} · {doc.word_count?.toLocaleString()} {t('docs.words')}</p>
                </div>

                <div className="col-span-2 text-center">
                  {doc.status === 'done' ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg font-semibold font-mono" style={{ color: getAiColor(doc.ai_score) }}>
                        {doc.ai_score}%
                      </span>
                      <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${doc.ai_score}%`, background: getAiColor(doc.ai_score) }} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </div>

                <div className="col-span-2 text-center">
                  {doc.status === 'done' ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg font-semibold font-mono" style={{ color: getPlagColor(doc.plagiarism_score) }}>
                        {doc.plagiarism_score}%
                      </span>
                      <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${doc.plagiarism_score}%`, background: getPlagColor(doc.plagiarism_score) }} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-yellow-600 animate-pulse">{t('docs.processing')}</span>
                  )}
                </div>

                <div className="col-span-2 text-center">
                  <span className="text-xs text-gray-500">
                    {new Date(doc.created_at).toLocaleDateString(localeMap[lang])}
                  </span>
                </div>

                <div className="col-span-1 text-right">
                  <span className="text-gray-600 text-xs">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
