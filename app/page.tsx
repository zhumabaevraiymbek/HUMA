'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Gauge Component ──────────────────────────────────────────────────────────
function ScoreGauge({ score, verdict }: { score: number; verdict: string }) {
  const [displayScore, setDisplayScore] = useState(0);
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;

  // Score color
  const getColor = (s: number) => {
    if (s < 30) return '#22c55e';
    if (s < 55) return '#eab308';
    if (s < 75) return '#f97316';
    return '#ef4444';
  };

  const color = getColor(displayScore);

  useEffect(() => {
    let frame: number;
    let current = 0;
    const target = score;
    const duration = 1500;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      current = Math.round(eased * target);
      setDisplayScore(current);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 220, height: 220 }}>
        {/* Background ring */}
        <svg width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="110" cy="110" r={radius}
            fill="none"
            stroke="#1e1e30"
            strokeWidth="12"
          />
          <circle
            cx="110" cy="110" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.1s ease, stroke 0.3s ease' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display text-6xl font-semibold amber-text-glow"
            style={{ color, lineHeight: 1 }}
          >
            {displayScore}
          </span>
          <span className="text-xs text-gray-500 mt-1 tracking-widest uppercase">% AI</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <span
          className="font-display text-xl italic"
          style={{ color }}
        >
          {verdict}
        </span>
      </div>
    </div>
  );
}

// ─── Paragraph Card ───────────────────────────────────────────────────────────
function ParagraphCard({ para, index }: { para: ParagraphResult; index: number }) {
  const [open, setOpen] = useState(false);

  const flagColor = {
    human: '#22c55e',
    mixed: '#eab308',
    ai: '#ef4444',
  }[para.flag];

  const flagLabel = {
    human: 'HUMAN',
    mixed: 'MIXED',
    ai: 'AI',
  }[para.flag];

  return (
    <div
      className="para-card rounded border border-[#1e1e30] bg-[#0f0f1a] p-4 cursor-pointer"
      onClick={() => setOpen(!open)}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-gray-600 shrink-0 font-mono">P{String(index + 1).padStart(2, '0')}</span>
          <p className="text-sm text-gray-400 truncate">{para.text.slice(0, 80)}…</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Mini bar */}
          <div className="w-20 h-1.5 bg-[#1e1e30] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${para.score}%`, background: flagColor }}
            />
          </div>
          <span className="text-xs font-mono" style={{ color: flagColor, minWidth: 28 }}>
            {para.score}%
          </span>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
            style={{ color: flagColor, borderColor: flagColor + '40', background: flagColor + '10' }}
          >
            {flagLabel}
          </span>
          <span className="text-gray-600 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="mt-4 space-y-3 animate-fade-in-up">
          <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-[#1e1e30] pl-3">
            {para.text}
          </p>
          <p className="text-xs text-gray-500 italic">↳ {para.reasoning}</p>
        </div>
      )}
    </div>
  );
}

// ─── Analysis Steps Loader ────────────────────────────────────────────────────
const STEPS = [
  { key: 'uploading', label: 'Uploading document', sub: 'Transferring file securely' },
  { key: 'extracting', label: 'Extracting text content', sub: 'Parsing .docx structure' },
  { key: 'analyzing', label: 'Running forensic analysis', sub: 'Consulting AI detection model' },
];

