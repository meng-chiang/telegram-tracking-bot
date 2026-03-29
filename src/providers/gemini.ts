import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';

export function getModelName(): string {
  return DEFAULT_MODEL;
}

export async function query(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 512 },
  });
  return result.response.text();
}
