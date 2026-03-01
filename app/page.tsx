'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

type Lang = 'en' | 'ru' | 'kk';
type InputMode = 'file' | 'text';

interface ParagraphResult {
  index: number;
  score: number;
  flag: 'human' | 'mixed' | 'ai';
  reasoning: string;
  text: string;
}

interface AnalysisResult {
  overall_score: number;
  verdict: string;
  confidence: string;
  word_count: number;
  summary: string;
  key_indicators: string[];
  paragraphs: ParagraphResult[];
  truncated: boolean;
  total_paragraphs: number;
  file_name: string;
}

type Stage = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'done' | 'error';

const T = {
  en: {
    tagline: 'Forensic Document Analysis',
    title1: 'Detect AI-Generated',
    title2: 'Content',
    subtitle: 'Upload a Word document or paste text. Our forensic engine analyses linguistic patterns to determine AI authorship with paragraph-level precision.',
    tab_file: 'Upload File',
    tab_text: 'Paste Text',
    dropzone: 'Drop your document here',
    dropzone_sub: 'or click to browse — .docx, .doc supported',
    textarea_placeholder: 'Paste your text here (minimum 100 characters)...',
    analyze_btn: 'Analyze Text',
    feat1: '✓ Secure analysis', feat2: '✓ No file storage', feat3: '✓ Paragraph-level results',
    analysing: 'Analysing',
    step1_label: 'Uploading document', step1_sub: 'Transferring file securely',
    step2_label: 'Extracting text content', step2_sub: 'Parsing .docx structure',
    step3_label: 'Running forensic analysis', step3_sub: 'Consulting AI detection model',
    step1_text_label: 'Processing text', step1_text_sub: 'Preparing your input',
    analysis_complete: 'Analysis Complete',
    words: 'words', paragraphs: 'paragraphs', truncated: 'truncated at 40k chars',
    new_analysis: '← New Analysis', summary_label: 'Summary',
    ai_score: 'AI Score', confidence: 'Confidence', verdict: 'Verdict',
    indicators: 'Key Indicators Detected', breakdown: 'Paragraph Breakdown',
    human: 'HUMAN', mixed: 'MIXED', ai: 'AI',
    online: 'SYSTEM ONLINE', footer: 'Powered by Claude · No data retained', dismiss: 'Dismiss',
    text_too_short: 'Text is too short. Please enter at least 100 characters.',
  },
  ru: {
    tagline: 'Криминалистический анализ документов',
    title1: 'Определи AI-сгенерированный',
    title2: 'Контент',
    subtitle: 'Загрузи документ Word или вставь текст. Наш движок анализирует лингвистические паттерны для определения авторства ИИ на уровне абзацев.',
    tab_file: 'Загрузить файл',
    tab_text: 'Вставить текст',
    dropzone: 'Перетащи документ сюда',
    dropzone_sub: 'или нажми для выбора — поддерживаются .docx, .doc',
    textarea_placeholder: 'Вставь текст здесь (минимум 100 символов)...',
    analyze_btn: 'Анализировать',
    feat1: '✓ Безопасный анализ', feat2: '✓ Файлы не хранятся', feat3: '✓ Анализ по абзацам',
    analysing: 'Анализируется',
    step1_label: 'Загрузка документа', step1_sub: 'Безопасная передача файла',
    step2_label: 'Извлечение текста', step2_sub: 'Разбор структуры .docx',
    step3_label: 'Криминалистический анализ', step3_sub: 'Запрос к модели обнаружения ИИ',
    step1_text_label: 'Обработка текста', step1_text_sub: 'Подготовка введённых данных',
    analysis_complete: 'Анализ завершён',
    words: 'слов', paragraphs: 'абзацев', truncated: 'обрезано до 40к символов',
    new_analysis: '← Новый анализ', summary_label: 'Резюме',
    ai_score: 'Оценка ИИ', confidence: 'Уверенность', verdict: 'Вердикт',
    indicators: 'Обнаруженные индикаторы', breakdown: 'Анализ по абзацам',
    human: 'ЧЕЛОВЕК', mixed: 'СМЕШАНО', ai: 'ИИ',
    online: 'СИСТЕМА ОНЛАЙН', footer: 'Работает на Claude · Файлы не сохраняются', dismiss: 'Закрыть',
    text_too_short: 'Текст слишком короткий. Введите минимум 100 символов.',
  },
  kk: {
    tagline: 'Сот-криминалистикалық құжат талдауы',
    title1: 'AI жасаған контентті',
    title2: 'Анықта',
    subtitle: 'Word құжатын жүктеңіз немесе мәтін қойыңыз. Біздің қозғалтқыш абзац деңгейінде AI авторлығын анықтау үшін лингвистикалық үлгілерді талдайды.',
    tab_file: 'Файл жүктеу',
    tab_text: 'Мәтін қою',
    dropzone: 'Құжатты осы жерге апарыңыз',
    dropzone_sub: 'немесе шолу үшін басыңыз — .docx, .doc қолданылады',
    textarea_placeholder: 'Мәтінді осы жерге қойыңыз (кемінде 100 таңба)...',
    analyze_btn: 'Талдау',
    feat1: '✓ Қауіпсіз талдау', feat2: '✓ Файлдар сақталмайды', feat3: '✓ Абзац деңгейіндегі нәтижелер',
    analysing: 'Талдануда',
    step1_label: 'Құжат жүктелуде', step1_sub: 'Файлды қауіпсіз тасымалдау',
    step2_label: 'Мәтін мазмұнын шығару', step2_sub: '.docx құрылымын талдау',
    step3_label: 'Криминалистикалық талдау жүргізілуде', step3_sub: 'AI анықтау моделіне сұрау',
    step1_text_label: 'Мәтінді өңдеу', step1_text_sub: 'Енгізілген деректерді дайындау',
    analysis_complete: 'Талдау аяқталды',
    words: 'сөз', paragraphs: 'абзац', truncated: '40к таңбаға дейін қысқартылды',
    new_analysis: '← Жаңа талдау', summary_label: 'Қорытынды',
    ai_score: 'AI бағасы', confidence: 'Сенімділік', verdict: 'Үкім',
    indicators: 'Анықталған индикаторлар', breakdown: 'Абзац бойынша талдау',
    human: 'АДАМ', mixed: 'АРАЛАС', ai: 'AI',
    online: 'ЖҮЙЕ ОНЛАЙН', footer: 'Claude негізінде · Файлдар сақталмайды', dismiss: 'Жабу',
    text_too_short: 'Мәтін тым қысқа. Кемінде 100 таңба енгізіңіз.',
  },
};

