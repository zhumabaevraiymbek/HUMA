'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface PlagiarismMatch {
  id: string;
  match_type: string;
  similarity_score: number;
  matched_fragment: string;
  matched_document_id: string | null;
  matched_url: string | null;
}

interface Document {
  id: string;
  title: string;
  file_name: string;
  word_count: number;
  ai_score: number;
  ai_verdict: string;
  ai_summary: string;
  plagiarism_score: number;
  status: string;
  created_at: string;
}

export default function DocumentReportPage() {
  const [doc, setDoc] = useState<Document | null>(null);
  const [matches, setMatches] = useState<PlagiarismMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  const { lang, t } = useLanguage();

  const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', kk: 'kk-KZ' };

  useEffect(() => {
    const load = async () => {
      const { data: document } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      setDoc(document);

      const { data: plagMatches } = await supabase
        .from('plagiarism_matches')
        .select('*')
        .eq('document_id', id);
      setMatches(plagMatches || []);

      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-amber-400 text-sm animate-pulse">{t('common.loadingReport')}</div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-red-400 text-sm">{t('common.notFound')}</div>
      </div>
    );
  }

  const aiColor = doc.ai_score > 60 ? '#ef4444' : doc.ai_score > 35 ? '#eab308' : '#22c55e';
  const plagColor = doc.plagiarism_score > 30 ? '#ef4444' : doc.plagiarism_score > 15 ? '#eab308' : '#22c55e';

  const plagLevel = doc.plagiarism_score > 30
    ? t('report.level.high')
    : doc.plagiarism_score > 15
      ? t('report.level.medium')
      : t('report.level.low');

  return (
    <div className="min-h-screen grid-bg">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-amber-400 transition-colors text-sm">
              {t('nav.backDashboard')}
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
              {t('nav.newCheck')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-6">
        {/* Title */}
        <div>
          <p className="text-xs tracking-[0.4em] text-amber-500 uppercase mb-2">{t('report.subtitle')}</p>
          <h1 className="font-display text-3xl text-gray-900 mb-1">{doc.title}</h1>
          <p className="text-gray-600 text-sm">
            {doc.file_name} · {doc.word_count?.toLocaleString()} {t('report.words')} · {new Date(doc.created_at).toLocaleDateString(localeMap[lang])}
          </p>
        </div>

        {/* Score cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* AI Score */}
          <div className="rounded-lg border border-border bg-surface p-6 amber-glow">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">{t('report.ai')}</p>
            <div className="flex items-end gap-4 mb-4">
              <span className="font-display text-6xl font-semibold" style={{ color: aiColor }}>{doc.ai_score}</span>
              <span className="text-gray-500 mb-2 text-sm">/ 100</span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${doc.ai_score}%`, background: aiColor }} />
            </div>
            <p className="font-display text-lg italic" style={{ color: aiColor }}>{doc.ai_verdict}</p>
          </div>

          {/* Plagiarism Score */}
          <div className="rounded-lg border border-border bg-surface p-6">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">{t('report.plagiarism')}</p>
            <div className="flex items-end gap-4 mb-4">
              <span className="font-display text-6xl font-semibold" style={{ color: plagColor }}>{doc.plagiarism_score}</span>
              <span className="text-gray-500 mb-2 text-sm">/ 100</span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${doc.plagiarism_score}%`, background: plagColor }} />
            </div>
            <p className="font-display text-lg italic" style={{ color: plagColor }}>{plagLevel}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">{t('report.summary')}</p>
          <p className="text-sm text-gray-700 leading-relaxed">{doc.ai_summary}</p>
        </div>

        {/* Plagiarism matches */}
        {matches.length > 0 && (
          <div className="rounded-lg border border-border bg-surface p-6">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">{t('report.matches')}</p>
            <div className="space-y-3">
              {matches.map((match) => (
                <div key={match.id} className="rounded border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-1 rounded border border-red-500/20 bg-red-500/5 text-red-400">
                      {match.match_type === 'internal' ? t('report.matchInternal') : t('report.matchInternet')}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: plagColor }}>
                      {match.similarity_score}% {t('report.matchPercent')}
                    </span>
                  </div>
                  {match.matched_fragment && (
                    <p className="text-xs text-gray-500 font-mono mt-2 border-l-2 border-border pl-3">
                      «{match.matched_fragment}»
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {matches.length === 0 && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-6 text-center">
            <p className="text-green-400 text-sm">{t('report.noMatches')}</p>
          </div>
        )}
      </main>
    </div>
  );
}
