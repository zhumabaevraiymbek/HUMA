'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface Course {
  id: string;
  name: string;
}

export default function UploadPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [resultId, setResultId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadCourses = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
        .single();

      if (profile?.university_id) {
        const { data } = await supabase
          .from('courses')
          .select('id, name')
          .eq('university_id', profile.university_id);
        setCourses(data || []);
      }
    };
    loadCourses();
  }, []);

  const handleFile = useCallback((f: File) => {
    const allowed = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/pdf'];
    const allowedExt = /\.(docx|doc|pdf)$/i;
    if (!allowed.includes(f.type) && !allowedExt.test(f.name)) {
      setError('Только .docx, .doc или .pdf файлы');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('Файл слишком большой. Максимум 50MB');
      return;
    }
    setError('');
    setFile(f);
  }, []);

  const handleSubmit = async () => {
    if (!file || !title.trim()) {
      setError('Укажите название работы и загрузите файл');
      return;
    }
    setStage('uploading');
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', user!.id)
        .single();

      // Загружаем файл в Storage
      const safeFileName = file.name
  .replace(/[^a-zA-Z0-9._-]/g, '_')
  .replace(/_{2,}/g, '_');
  const filePath = `${profile?.university_id ?? 'unknown'}/${Date.now()}_${safeFileName}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw new Error(uploadError.message);

      setStage('analyzing');

      // Отправляем на анализ
      const formData = new FormData();
      formData.append('file', file);
      formData.append('lang', 'ru');
      formData.append('title', title);
      formData.append('studentName', studentName);
      formData.append('courseId', courseId);
      formData.append('universityId', profile.university_id);
      formData.append('filePath', filePath);
      formData.append('uploadedBy', user!.id);

      const res = await fetch('/api/documents/analyze', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Ошибка анализа');

      setResultId(data.documentId);
      setStage('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setStage('error');
    }
  };

  return (
    <div className="min-h-screen grid-bg">
      <header className="border-b border-[#1e1e30] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-amber-400 transition-colors text-sm">
              ← Назад
            </button>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 border border-amber-500/60 rotate-45 flex items-center justify-center">
                <div className="w-2 h-2 bg-amber-500 rotate-[-45deg]" />
              </div>
              <span className="font-display text-xl tracking-[0.15em] text-white">VERIDOC</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs tracking-[0.4em] text-amber-500 uppercase mb-2">Загрузка</p>
          <h1 className="font-display text-4xl text-white">Проверить работу</h1>
        </div>

        {stage === 'idle' || stage === 'error' ? (
          <div className="space-y-6">
            {/* Metadata */}
            <div className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-6">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Информация о работе</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Название работы *</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Дипломная работа по маркетингу"
                    className="w-full bg-[#080810] border border-[#1e1e30] rounded px-4 py-3 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-amber-500/40 transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Имя студента</label>
                  <input
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Иван Иванов"
                    className="w-full bg-[#080810] border border-[#1e1e30] rounded px-4 py-3 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-amber-500/40 transition-colors font-mono"
                  />
                </div>
                {courses.length > 0 && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Курс</label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full bg-[#080810] border border-[#1e1e30] rounded px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-amber-500/40 transition-colors font-mono"
                    >
                      <option value="">Не указан</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* File upload */}
            <div className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-6 amber-glow">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Файл</p>
              {!file ? (
                <div
                  className={`rounded border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-200 ${dragActive ? 'border-amber-500 bg-amber-500/5' : 'border-[#1e1e30] hover:border-amber-500/40'}`}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".docx,.doc,.pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-3">
                      <span className="text-xs px-3 py-1.5 rounded border border-amber-500/20 bg-amber-500/5 text-amber-400">DOCX</span>
                      <span className="text-xs px-3 py-1.5 rounded border border-amber-500/20 bg-amber-500/5 text-amber-400">DOC</span>
                      <span className="text-xs px-3 py-1.5 rounded border border-amber-500/20 bg-amber-500/5 text-amber-400">PDF</span>
                    </div>
                    <div>
                      <p className="text-white mb-1">Перетащи файл сюда</p>
                      <p className="text-gray-600 text-sm">или нажми для выбора · максимум 50MB</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded border border-amber-500/20 bg-amber-500/5 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400 text-lg">⬡</span>
                    <div>
                      <p className="text-white text-sm">{file.name}</p>
                      <p className="text-gray-600 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="text-gray-600 hover:text-red-400 transition-colors text-xs">
                    Удалить
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded border border-red-500/30 bg-red-500/5 px-4 py-3">
                <p className="text-red-400 text-xs">⚠ {error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!file || !title.trim()}
              className="w-full py-4 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: !file || !title.trim() ? '#1e1e30' : '#f59e0b',
                color: !file || !title.trim() ? '#374151' : '#080810',
                cursor: !file || !title.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Проверить работу →
            </button>
          </div>
        ) : stage === 'uploading' || stage === 'analyzing' ? (
          <div className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-12 flex flex-col items-center gap-8">
            <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
              <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping" />
              <div className="absolute rounded-full border-t border-amber-500" style={{ inset: 12, animation: 'spin 1.5s linear infinite' }} />
              <div className="text-amber-400 text-2xl">⬡</div>
            </div>
            <div className="text-center">
              <p className="text-white text-sm font-semibold mb-1">
                {stage === 'uploading' ? 'Загружаем файл...' : 'Анализируем документ...'}
              </p>
              <p className="text-gray-600 text-xs">
                {stage === 'uploading' ? 'Сохраняем в хранилище' : 'Проверка на AI и плагиат'}
              </p>
            </div>
          </div>
        ) : stage === 'done' ? (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-8 text-center animate-fade-in-up">
            <p className="text-green-400 text-4xl mb-4">✓</p>
            <p className="text-white font-semibold mb-2">Анализ завершён!</p>
            <p className="text-gray-600 text-sm mb-6">Работа проверена и добавлена в базу</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push(`/dashboard/documents/${resultId}`)}
                className="px-6 py-2 rounded text-sm font-semibold"
                style={{ background: '#f59e0b', color: '#080810' }}
              >
                Смотреть отчёт →
              </button>
              <button
                onClick={() => { setStage('idle'); setFile(null); setTitle(''); setStudentName(''); }}
                className="px-6 py-2 rounded text-sm border border-[#1e1e30] text-gray-500 hover:text-white transition-colors"
              >
                Загрузить ещё
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
