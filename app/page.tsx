'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Upload, Globe, Sparkles, Zap, Shield,
  CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';

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
    tagline: 'Trusted by Students Worldwide',
    title1: 'Verify Your Work',
    title2: 'Ensure Authenticity',
    subtitle: 'Upload a Word document or paste text. Our forensic engine analyses linguistic patterns to determine AI authorship with paragraph-level precision.',
    tab_file: 'Upload File',
    tab_text: 'Paste Text',
    dropzone: 'Drag and drop your file here',
    dropzone_sub: 'or click to browse — .docx, .doc supported',
    textarea_placeholder: 'Paste your text here (minimum 100 characters)...',
    analyze_btn: 'Analyze Content',
    feat1_title: 'Lightning Fast', feat1_desc: 'Get results in seconds',
    feat2_title: 'Highly Accurate', feat2_desc: 'Advanced AI detection',
    feat3_title: 'Secure & Private', feat3_desc: 'Your data stays safe',
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
    analyzing: 'Analyzing...',
  },
  ru: {
    tagline: 'Проверяйте академическую честность',
    title1: 'Проверь свою работу',
    title2: 'Обеспечь подлинность',
    subtitle: 'Загрузи документ Word или вставь текст. Наш движок анализирует лингвистические паттерны для определения авторства ИИ на уровне абзацев.',
    tab_file: 'Загрузить файл',
    tab_text: 'Вставить текст',
    dropzone: 'Перетащи документ сюда',
    dropzone_sub: 'или нажми для выбора — поддерживаются .docx, .doc',
    textarea_placeholder: 'Вставь текст здесь (минимум 100 символов)...',
    analyze_btn: 'Анализировать',
    feat1_title: 'Молниеносно', feat1_desc: 'Результаты за секунды',
    feat2_title: 'Высокая точность', feat2_desc: 'Продвинутое обнаружение AI',
    feat3_title: 'Безопасно', feat3_desc: 'Ваши данные защищены',
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
    analyzing: 'Анализ...',
  },
  kk: {
    tagline: 'Академиялық адалдықты тексеріңіз',
    title1: 'Жұмысыңызды тексеріңіз',
    title2: 'Шынайылықты қамтамасыз етіңіз',
    subtitle: 'Word құжатын жүктеңіз немесе мәтін қойыңыз. Біздің қозғалтқыш абзац деңгейінде AI авторлығын анықтау үшін лингвистикалық үлгілерді талдайды.',
    tab_file: 'Файл жүктеу',
    tab_text: 'Мәтін қою',
    dropzone: 'Құжатты осы жерге апарыңыз',
    dropzone_sub: 'немесе шолу үшін басыңыз — .docx, .doc қолданылады',
    textarea_placeholder: 'Мәтінді осы жерге қойыңыз (кемінде 100 таңба)...',
    analyze_btn: 'Талдау',
    feat1_title: 'Жылдам', feat1_desc: 'Секундтарда нәтиже',
    feat2_title: 'Жоғары дәлдік', feat2_desc: 'Озық AI анықтау',
    feat3_title: 'Қауіпсіз', feat3_desc: 'Деректеріңіз қорғалған',
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
    analyzing: 'Талдануда...',
  },
};

