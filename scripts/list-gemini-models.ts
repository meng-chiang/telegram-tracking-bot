import 'dotenv/config';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  const data = await res.json() as { models: Array<{ name: string; displayName: string; supportedGenerationMethods: string[] }> };

  const chatModels = data.models.filter((m) =>
    m.supportedGenerationMethods?.includes('generateContent')
  );

  console.log(`\n✅ Models supporting generateContent (${chatModels.length} total):\n`);
  for (const m of chatModels) {
    console.log(`  ${m.name.replace('models/', '')}  —  ${m.displayName}`);
  }
}

main().catch(console.error);
