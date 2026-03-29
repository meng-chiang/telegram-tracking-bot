import 'dotenv/config';
import { createBot } from './bot';
import { startScheduler } from './scheduler';
import { getLatestModel } from './claude';

const { TELEGRAM_BOT_TOKEN, AI_PROVIDER = 'grok', XAI_API_KEY, GEMINI_API_KEY } = process.env;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('[Error] Missing TELEGRAM_BOT_TOKEN in environment.');
  process.exit(1);
}

if (AI_PROVIDER === 'gemini' && !GEMINI_API_KEY) {
  console.error('[Error] AI_PROVIDER=gemini requires GEMINI_API_KEY in environment.');
  process.exit(1);
}

if (AI_PROVIDER === 'grok' && !XAI_API_KEY) {
  console.error('[Error] AI_PROVIDER=grok requires XAI_API_KEY in environment.');
  process.exit(1);
}

console.log(`[AI] Provider: ${AI_PROVIDER}, Model: ${getLatestModel()}`);

const bot = createBot(TELEGRAM_BOT_TOKEN);

startScheduler(bot);

bot
  .launch()
  .then(() => {
    console.log('[Bot] Telegram bot is running.');
  })
  .catch((err: Error) => {
    if (err.name === 'TimeoutError') return; // Telegraf polling timeout, non-fatal
    console.error('[Bot] Fatal error:', err);
    process.exit(1);
  });

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
