'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';

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
        <div className="text-amber-400 text-sm animate-pulse">Загрузка отчёта...</div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-red-400 text-sm">Документ не найден</div>
      </div>
    );
  }

  const aiColor = doc.ai_score > 60 ? '#ef4444' : doc.ai_score > 35 ? '#eab308' : '#22c55e';
  const plagColor = doc.plagiarism_score > 30 ? '#ef4444' : doc.plagiarism_score > 15 ? '#eab308' : '#22c55e';

  return (
    <div className="min-h-screen grid-bg">
      <header className="border-b border-[#1e1e30] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-amber-400 transition-colors text-sm">
              ← Дашборд
            </button>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 border border-amber-500/60 rotate-45 flex items-center justify-center">
                <div className="w-2 h-2 bg-amber-500 rotate-[-45deg]" />
              </div>
              <span className="font-display text-xl tracking-[0.15em] text-white">VERIDOC</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/upload')}
            className="text-xs px-4 py-2 rounded transition-all"
            style={{ background: '#f59e0b', color: '#080810', fontWeight: 600 }}
          >
            + Новая проверка
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-6">
        {/* Title */}
        <div>
          <p className="text-xs tracking-[0.4em] text-amber-500 uppercase mb-2">Отчёт</p>
          <h1 className="font-display text-3xl text-white mb-1">{doc.title}</h1>
          <p className="text-gray-600 text-sm">
            {doc.file_name} · {doc.word_count?.toLocaleString()} слов · {new Date(doc.created_at).toLocaleDateString('ru-RU')}
          </p>
        </div>

        {/* Score cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* AI Score */}
          <div className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-6 amber-glow">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">AI Контент</p>
            <div className="flex items-end gap-4 mb-4">
              <span className="font-display text-6xl font-semibold" style={{ color: aiColor }}>{doc.ai_score}</span>
              <span className="text-gray-500 mb-2 text-sm">/ 100</span>
            </div>
            <div className="w-full h-2 bg-[#1e1e30] rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${doc.ai_score}%`, background: aiColor }} />
            </div>
            <p className="font-display text-lg italic" style={{ color: aiColor }}>{doc.ai_verdict}</p>
          </div>

          {/* Plagiarism Score */}
          <div className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-6">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">Плагиат</p>
            <div className="flex items-end gap-4 mb-4">
              <span className="font-display text-6xl font-semibold" style={{ color: plagColor }}>{doc.plagiarism_score}</span>
              <span className="text-gray-500 mb-2 text-sm">/ 100</span>
            </div>
            <div className="w-full h-2 bg-[#1e1e30] rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${doc.plagiarism_score}%`, background: plagColor }} />
            </div>
            <p className="font-display text-lg italic" style={{ color: plagColor }}>
              {doc.plagiarism_score > 30 ? 'Высокий уровень' : doc.plagiarism_score > 15 ? 'Средний уровень' : 'Низкий уровень'}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-6">
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">Резюме</p>
          <p className="text-sm text-gray-300 leading-relaxed">{doc.ai_summary}</p>
        </div>

        {/* Plagiarism matches */}
        {matches.length > 0 && (
          <div className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-6">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">Найденные совпадения</p>
            <div className="space-y-3">
              {matches.map((match) => (
                <div key={match.id} className="rounded border border-[#1e1e30] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-1 rounded border border-red-500/20 bg-red-500/5 text-red-400">
                      {match.match_type === 'internal' ? 'Внутренняя база' : 'Интернет'}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: plagColor }}>
                      {match.similarity_score}% совпадение
                    </span>
                  </div>
                  {match.matched_fragment && (
                    <p className="text-xs text-gray-500 font-mono mt-2 border-l-2 border-[#1e1e30] pl-3">
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
            <p className="text-green-400 text-sm">✓ Совпадений с другими работами не найдено</p>
          </div>
        )}
      </main>
    </div>
  );
}