function LangSelector({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 border border-border rounded p-1">
      {(['en', 'ru', 'kk'] as Lang[]).map(code => (
        <button key={code} onClick={() => setLang(code)}
          className="px-2 py-1 text-xs rounded transition-all uppercase"
          style={{ background: lang === code ? 'var(--color-accent, #f59e0b)' : 'transparent', color: lang === code ? 'var(--color-text, #111827)' : 'var(--color-muted, #6b7280)', fontWeight: lang === code ? 600 : 400 }}>
          {code}
        </button>
      ))}
    </div>
  );
}

function ScoreGauge({ score, verdict }: { score: number; verdict: string }) {
  const [displayScore, setDisplayScore] = useState(0);
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;
  const getColor = (s: number) => s < 30 ? '#22c55e' : s < 55 ? '#eab308' : s < 75 ? '#f97316' : '#ef4444';
  const color = getColor(displayScore);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / 1500, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 220, height: 220 }}>
        <svg width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="110" cy="110" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
          <circle cx="110" cy="110" r={radius} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.1s ease, stroke 0.3s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-6xl font-semibold amber-text-glow" style={{ color, lineHeight: 1 }}>{displayScore}</span>
          <span className="text-xs text-gray-500 mt-1 tracking-widest uppercase">% AI</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <span className="font-display text-xl italic" style={{ color }}>{verdict}</span>
      </div>
    </div>
  );
}

