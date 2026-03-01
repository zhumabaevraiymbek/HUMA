'use client';

import { useLanguage, type Lang } from '@/contexts/LanguageContext';

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-1 border border-border rounded p-1">
      {(['ru', 'en', 'kk'] as Lang[]).map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className="px-2 py-1 text-xs rounded transition-all uppercase"
          style={{
            background: lang === code ? 'var(--color-accent, #f59e0b)' : 'transparent',
            color: lang === code ? 'var(--color-text, #111827)' : 'var(--color-muted, #6b7280)',
            fontWeight: lang === code ? 600 : 400,
          }}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
