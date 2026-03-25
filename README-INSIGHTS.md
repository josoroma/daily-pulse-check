# Insights — AI-Powered Analysis

The **Insights** page (`/dashboard/insights`) provides AI-generated market intelligence, personalized portfolio analysis, and an educational finance assistant. It works with both **OpenAI** cloud models and **Ollama** local models, configured per user in **Settings**.

---

## Why Insights Is Useful

Instead of checking multiple financial sites, Insights consolidates everything into one dashboard:

- **Real-time market context** — live prices for VOO, QQQ, Bitcoin, macro indicators, and sentiment data are fetched on demand and fed to the AI model as structured context.
- **Personalized analysis** — the AI receives your actual portfolio positions, allocation, P&L, risk tolerance, and country so recommendations are specific to you.
- **Privacy-first option** — Ollama runs entirely on your machine. Your financial data never leaves your computer.
- **Chain-of-thought transparency** — reasoning models (e.g. `qwen3.5:27b`, `o4-mini`) show their thinking process in a collapsible panel, so you can evaluate _how_ the AI reached its conclusions.

---

## Tabs Overview

### 1. Market Summary

**Component**: `_components/market-summary-card.tsx`  
**API Route**: `POST /api/ai/summary`  
**Prompt Template**: `lib/ai/market-summary.ts`

Generates a concise daily market briefing covering:

1. S&P 500 (VOO) and Nasdaq (QQQ) trends
2. Bitcoin price action
3. Crypto Fear & Greed sentiment
4. Key macro indicators (Fed Funds Rate, 10-Year Treasury, Unemployment, DXY, Inflation)
5. One actionable takeaway for a long-term DCA investor

**How it works:**

- The API route fetches live data from Twelve Data (stocks), CoinGecko (crypto), Alternative.me (sentiment), and FRED (macro).
- All data points are assembled into a structured prompt via `buildMarketSummaryPrompt()`.
- The prompt is streamed to the user's configured AI model.
- Previously generated summaries are cached in the `ai_summaries` table (one per user per day).
- Click **Refresh** to regenerate the summary with fresh market data.

### 2. Portfolio Analysis

**Component**: `_components/portfolio-analysis.tsx`  
**API Route**: `POST /api/ai/portfolio`  
**Prompt Template**: `lib/ai/portfolio-analysis.ts`

An interactive chat that analyzes your actual portfolio. On first load it auto-sends:

> _"Analyze my portfolio. What are the key risks, opportunities, and rebalancing actions I should consider?"_

The AI receives:

- Every position with symbol, quantity, average buy price, current price, unrealized P&L
- Current allocation percentages vs. your target allocations
- Total portfolio value
- Your risk tolerance, country, and base currency

You can ask follow-up questions like _"Should I increase my Bitcoin allocation?"_ or _"What happens if the Fed raises rates?"_ — the full conversation history is sent with each request.

### 3. Learn

**Component**: `_components/learning-chat.tsx`  
**API Route**: `POST /api/ai/learn`  
**Prompt Template**: `lib/ai/learning-assistant.ts`

An educational finance chatbot. It answers questions about investing concepts, market mechanics, and financial strategies in plain language.

- **Starter questions** are provided: _"What is DCA?"_, _"How do ETFs work?"_, _"Explain Bitcoin halving"_, etc.
- **Topic filtering**: Only financial topics are accepted. Non-financial questions receive a polite redirect. The filter checks against ~70 financial keywords.
- **Context-aware**: Knows your country and base currency, so it can explain currency impacts, tax implications, etc.

---

## Streaming Protocol

All three API routes use the same **NDJSON** (Newline-Delimited JSON) streaming protocol:

```
Content-Type: application/x-ndjson; charset=utf-8
```

Each line is a JSON object with one of three event types:

```json
{"type": "reasoning", "text": "Let me analyze the current..."}
{"type": "text", "text": "The S&P 500 continued its..."}
{"type": "error", "text": "Connection to model failed"}
```

- **`reasoning`** — Chain-of-thought tokens from reasoning models. Displayed in a collapsible "Thinking" panel with character count.
- **`text`** — The actual response content. Streamed incrementally into the UI.
- **`error`** — Error messages surfaced inline.

The client components parse this stream using a `ReadableStream` reader, splitting on newlines and `JSON.parse`-ing each line.

---

## Chain of Thought

