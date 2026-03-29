import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

const DEFAULT_MODEL = 'grok-4-0709';
const SEARCH_MODEL = 'grok-4-1-fast-non-reasoning';
const LIVE_SEARCH = process.env.GROK_LIVE_SEARCH !== 'false';

interface ResponsesAPIResult {
  output: Array<{
    type: string;
    content?: Array<{ type: string; text?: string }>;
  }>;
}

const RETRY_DELAYS = [3000, 6000]; // retry twice on 5xx: after 3s then 6s

async function queryWithSearch(prompt: string): Promise<string> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS[attempt - 1];
      console.warn(`[Grok] Live search attempt ${attempt + 1}, retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }

    const res = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: SEARCH_MODEL,
        input: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search' }],
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as ResponsesAPIResult;
      const text = data.output
        ?.flatMap((o) => o.content ?? [])
        .find((c) => c.type === 'output_text')?.text;
      return text ?? '查詢失敗，請稍後再試。';
    }

    // 5xx: retry; 4xx: fail immediately with clean message
    const isServerError = res.status >= 500;
    lastError = new Error(`Responses API ${res.status} ${res.statusText}`);
    console.warn(`[Grok] ${lastError.message}`);

    if (!isServerError) break;
  }

  throw lastError;
}

async function fetchLatestModel(): Promise<string> {
  const models = await client.models.list();
  const EXCLUDE = ['image', 'video', 'imagine'];
  const grokModels = models.data
    .filter((m) => m.id.startsWith('grok') && !EXCLUDE.some((kw) => m.id.includes(kw)))
    .sort((a, b) => b.created - a.created);
  return grokModels[0]?.id ?? 'grok-3';
}

export function getModelName(): string {
  return LIVE_SEARCH ? `${SEARCH_MODEL} + live search` : DEFAULT_MODEL;
}

async function callModel(model: string, prompt: string): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.choices[0]?.message?.content ?? '查詢失敗，請稍後再試。';
}

export async function query(prompt: string): Promise<string> {
  if (LIVE_SEARCH) {
    return queryWithSearch(prompt);
  }

  try {
    return await callModel(DEFAULT_MODEL, prompt);
  } catch (err: unknown) {
    // Only fall back on model-not-found (404); re-throw all other errors
    if (!(err instanceof OpenAI.APIError && err.status === 404)) throw err;

    console.warn(`[Grok] ${DEFAULT_MODEL} not found, fetching fallback model...`);
    const fallbackModel = await fetchLatestModel();
    console.log(`[Grok] Falling back to: ${fallbackModel}`);
    return await callModel(fallbackModel, prompt);
  }
}
