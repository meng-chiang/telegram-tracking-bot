import * as grok from './providers/grok';
import * as gemini from './providers/gemini';

const AI_PROVIDER = (process.env.AI_PROVIDER ?? 'grok').toLowerCase();

const PROVIDERS: Record<string, typeof grok> = {
  grok,
  gemini,
};

const provider = (() => {
  const p = PROVIDERS[AI_PROVIDER];
  if (!p) throw new Error(`Unknown AI_PROVIDER: "${AI_PROVIDER}". Valid options: grok, gemini`);
  return p;
})();

const TAG = `[${AI_PROVIDER.charAt(0).toUpperCase() + AI_PROVIDER.slice(1)}]`;

const PROMPT = (label: string) => {
  const today = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei',
  });
  return `今天日期：${today}

請根據你最新的知識（如有網路搜尋能力請優先使用），提供以下追蹤項目的最新概況、趨勢或重要動態：

追蹤項目：${label}

請以繁體中文回答，格式要求：
- 簡潔扼要（200字以內）
- 包含最近重要發展，需注意今天日期，若資訊已過時請明確說明
- 如有具體數字或事件，請列出

請直接回答，不需要前言。`;
};

export function getLatestModel(): string {
  return provider.getModelName();
}

export async function queryItem(label: string): Promise<string> {
  console.log(`${TAG} Querying: "${label}"`);
  const startTime = Date.now();
  const result = await provider.query(PROMPT(label));
  console.log(`${TAG} Done in ${Date.now() - startTime}ms`);
  return result;
}