function AnalysisLoader({ stage }: { stage: Stage }) {
  const currentIdx = STEPS.findIndex(s => s.key === stage);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Animated rings */}
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
        <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping" />
        <div
          className="absolute rounded-full border border-amber-500/30"
          style={{ inset: 8, animation: 'spin 3s linear infinite' }}
        />
        <div
          className="absolute rounded-full border-t border-amber-500"
          style={{ inset: 16, animation: 'spin 1.5s linear infinite' }}
        />
        <div className="text-amber-400 text-2xl">⬡</div>
      </div>

      {/* Steps */}
      <div className="w-full max-w-xs space-y-4">
        {STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div
                className="mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px]"
                style={{
                  borderColor: done ? '#22c55e' : active ? '#f59e0b' : '#1e1e30',
                  background: done ? '#22c55e15' : active ? '#f59e0b15' : 'transparent',
                  color: done ? '#22c55e' : active ? '#f59e0b' : '#374151',
                }}
              >
                {done ? '✓' : active ? '◉' : '○'}
              </div>
              <div>
                <p
                  className="text-sm"
                  style={{ color: done ? '#6b7280' : active ? '#e2e2f0' : '#374151' }}
                >
                  {step.label}
                  {active && <span className="cursor-blink ml-0.5 text-amber-400">_</span>}
                </p>
                {active && (
                  <p className="text-xs text-gray-600 mt-0.5">{step.sub}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const analyze = useCallback(async (file: File) => {
    setFileName(file.name);
    setError('');
    setResult(null);
    setStage('uploading');

    const formData = new FormData();
    formData.append('file', file);

    try {
      await new Promise(r => setTimeout(r, 600)); // uploading stage
      setStage('extracting');
      await new Promise(r => setTimeout(r, 600)); // extracting stage
      setStage('analyzing');

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data);
      setStage('done');

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setStage('error');
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(docx|doc)$/i)) {
      setError('Please upload a .docx or .doc file');
      setStage('error');
      return;
    }
    analyze(file);
  }, [analyze]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setStage('idle');
    setResult(null);
    setError('');
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isLoading = ['uploading', 'extracting', 'analyzing'].includes(stage);

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-[#1e1e30] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-amber-500/60 rotate-45 flex items-center justify-center">
              <div className="w-2 h-2 bg-amber-500 rotate-[-45deg]" />
            </div>
            <span className="font-display text-xl tracking-[0.15em] text-white">VERIDOC</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-500">SYSTEM ONLINE</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.4em] text-amber-500 mb-4 uppercase">
            Forensic Document Analysis
          </p>
          <h1 className="font-display text-5xl md:text-6xl font-semibold text-white mb-6 leading-tight">
            Detect AI-Generated<br />
            <span className="italic text-amber-400">Content</span>
          </h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
            Upload a Word document. Our forensic engine analyses linguistic patterns,
            structure, and style to determine AI authorship with paragraph-level precision.
          </p>
        </div>

        {/* Upload / Loader Panel */}
        <div className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-8 mb-8 amber-glow">
          {stage === 'idle' || stage === 'error' ? (
            <>
              {/* Drop zone */}
              <div
                className={`rounded border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-200 ${
                  dragActive
                    ? 'border-amber-500 bg-amber-500/5 drop-zone-active'
                    : 'border-[#1e1e30] hover:border-amber-500/40'
                }`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc"
                  className="hidden"
                  onChange={onInputChange}
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border border-[#1e1e30] rounded-lg flex items-center justify-center text-3xl text-gray-600">
                    ⬡
                  </div>
                  <div>
                    <p className="text-white mb-1">Drop your document here</p>
                    <p className="text-gray-600 text-sm">or click to browse — .docx, .doc supported</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-700">
                    <span>✓ Secure analysis</span>
                    <span>✓ No file storage</span>
                    <span>✓ Paragraph-level results</span>
                  </div>
                </div>
              </div>

              {/* Error */}
              {stage === 'error' && (
                <div className="mt-4 rounded border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3 animate-fade-in-up">
                  <span className="text-red-400 shrink-0">⚠</span>
                  <div className="flex-1">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                  <button onClick={reset} className="text-xs text-gray-600 hover:text-white transition-colors">
                    Dismiss
                  </button>
                </div>
              )}
            </>
          ) : isLoading ? (
            <div className="py-8">
              <p className="text-center text-xs text-gray-600 mb-8 tracking-widest uppercase">
                Analysing: <span className="text-amber-500">{fileName}</span>
              </p>
              <AnalysisLoader stage={stage} />
            </div>
          ) : null}
        </div>

        {/* Results */}
        {stage === 'done' && result && (
          <div ref={resultsRef} className="space-y-6 animate-fade-in-up">
            {/* Top bar */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 tracking-widest uppercase mb-1">Analysis Complete</p>
                <p className="text-sm text-gray-400">
                  <span className="text-amber-500">{result.file_name}</span>
                  {' · '}
                  {result.word_count?.toLocaleString() || '—'} words
                  {' · '}
                  {result.total_paragraphs} paragraphs
                  {result.truncated && <span className="text-yellow-600"> · truncated at 40k chars</span>}
                </p>
              </div>
              <button
                onClick={reset}
                className="text-xs text-gray-600 hover:text-amber-400 transition-colors border border-[#1e1e30] hover:border-amber-500/40 px-4 py-2 rounded"
              >
                ← New Analysis
              </button>
            </div>

            {/* Score + Meta grid */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Gauge */}
              <div className="md:col-span-1 rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-6 flex items-center justify-center amber-glow">
                <ScoreGauge score={result.overall_score} verdict={result.verdict} />
              </div>

              {/* Details */}
              <div className="md:col-span-2 space-y-4">
                {/* Summary */}
                <div className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-5">
                  <p className="text-xs text-gray-600 tracking-widest uppercase mb-2">Summary</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'AI Score', value: `${result.overall_score}%`, color: result.overall_score > 60 ? '#ef4444' : result.overall_score > 35 ? '#eab308' : '#22c55e' },
                    { label: 'Confidence', value: result.confidence, color: '#e2e2f0' },
                    { label: 'Verdict', value: result.verdict, color: '#f59e0b' },
                  ].map(stat => (
                    <div key={stat.label} className="rounded border border-[#1e1e30] bg-[#0f0f1a] p-3 text-center">
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-sm font-semibold" style={{ color: stat.color }}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Indicators */}
            <div className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-5">
              <p className="text-xs text-gray-600 tracking-widest uppercase mb-3">Key Indicators Detected</p>
              <div className="flex flex-wrap gap-2">
                {result.key_indicators.map((indicator, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1.5 rounded border border-amber-500/20 bg-amber-500/5 text-amber-300"
                  >
                    {indicator}
                  </span>
                ))}
              </div>
            </div>

            {/* Paragraph Analysis */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-600 tracking-widest uppercase">
                  Paragraph Breakdown
                </p>
                <div className="flex items-center gap-4 text-[10px] text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Human</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Mixed</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> AI</span>
                </div>
              </div>
              <div className="space-y-2">
                {result.paragraphs.map((para, i) => (
                  <ParagraphCard key={i} para={para} index={i} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e1e30] px-6 py-6 mt-16">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-gray-700">
          <span>VERIDOC · AI Content Forensics</span>
          <span>Powered by Claude · No data retained</span>
        </div>
      </footer>
    </div>
  );
}
