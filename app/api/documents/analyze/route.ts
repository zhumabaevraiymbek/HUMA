import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;
export const runtime = 'nodejs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf')) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse = await import('pdf-parse') as any;
  const data = await pdfParse.default(buffer);
  return data.text;
}

  if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error('Неподдерживаемый формат файла. Только .docx, .doc, .pdf');
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 60);
}

// Fingerprinting — разбиваем на шинглы и хешируем
async function generateFingerprints(text: string, documentId: string, universityId: string) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const shingleSize = 8;
  const fingerprints = [];

  for (let i = 0; i <= words.length - shingleSize; i += 3) {
    const shingle = words.slice(i, i + shingleSize).join(' ');
    const encoder = new TextEncoder();
    const data = encoder.encode(shingle);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

    fingerprints.push({
      document_id: documentId,
      university_id: universityId,
      hash,
      fragment: shingle,
      position: i,
    });
  }

  return fingerprints;
}

// Поиск совпадений в базе
async function findPlagiarismMatches(text: string, documentId: string, universityId: string) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const shingleSize = 8;
  const hashes: string[] = [];

  for (let i = 0; i <= words.length - shingleSize; i += 3) {
    const shingle = words.slice(i, i + shingleSize).join(' ');
    const encoder = new TextEncoder();
    const data = encoder.encode(shingle);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    hashes.push(hash);
  }

  if (hashes.length === 0) return { score: 0, matches: [] };

  // Ищем совпадения (исключаем текущий документ)
  const { data: matches } = await supabaseAdmin
    .from('fingerprints')
    .select('document_id, hash, fragment')
    .in('hash', hashes.slice(0, 500))
    .neq('document_id', documentId);

  if (!matches || matches.length === 0) return { score: 0, matches: [] };

  // Считаем уникальные совпавшие документы
  const matchedDocs = new Map<string, number>();
  for (const m of matches) {
    matchedDocs.set(m.document_id, (matchedDocs.get(m.document_id) || 0) + 1);
  }

  const plagiarismScore = Math.min(100, Math.round((matches.length / hashes.length) * 100));

  const topMatches = Array.from(matchedDocs.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([docId, count]) => ({
      matched_document_id: docId,
      match_type: 'internal' as const,
      similarity_score: Math.min(100, Math.round((count / hashes.length) * 100)),
      matched_fragment: matches.find(m => m.document_id === docId)?.fragment || '',
      source_fragment: '',
    }));

  return { score: plagiarismScore, matches: topMatches };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const lang = (formData.get('lang') as string) || 'ru';
    const title = (formData.get('title') as string) || 'Без названия';
    const studentName = (formData.get('studentName') as string) || '';
    const courseId = (formData.get('courseId') as string) || null;
    const universityId = formData.get('universityId') as string;
    const filePath = formData.get('filePath') as string;
    const uploadedBy = formData.get('uploadedBy') as string;

    if (!file) return NextResponse.json({ error: 'Файл не загружен' }, { status: 400 });
    if (!universityId) return NextResponse.json({ error: 'Не указан университет' }, { status: 400 });

    // Проверяем формат
    const allowed = /\.(docx|doc|pdf)$/i;
    if (!allowed.test(file.name)) {
      return NextResponse.json({ error: 'Только .docx, .doc или .pdf файлы' }, { status: 400 });
    }

    // Извлекаем текст
    let rawText: string;
    try {
      rawText = await extractText(file);
    } catch (e: unknown) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Ошибка парсинга' }, { status: 422 });
    }

    if (rawText.trim().length < 100) {
      return NextResponse.json({ error: 'Документ слишком короткий' }, { status: 422 });
    }

    const maxChars = 40000;
    const truncated = rawText.length > maxChars;
    const textToAnalyze = truncated ? rawText.slice(0, maxChars) : rawText;
    const paragraphs = splitIntoParagraphs(textToAnalyze);
    const wordCount = rawText.split(/\s+/).length;

    // Создаём запись в БД со статусом processing
    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        university_id: universityId,
        uploaded_by: uploadedBy,
        course_id: courseId || null,
        title: studentName ? `${title} — ${studentName}` : title,
        file_name: file.name,
        file_path: filePath,
        raw_text: rawText,
        word_count: wordCount,
        status: 'processing',
      })
      .select()
      .single();

    if (docError) return NextResponse.json({ error: docError.message }, { status: 500 });

    // Fingerprinting
    const fingerprints = await generateFingerprints(rawText, doc.id, universityId);
    if (fingerprints.length > 0) {
      await supabaseAdmin.from('fingerprints').insert(fingerprints);
    }

    // Поиск плагиата в базе
    const { score: plagiarismScore, matches: plagiarismMatches } = await findPlagiarismMatches(rawText, doc.id, universityId);

    // Сохраняем совпадения
    if (plagiarismMatches.length > 0) {
      await supabaseAdmin.from('plagiarism_matches').insert(
        plagiarismMatches.map(m => ({ ...m, document_id: doc.id }))
      );
    }

    // AI анализ через Claude
    const langInstructions: Record<string, string> = {
      ru: 'Отвечай на русском. Verdict: "Скорее всего человек" / "Вероятно человек" / "Смешанный" / "Вероятно ИИ" / "Скорее всего ИИ". Confidence: "Низкая" / "Средняя" / "Высокая".',
      en: 'Respond in English.',
      kk: 'Қазақ тілінде жауап бер.',
    };

    const prompt = `You are an expert forensic linguist. Analyze this text for AI-generated content.

${langInstructions[lang] || langInstructions.ru}

TEXT:
---
${textToAnalyze}
---

PARAGRAPHS:
${paragraphs.map((p, i) => `[${i}] ${p}`).join('\n\n')}

Respond ONLY with valid JSON:
{
  "overall_score": <0-100>,
  "verdict": "<string>",
  "confidence": "<string>",
  "summary": "<2-3 sentences>",
  "key_indicators": [<3-6 strings>],
  "paragraphs": [{"index": <int>, "score": <0-100>, "flag": "<human|mixed|ai>", "reasoning": "<string>"}]
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Не удалось разобрать ответ AI');

    const analysis = JSON.parse(jsonMatch[0]);
    const paragraphsWithText = analysis.paragraphs.map((p: { index: number; score: number; flag: string; reasoning: string }) => ({
      ...p,
      text: paragraphs[p.index] || '',
    }));

    // Обновляем документ с результатами
    await supabaseAdmin
      .from('documents')
      .update({
        ai_score: analysis.overall_score,
        ai_verdict: analysis.verdict,
        ai_summary: analysis.summary,
        plagiarism_score: plagiarismScore,
        status: 'done',
      })
      .eq('id', doc.id);

    return NextResponse.json({
      documentId: doc.id,
      overall_score: analysis.overall_score,
      verdict: analysis.verdict,
      confidence: analysis.confidence,
      summary: analysis.summary,
      key_indicators: analysis.key_indicators,
      paragraphs: paragraphsWithText,
      plagiarism_score: plagiarismScore,
      plagiarism_matches: plagiarismMatches.length,
      word_count: wordCount,
      truncated,
      total_paragraphs: paragraphs.length,
      file_name: file.name,
    });

  } catch (error: unknown) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Неизвестная ошибка' },
      { status: 500 }
    );
  }
}
