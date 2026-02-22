# VERIDOC — AI Content Detector

A forensic document analysis tool that detects AI-generated content in Word documents, with paragraph-level scoring and confidence analysis.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **AI Engine**: Claude claude-opus-4-6 via Anthropic API
- **Doc Parsing**: Mammoth.js (.docx → plain text)
- **Styling**: Tailwind CSS + custom CSS animations

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set your Anthropic API key

Create a `.env.local` file in the root directory:

```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get your API key at: https://console.anthropic.com

### 3. Run the development server

```bash
npm run dev
```

Open http://localhost:3000

---

## How It Works

1. **Upload** — User uploads a `.docx` or `.doc` file via drag & drop or file picker
2. **Extract** — Mammoth.js extracts raw text from the Word document server-side
3. **Analyze** — Text is sent to Claude with a forensic linguistics prompt that evaluates:
   - Sentence structure uniformity
   - Transitional phrase patterns
   - Hedge language usage
   - Lack of personal voice / anecdotes
   - Grammar perfection
   - Semantic repetition
4. **Score** — Claude returns a structured JSON with:
   - `overall_score` (0–100% AI-generated)
   - `verdict` (Likely Human → Likely AI)
   - `confidence` (Low / Medium / High)
   - Per-paragraph scores with flag (human / mixed / ai)
   - Key indicators detected
   - Human-readable summary

---

## API

### `POST /api/analyze`

**Request**: `multipart/form-data` with a `file` field (.docx or .doc)

**Response**:
```json
{
  "overall_score": 72,
  "verdict": "Probably AI",
  "confidence": "High",
  "word_count": 1240,
  "summary": "The document exhibits...",
  "key_indicators": ["Overuse of transitional phrases", "..."],
  "paragraphs": [
    {
      "index": 0,
      "score": 85,
      "flag": "ai",
      "reasoning": "Highly structured with...",
      "text": "Original paragraph text..."
    }
  ],
  "truncated": false,
  "total_paragraphs": 14,
  "file_name": "essay.docx"
}
```

---

## Limitations

- Maximum ~40,000 characters analyzed (truncated if longer)
- Requires valid `.docx` or `.doc` files
- AI detection is probabilistic — results are a strong indicator, not a definitive proof
- Works best on longer documents (500+ words)

---

## Production Deployment

Deploy to Vercel in one command:

```bash
npx vercel
```

Add `ANTHROPIC_API_KEY` in your Vercel project environment variables.