function ParagraphCard({ para, index, t }: { para: ParagraphResult; index: number; t: typeof T['en'] }) {
  const [open, setOpen] = useState(false);
  const flagColor = { human: '#22c55e', mixed: '#eab308', ai: '#ef4444' }[para.flag];
  const flagLabel = { human: t.human, mixed: t.mixed, ai: t.ai }[para.flag];

  return (
    <div className="para-card rounded border border-border bg-surface p-4 cursor-pointer" onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-gray-600 shrink-0 font-mono">P{String(index + 1).padStart(2, '0')}</span>
          <p className="text-sm text-gray-400 truncate">{para.text.slice(0, 80)}…</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${para.score}%`, background: flagColor }} />
          </div>
          <span className="text-xs font-mono" style={{ color: flagColor, minWidth: 28 }}>{para.score}%</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ color: flagColor, borderColor: flagColor + '40', background: flagColor + '10' }}>{flagLabel}</span>
          <span className="text-gray-600 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="mt-4 space-y-3 animate-fade-in-up">
          <p className="text-sm text-gray-700 leading-relaxed border-l-2 border-border pl-3">{para.text}</p>
          <p className="text-xs text-gray-500 italic">↳ {para.reasoning}</p>
        </div>
      )}
    </div>
  );
}

function AnalysisLoader({ stage, mode, t }: { stage: Stage; mode: InputMode; t: typeof T['en'] }) {
  const STEPS = mode === 'text'
    ? [
        { key: 'uploading', label: t.step1_text_label, sub: t.step1_text_sub },
        { key: 'extracting', label: t.step2_label, sub: t.step2_sub },
        { key: 'analyzing', label: t.step3_label, sub: t.step3_sub },
      ]
    : [
        { key: 'uploading', label: t.step1_label, sub: t.step1_sub },
        { key: 'extracting', label: t.step2_label, sub: t.step2_sub },
        { key: 'analyzing', label: t.step3_label, sub: t.step3_sub },
      ];
  const currentIdx = STEPS.findIndex(s => s.key === stage);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
        <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping" />
        <div className="absolute rounded-full border border-amber-500/30" style={{ inset: 8, animation: 'spin 3s linear infinite' }} />
        <div className="absolute rounded-full border-t border-amber-500" style={{ inset: 16, animation: 'spin 1.5s linear infinite' }} />
        <div className="text-amber-400 text-2xl">⬡</div>
      </div>
      <div className="w-full max-w-xs space-y-4">
        {STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px]"
                style={{ borderColor: done ? '#22c55e' : active ? 'var(--color-accent, #f59e0b)' : 'var(--color-border, #e5e7eb)', background: done ? '#22c55e15' : active ? '#f59e0b15' : 'transparent', color: done ? '#22c55e' : active ? 'var(--color-accent, #f59e0b)' : '#374151' }}>
                {done ? '✓' : active ? '◉' : '○'}
              </div>
              <div>
                <p className="text-sm" style={{ color: done ? 'var(--color-muted, #6b7280)' : active ? 'var(--color-text, #111827)' : '#374151' }}>
                  {step.label}{active && <span className="cursor-blink ml-0.5 text-amber-400">_</span>}
                </p>
                {active && <p className="text-xs text-gray-600 mt-0.5">{step.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [lang, setLang] = useState<Lang>('en');
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [pastedText, setPastedText] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const t = T[lang];

  const runAnalysis = useCallback(async (formData: FormData) => {
    try {
      await new Promise(r => setTimeout(r, 600));
      setStage('extracting');
      await new Promise(r => setTimeout(r, 600));
      setStage('analyzing');
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
      setStage('done');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setStage('error');
    }
  }, []);

  const analyzeFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setError('');
    setResult(null);
    setStage('uploading');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lang', lang);
    await runAnalysis(formData);
  }, [lang, runAnalysis]);

  const analyzeText = useCallback(async () => {
    if (pastedText.trim().length < 100) {
      setError(t.text_too_short);
      setStage('error');
      return;
    }
    setFileName('plain-text');
    setError('');
    setResult(null);
    setStage('uploading');
    const formData = new FormData();
    formData.append('text', pastedText);
    formData.append('lang', lang);
    await runAnalysis(formData);
  }, [pastedText, lang, t.text_too_short, runAnalysis]);

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(docx|doc)$/i)) { setError('Please upload a .docx or .doc file'); setStage('error'); return; }
    analyzeFile(file);
  }, [analyzeFile]);

  const reset = () => {
    setStage('idle');
    setResult(null);
    setError('');
    setFileName('');
    setPastedText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isLoading = ['uploading', 'extracting', 'analyzing'].includes(stage);

  return (
    <div className="min-h-screen grid-bg">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-amber-500/60 rotate-45 flex items-center justify-center">
              <div className="w-2 h-2 bg-amber-500 rotate-[-45deg]" />
            </div>
            <span className="font-display text-xl tracking-[0.15em] text-gray-900">VERIDOC</span>
          </div>
          <div className="flex items-center gap-4">
            <LangSelector lang={lang} setLang={setLang} />
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-500">{t.online}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.4em] text-amber-500 mb-4 uppercase">{t.tagline}</p>
          <h1 className="font-display text-5xl md:text-6xl font-semibold text-gray-900 mb-6 leading-tight">
            {t.title1}<br /><span className="italic text-amber-400">{t.title2}</span>
          </h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">{t.subtitle}</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-8 mb-8 amber-glow">
          {stage === 'idle' || stage === 'error' ? (
            <>
              {/* Tab switcher */}
              <div className="flex gap-1 mb-6 border border-border rounded-lg p-1 w-fit">
                {(['file', 'text'] as InputMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => { setInputMode(mode); setError(''); }}
                    className="px-4 py-2 text-sm rounded-md transition-all"
                    style={{
                      background: inputMode === mode ? 'var(--color-accent, #f59e0b)' : 'transparent',
                      color: inputMode === mode ? 'var(--color-text, #111827)' : 'var(--color-muted, #6b7280)',
                      fontWeight: inputMode === mode ? 600 : 400,
                    }}
                  >
                    {mode === 'file' ? `⬡ ${t.tab_file}` : `✎ ${t.tab_text}`}
                  </button>
                ))}
              </div>

              {/* File upload */}
              {inputMode === 'file' && (
                <div
                  className={`rounded border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-200 ${dragActive ? 'border-amber-500 bg-amber-500/5' : 'border-border hover:border-amber-500/40'}`}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".docx,.doc" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border border-border rounded-lg flex items-center justify-center text-3xl text-gray-600">⬡</div>
                    <div>
                      <p className="text-gray-900 mb-1">{t.dropzone}</p>
                      <p className="text-gray-600 text-sm">{t.dropzone_sub}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-700">
                      <span>{t.feat1}</span><span>{t.feat2}</span><span>{t.feat3}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Text input */}
              {inputMode === 'text' && (
                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder={t.textarea_placeholder}
                      className="w-full h-64 bg-input border border-border rounded-lg p-4 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-amber-500/40 transition-colors font-mono leading-relaxed"
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-700">
                      {pastedText.length} chars
                    </div>
                  </div>
                  <button
                    onClick={analyzeText}
                    disabled={pastedText.trim().length < 100}
                    className="w-full py-3 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: pastedText.trim().length >= 100 ? 'var(--color-accent, #f59e0b)' : 'var(--color-border, #e5e7eb)',
                      color: pastedText.trim().length >= 100 ? 'var(--color-text, #111827)' : '#374151',
                      cursor: pastedText.trim().length >= 100 ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {t.analyze_btn} →
                  </button>
                </div>
              )}

              {stage === 'error' && (
                <div className="mt-4 rounded border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3 animate-fade-in-up">
                  <span className="text-red-400 shrink-0">⚠</span>
                  <p className="text-red-400 text-sm flex-1">{error}</p>
                  <button onClick={reset} className="text-xs text-gray-600 hover:text-gray-900 transition-colors">{t.dismiss}</button>
                </div>
              )}
            </>
          ) : isLoading ? (
            <div className="py-8">
              <p className="text-center text-xs text-gray-600 mb-8 tracking-widest uppercase">
                {t.analysing}: <span className="text-amber-500">{fileName}</span>
              </p>
              <AnalysisLoader stage={stage} mode={inputMode} t={t} />
            </div>
          ) : null}
        </div>

        {stage === 'done' && result && (
          <div ref={resultsRef} className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 tracking-widest uppercase mb-1">{t.analysis_complete}</p>
                <p className="text-sm text-gray-400">
                  <span className="text-amber-500">{result.file_name}</span>
                  {' · '}{result.word_count?.toLocaleString() || '—'} {t.words}
                  {' · '}{result.total_paragraphs} {t.paragraphs}
                  {result.truncated && <span className="text-yellow-600"> · {t.truncated}</span>}
                </p>
              </div>
              <button onClick={reset} className="text-xs text-gray-600 hover:text-amber-400 transition-colors border border-border hover:border-amber-500/40 px-4 py-2 rounded">
                {t.new_analysis}
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1 rounded-lg border border-border bg-surface p-6 flex items-center justify-center amber-glow">
                <ScoreGauge score={result.overall_score} verdict={result.verdict} />
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="rounded-lg border border-border bg-surface p-5">
                  <p className="text-xs text-gray-600 tracking-widest uppercase mb-2">{t.summary_label}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t.ai_score, value: `${result.overall_score}%`, color: result.overall_score > 60 ? '#ef4444' : result.overall_score > 35 ? '#eab308' : '#22c55e' },
                    { label: t.confidence, value: result.confidence, color: 'var(--color-text, #111827)' },
                    { label: t.verdict, value: result.verdict, color: 'var(--color-accent, #f59e0b)' },
                  ].map(stat => (
                    <div key={stat.label} className="rounded border border-border bg-surface p-3 text-center">
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-sm font-semibold" style={{ color: stat.color }}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="text-xs text-gray-600 tracking-widest uppercase mb-3">{t.indicators}</p>
              <div className="flex flex-wrap gap-2">
                {result.key_indicators.map((ind, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded border border-amber-500/20 bg-amber-500/5 text-amber-600">{ind}</span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-600 tracking-widest uppercase">{t.breakdown}</p>
                <div className="flex items-center gap-4 text-[10px] text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {t.human}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> {t.mixed}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {t.ai}</span>
                </div>
              </div>
              <div className="space-y-2">
                {result.paragraphs.map((para, i) => (
                  <ParagraphCard key={i} para={para} index={i} t={t} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border px-6 py-6 mt-16">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-gray-700">
          <span>VERIDOC · AI Content Forensics</span>
          <span>{t.footer}</span>
        </div>
      </footer>
    </div>
  );
}
