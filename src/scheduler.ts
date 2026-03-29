import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { itemsDb, usersDb } from './db';
import { queryItem } from './claude';

const DIVIDER = '─'.repeat(30);

async function runDailyQuery(bot: Telegraf): Promise<void> {
  console.log('[Scheduler] Starting daily query job...');

  const items = itemsDb.getAll();
  const chatIds = usersDb.getAll();

  if (items.length === 0) {
    console.log('[Scheduler] No tracking items, skipping.');
    return;
  }
  if (chatIds.length === 0) {
    console.log('[Scheduler] No registered users, skipping.');
    return;
  }

  const date = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const header = `🌅 每日追蹤報告 — ${date}\n${DIVIDER}`;

  const results: string[] = [];
  for (const item of items) {
    try {
      console.log(`[Scheduler] Querying item #${item.id}: ${item.label}`);
      const result = await queryItem(item.label);
      itemsDb.updateResult(item.id, result);
      results.push(`📋 #${item.id} ${item.label}\n\n${result}`);
    } catch (err) {
      console.error(`[Scheduler] Failed to query item #${item.id}:`, err);
      results.push(`❌ #${item.id} ${item.label}\n查詢失敗：${(err as Error).message}`);
    }
  }

  await Promise.all(
    chatIds.map(async (chatId) => {
      try {
        await bot.telegram.sendMessage(chatId, header);
        for (const r of results) {
          await bot.telegram.sendMessage(chatId, r);
        }
      } catch (err) {
        console.error(`[Scheduler] Failed to send to chat ${chatId}:`, err);
      }
    })
  );

  console.log('[Scheduler] Daily query job completed.');
}

export function startScheduler(bot: Telegraf): void {
  // Run at 09:00 every day, Asia/Taipei timezone
  cron.schedule(
    '0 9 * * *',
    () => {
      runDailyQuery(bot).catch((err) => {
        console.error('[Scheduler] Unhandled error in daily job:', err);
      });
    },
    { timezone: 'Asia/Taipei' }
  );

  console.log('[Scheduler] Daily job scheduled at 09:00 Asia/Taipei.');
}