/* ─── Language selector ─────────────────────────────── */
function LangSelector({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1 bg-white">
      {(['en', 'ru', 'kk'] as Lang[]).map(code => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className="px-2 py-1 text-xs rounded-md transition-all uppercase font-medium"
          style={{
            background: lang === code ? 'linear-gradient(to right, #2563eb, #4f46e5)' : 'transparent',
            color: lang === code ? '#fff' : '#6b7280',
          }}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

/* ─── Score gauge ───────────────────────────────────── */
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
          <span className="font-display text-6xl font-semibold" style={{ color, lineHeight: 1 }}>{displayScore}</span>
          <span className="text-xs text-gray-500 mt-1 tracking-widest uppercase">% AI</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <span className="text-xl font-semibold italic" style={{ color }}>{verdict}</span>
      </div>
    </div>
  );
}

/* ─── Paragraph card ────────────────────────────────── */
function ParagraphCard({ para, index, t }: { para: ParagraphResult; index: number; t: typeof T['en'] }) {
  const [open, setOpen] = useState(false);
  const flagColor = { human: '#22c55e', mixed: '#eab308', ai: '#ef4444' }[para.flag];
  const flagLabel = { human: t.human, mixed: t.mixed, ai: t.ai }[para.flag];

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-4 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-gray-500 shrink-0 font-mono">P{String(index + 1).padStart(2, '0')}</span>
          <p className="text-sm text-gray-500 truncate">{para.text.slice(0, 80)}…</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${para.score}%`, background: flagColor }} />
          </div>
          <span className="text-xs font-mono" style={{ color: flagColor, minWidth: 28 }}>{para.score}%</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ color: flagColor, borderColor: flagColor + '40', background: flagColor + '10' }}>{flagLabel}</span>
          <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 space-y-3 overflow-hidden"
        >
          <p className="text-sm text-gray-700 leading-relaxed border-l-2 border-indigo-200 pl-3">{para.text}</p>
          <p className="text-xs text-gray-500 italic">↳ {para.reasoning}</p>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Analysis loader ───────────────────────────────── */
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
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
      <div className="w-full max-w-xs space-y-4">
        {STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div
                className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px]"
                style={{
                  borderColor: done ? '#22c55e' : active ? '#4f46e5' : '#e5e7eb',
                  background: done ? '#22c55e15' : active ? '#4f46e515' : 'transparent',
                  color: done ? '#22c55e' : active ? '#4f46e5' : '#9ca3af',
                }}
              >
                {done ? '✓' : active ? '◉' : '○'}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: done ? '#9ca3af' : active ? '#111827' : '#6b7280' }}>
                  {step.label}{active && <span className="ml-1 text-indigo-500 animate-pulse">_</span>}
                </p>
                {active && <p className="text-xs text-gray-500 mt-0.5">{step.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────── */
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Header */}
      <header className="relative sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900 tracking-tight">VERIDOC</h1>
              <p className="text-xs text-gray-500">AI Content Detection</p>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <LangSelector lang={lang} setLang={setLang} />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-500">{t.online}</span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 border border-blue-200 rounded-full mb-6"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">{t.tagline}</span>
          </motion.div>

          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 tracking-tight">
            {t.title1}
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {t.title2}
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t.subtitle}</p>
        </motion.div>

        {/* Upload card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white shadow-xl border border-gray-200 rounded-2xl p-8 mb-8"
        >
          {stage === 'idle' || stage === 'error' ? (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-8 p-1.5 bg-gray-100 rounded-xl">
                {(['file', 'text'] as InputMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => { setInputMode(mode); setError(''); }}
                    className="flex-1 py-3 px-6 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm"
                    style={{
                      background: inputMode === mode ? '#fff' : 'transparent',
                      color: inputMode === mode ? '#4f46e5' : '#6b7280',
                      boxShadow: inputMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {mode === 'file' ? <Upload className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    {mode === 'file' ? t.tab_file : t.tab_text}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {inputMode === 'file' ? (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className={`rounded-2xl border-2 border-dashed p-16 text-center cursor-pointer transition-all duration-200 ${
                        dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50'
                      }`}
                      onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                      onDragLeave={() => setDragActive(false)}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input ref={fileInputRef} type="file" accept=".docx,.doc" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                      <Upload className={`w-16 h-16 mx-auto mb-4 transition-colors ${dragActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                      <p className="text-gray-700 text-lg mb-2">{t.dropzone}</p>
                      <p className="text-gray-500 text-sm mb-6">{t.dropzone_sub}</p>
                      <div className="inline-flex px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg shadow-md">
                        Choose File
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative mb-6">
                      <textarea
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder={t.textarea_placeholder}
                        className="w-full h-64 bg-gray-50 border border-gray-300 rounded-xl p-4 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono leading-relaxed"
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                        {pastedText.length} chars
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              {stage === 'error' && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm flex-1">{error}</p>
                  <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">{t.dismiss}</button>
                </div>
              )}

              {/* Analyze button */}
              <button
                onClick={inputMode === 'text' ? analyzeText : undefined}
                disabled={inputMode === 'text' && pastedText.trim().length < 100}
                className="w-full py-5 rounded-xl text-base font-semibold transition-all text-white shadow-lg"
                style={{
                  background: (inputMode === 'file' || pastedText.trim().length >= 100)
                    ? 'linear-gradient(to right, #2563eb, #4f46e5)'
                    : '#e5e7eb',
                  color: (inputMode === 'file' || pastedText.trim().length >= 100) ? '#fff' : '#9ca3af',
                  cursor: (inputMode === 'file' || pastedText.trim().length >= 100) ? 'pointer' : 'not-allowed',
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  {t.analyze_btn}
                </span>
              </button>
            </>
          ) : isLoading ? (
            <div className="py-4">
              <p className="text-center text-xs text-gray-500 mb-8 tracking-widest uppercase">
                {t.analysing}: <span className="text-indigo-600 font-medium">{fileName}</span>
              </p>
              <AnalysisLoader stage={stage} mode={inputMode} t={t} />
            </div>
          ) : null}
        </motion.div>

        {/* Results */}
        {stage === 'done' && result && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 mb-12"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 tracking-widest uppercase mb-1">{t.analysis_complete}</p>
                <p className="text-sm text-gray-600">
                  <span className="text-indigo-600 font-medium">{result.file_name}</span>
                  {' · '}{result.word_count?.toLocaleString() || '—'} {t.words}
                  {' · '}{result.total_paragraphs} {t.paragraphs}
                  {result.truncated && <span className="text-yellow-600"> · {t.truncated}</span>}
                </p>
              </div>
              <button
                onClick={reset}
                className="text-xs text-gray-600 hover:text-indigo-600 transition-colors border border-gray-300 hover:border-indigo-400 px-4 py-2 rounded-lg"
              >
                {t.new_analysis}
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1 rounded-2xl border border-gray-200 bg-white p-6 flex items-center justify-center shadow-sm">
                <ScoreGauge score={result.overall_score} verdict={result.verdict} />
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs text-gray-500 tracking-widest uppercase mb-2">{t.summary_label}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t.ai_score, value: `${result.overall_score}%`, color: result.overall_score > 60 ? '#ef4444' : result.overall_score > 35 ? '#eab308' : '#22c55e' },
                    { label: t.confidence, value: result.confidence, color: '#111827' },
                    { label: t.verdict, value: result.verdict, color: '#4f46e5' },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-sm font-semibold" style={{ color: stat.color }}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-gray-500 tracking-widest uppercase mb-3">{t.indicators}</p>
              <div className="flex flex-wrap gap-2">
                {result.key_indicators.map((ind, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700">{ind}</span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 tracking-widest uppercase">{t.breakdown}</p>
                <div className="flex items-center gap-4 text-[10px] text-gray-500">
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
          </motion.div>
        )}

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-4">
          {[
            { icon: Zap, title: t.feat1_title, desc: t.feat1_desc, from: 'from-blue-100', to: 'to-blue-200', color: 'text-blue-600', delay: 0.3 },
            { icon: Sparkles, title: t.feat2_title, desc: t.feat2_desc, from: 'from-indigo-100', to: 'to-indigo-200', color: 'text-indigo-600', delay: 0.4 },
            { icon: Shield, title: t.feat3_title, desc: t.feat3_desc, from: 'from-purple-100', to: 'to-purple-200', color: 'text-purple-600', delay: 0.5 },
          ].map(({ icon: Icon, title, desc, from, to, color, delay }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay }}
              className="bg-white border border-gray-200 rounded-2xl p-8 text-center hover:shadow-xl transition-all group"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${from} ${to} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-8 h-8 ${color}`} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-gray-200 px-6 py-6 mt-16 bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-gray-500">
          <span>VERIDOC · AI Content Forensics</span>
          <span>{t.footer}</span>
        </div>
      </footer>
    </div>
  );
}