When using a reasoning model (`qwen3.5:27b` or `o4-mini`), the AI generates internal reasoning before producing its response. This is exposed via `reasoning-delta` events from the Vercel AI SDK's `fullStream` iterator.

Each component shows a toggleable section:

- **Brain icon** with "Thinking…" animation during reasoning
- **Collapsible panel** showing the raw reasoning text
- **Character count** (reasoning can be 2,000–10,000+ chars)

Non-reasoning models (e.g. `gpt-4.1-mini`, `llama3.1:8b`) skip this — no reasoning section appears.

---

## AI Provider Setup

### OpenAI (Cloud)

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Add to `.env.local`:

```env
OPENAI_API_KEY=sk-...
```

3. Go to **Settings → AI Model** and select:
   - **Provider**: OpenAI
   - **Model**: `gpt-4.1-nano`, `gpt-4.1-mini`, `gpt-4.1`, or `o4-mini`

### Ollama (Local)

1. Install Ollama from [ollama.com](https://ollama.com)
2. Pull a model:

```bash
ollama pull qwen3.5:27b    # 17GB — reasoning model, best quality
ollama pull llama3.1:8b     # 4.7GB — lighter, no reasoning
ollama pull mistral          # 4.1GB — lightweight alternative
```

3. Ensure Ollama is running (`ollama serve` or the macOS app)
4. Optionally set a custom base URL in `.env.local`:

```env
OLLAMA_BASE_URL=http://localhost:11434
```

5. Go to **Settings → AI Model** and select:
   - **Provider**: Ollama (Local)
   - **Model**: `qwen3.5:27b`, `llama3.1:8b`, or `mistral`

### Settings Tabs

The Settings page (`/dashboard/settings`) has three tabs:

| Tab             | Purpose                                                        |
| --------------- | -------------------------------------------------------------- |
| **Profile**     | Display name, base currency, country, risk tolerance           |
| **AI Model**    | Provider and model selection with Ollama health check          |
| **Diagnostics** | Tests Ollama connectivity, Supabase DB, and AI model streaming |

The **Diagnostics** panel runs three tests in sequence:

1. **Ollama Server** — Pings `/api/ai/health` (only when provider is Ollama)
2. **Supabase Database** — Calls `/api/db/test` to verify DB connectivity
3. **AI Model** — Sends a test prompt to `/api/ai/test` and streams the response

---

## Provider Architecture

```
lib/ai/provider.ts
```

The provider module abstracts model creation behind a unified `getLanguageModel(provider, model)` function:

- **OpenAI** → Uses `@ai-sdk/openai`'s `createOpenAI` with the `OPENAI_API_KEY` env var.
- **Ollama** → Uses `@ai-sdk/openai-compatible`'s `createOpenAICompatible` pointed at Ollama's OpenAI-compatible `/v1` endpoint.

A custom `ollamaFetch` wrapper strips `max_tokens` from all Ollama requests. Reasoning models allocate their token budget to thinking first — a low cap causes all tokens to go to reasoning with empty content. Since local models cost nothing per token, the cap is removed entirely.

**Model registry:**

| Provider | Models                                               | Reasoning          |
| -------- | ---------------------------------------------------- | ------------------ |
| OpenAI   | `gpt-4.1-nano`, `gpt-4.1-mini`, `gpt-4.1`, `o4-mini` | `o4-mini` only     |
| Ollama   | `qwen3.5:27b`, `llama3.1:8b`, `mistral`              | `qwen3.5:27b` only |

---

## Database Tables

### `profiles`

Stores user preferences including AI configuration. Created in the initial migration.

| Column           | Type        | Default          | Purpose                     |
| ---------------- | ----------- | ---------------- | --------------------------- |
| `id`             | uuid (PK)   | —                | References `auth.users(id)` |
| `display_name`   | text        | null             | User display name           |
| `base_currency`  | text        | `'USD'`          | Preferred currency          |
| `country`        | text        | `''`             | User's country code         |
| `risk_tolerance` | text        | `'moderate'`     | Investment risk profile     |
| `ai_provider`    | text        | `'openai'`       | `'openai'` or `'ollama'`    |
| `ai_model`       | text        | `'gpt-4.1-mini'` | Model identifier            |
| `created_at`     | timestamptz | `now()`          | —                           |
| `updated_at`     | timestamptz | `now()`          | —                           |

**RLS**: Users can only read/update their own profile.

### `ai_summaries`

Caches daily AI-generated market summaries per user.

| Column         | Type        | Default             | Purpose                      |
| -------------- | ----------- | ------------------- | ---------------------------- |
| `id`           | uuid (PK)   | `gen_random_uuid()` | —                            |
| `user_id`      | uuid (FK)   | —                   | References `auth.users(id)`  |
| `summary_date` | date        | `current_date`      | One summary per user per day |
| `content`      | text        | —                   | The generated summary text   |
| `model_used`   | text        | —                   | Which model produced it      |
| `created_at`   | timestamptz | `now()`             | —                            |

**Unique constraint**: `(user_id, summary_date)` — prevents duplicate summaries for the same day.

**RLS**: Full CRUD scoped to `auth.uid() = user_id`.

### `portfolios`

Referenced by the portfolio analysis route to load positions and target allocations.

| Column               | Type      | Purpose             |
| -------------------- | --------- | ------------------- |
| `id`                 | uuid (PK) | —                   |
| `user_id`            | uuid (FK) | Owner               |
| `target_allocations` | jsonb     | Target % per symbol |

### `positions`

Individual investment positions loaded for portfolio analysis context.

| Column              | Type      | Purpose                       |
| ------------------- | --------- | ----------------------------- |
| `symbol`            | text      | Ticker symbol (VOO, QQQ, BTC) |
| `asset_type`        | text      | `'ETF'`, `'Crypto'`, etc.     |
| `quantity`          | numeric   | Number of units held          |
| `average_buy_price` | numeric   | Cost basis per unit           |
| `portfolio_id`      | uuid (FK) | Parent portfolio              |

---

## File Map

```
app/dashboard/insights/
├── page.tsx                              # Server Component — loads cached summary + AI config
├── _actions.ts                           # getTodaySummary(), getUserAiConfig()
└── _components/
    ├── ai-disclaimer.tsx                 # "Not financial advice" banner
    ├── market-summary-card.tsx           # Market Summary tab (streaming)
    ├── portfolio-analysis.tsx            # Portfolio Analysis tab (chat)
    └── learning-chat.tsx                 # Learn tab (chat with topic filtering)

app/api/ai/
├── summary/route.ts                      # POST — streams market summary
├── portfolio/route.ts                    # POST — streams portfolio analysis
├── learn/route.ts                        # POST — streams learning responses
├── health/route.ts                       # GET — Ollama connectivity check
└── test/route.ts                         # POST — diagnostics test endpoint

app/dashboard/settings/
├── page.tsx                              # Settings with Profile/AI Model/Diagnostics tabs
├── _actions.ts                           # updateAiModel(), getAiPreferences()
├── _schema.ts                            # AiModelSchema (Zod validation)
└── _components/
    ├── ai-model-card.tsx                 # Provider + model selector with Ollama health
    └── diagnostics-panel.tsx             # Connectivity test runner

lib/ai/
├── provider.ts                           # Model registry, getLanguageModel(), ollamaFetch
├── market-summary.ts                     # buildMarketSummaryPrompt()
├── portfolio-analysis.ts                 # buildPortfolioAnalysisSystem()
└── learning-assistant.ts                 # buildLearningSystemPrompt(), isFinancialTopic()

lib/market/
├── stocks.ts                             # Twelve Data — fetchPrice()
├── crypto.ts                             # CoinGecko — fetchBitcoinPrice()
├── sentiment.ts                          # Alternative.me — fetchCryptoFearGreed()
└── macro.ts                              # FRED — fetchLatestIndicator(), fetchDXY(), fetchInflationRate()
```

---

## Data Flow

```
User clicks "Refresh" or sends a message
        │
        ▼
  Client Component
  (fetch → ReadableStream reader → parse NDJSON lines)
        │
        ▼
  API Route (e.g. /api/ai/summary)
  ├── Auth check (Supabase)
  ├── Load user profile (provider, model)
  ├── Gather context (market data / portfolio / user prefs)
  ├── Build prompt (lib/ai/<template>.ts)
  └── streamText() → fullStream iterator
        │
        ├── reasoning-delta → { type: 'reasoning', text }
        └── text-delta      → { type: 'text', text }
        │
        ▼
  NDJSON Response stream → Client parses and renders in real time
```
