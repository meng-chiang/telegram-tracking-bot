import { Telegraf } from 'telegraf';
import { itemsDb, usersDb } from './db';
import { queryItem } from './claude';

export function createBot(token: string): Telegraf {
  const bot = new Telegraf(token);

  bot.use((ctx, next) => {
    if (ctx.chat) {
      usersDb.register(ctx.chat.id);
    }
    return next();
  });

  bot.command('start', (ctx) => {
    ctx.reply(
      '歡迎使用每日追蹤 Bot！\n\n' +
        '我會在每天 09:00 自動以 Claude AI 查詢你設定的追蹤項目並回報結果。\n\n' +
        '可用指令：\n' +
        '/add [描述] — 新增追蹤項目\n' +
        '/list — 列出所有追蹤項目\n' +
        '/delete [ID] — 刪除項目\n' +
        '/edit [ID] [新描述] — 更新項目\n' +
        '/query [ID] — 立即查詢單一項目\n' +
        '/queryall — 立即查詢所有項目\n' +
        '/help — 顯示此說明'
    );
  });

  bot.command('help', (ctx) => {
    ctx.reply(
      '指令說明：\n\n' +
        '/add [描述] — 新增追蹤項目\n' +
        '/list — 列出所有追蹤項目（含 ID）\n' +
        '/delete [ID] — 刪除項目\n' +
        '/edit [ID] [新描述] — 更新項目描述\n' +
        '/query [ID] — 立即以 Claude 查詢單一項目\n' +
        '/queryall — 立即查詢所有項目（每日 09:00 自動執行）'
    );
  });

  bot.command('add', (ctx) => {
    const label = ctx.message.text.replace(/^\/add(@\S+)?/, '').trim();
    if (!label) {
      return ctx.reply('請提供追蹤項目描述，例如：\n/add 台積電股價走勢');
    }
    const item = itemsDb.create(label);
    ctx.reply(`✅ 已新增追蹤項目 #${item.id}：${item.label}`);
  });

  bot.command('list', (ctx) => {
    const items = itemsDb.getAll();
    if (items.length === 0) {
      return ctx.reply('目前沒有追蹤項目。使用 /add [描述] 新增。');
    }
    const lines = items.map((item) => {
      const queriedAt = item.last_queried_at
        ? `（最後查詢：${item.last_queried_at.slice(0, 10)}）`
        : '（尚未查詢）';
      return `#${item.id} ${item.label} ${queriedAt}`;
    });
    ctx.reply('追蹤項目列表：\n\n' + lines.join('\n'));
  });

  bot.command('delete', (ctx) => {
    const idStr = ctx.message.text.replace(/^\/delete(@\S+)?/, '').trim();
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return ctx.reply('請提供有效的項目 ID，例如：/delete 1');
    }
    const item = itemsDb.getById(id);
    if (!item) {
      return ctx.reply(`找不到 ID #${id} 的項目。`);
    }
    itemsDb.delete(id);
    ctx.reply(`🗑️ 已刪除項目 #${id}：${item.label}`);
  });

  bot.command('edit', (ctx) => {
    const args = ctx.message.text.replace(/^\/edit(@\S+)?/, '').trim();
    const spaceIdx = args.indexOf(' ');
    if (spaceIdx === -1) {
      return ctx.reply('格式：/edit [ID] [新描述]\n例如：/edit 1 新的追蹤描述');
    }
    const id = parseInt(args.slice(0, spaceIdx), 10);
    const newLabel = args.slice(spaceIdx + 1).trim();
    if (isNaN(id) || !newLabel) {
      return ctx.reply('格式：/edit [ID] [新描述]\n例如：/edit 1 新的追蹤描述');
    }
    const item = itemsDb.getById(id);
    if (!item) {
      return ctx.reply(`找不到 ID #${id} 的項目。`);
    }
    itemsDb.update(id, newLabel);
    ctx.reply(`✏️ 已更新項目 #${id}：${newLabel}`);
  });

  bot.command('query', async (ctx) => {
    const idStr = ctx.message.text.replace(/^\/query(@\S+)?/, '').trim();
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return ctx.reply('請提供有效的項目 ID，例如：/query 1');
    }
    const item = itemsDb.getById(id);
    if (!item) {
      return ctx.reply(`找不到 ID #${id} 的項目。`);
    }
    ctx.reply(`🔍 正在查詢「${item.label}」，請稍候...`);

    // Fire-and-forget: return handler immediately to avoid Telegraf timeout
    ;(async () => {
      try {
        const result = await queryItem(item.label);
        itemsDb.updateResult(id, result);
        await ctx.reply(`📋 #${id} ${item.label}\n\n${result}`);
      } catch (err) {
        await ctx.reply(`❌ 查詢失敗：${(err as Error).message}`);
      }
    })().catch(console.error);
  });

  bot.command('queryall', async (ctx) => {
    const items = itemsDb.getAll();
    if (items.length === 0) {
      return ctx.reply('目前沒有追蹤項目。使用 /add [描述] 新增。');
    }
    ctx.reply(`🔍 開始查詢 ${items.length} 個項目，請稍候...`);

    // Fire-and-forget: sequential queries to maintain order and avoid rate limits
    ;(async () => {
      for (const item of items) {
        try {
          const result = await queryItem(item.label);
          itemsDb.updateResult(item.id, result);
          await ctx.reply(`📋 #${item.id} ${item.label}\n\n${result}`);
        } catch (err) {
          await ctx.reply(`❌ #${item.id} 查詢失敗：${(err as Error).message}`);
        }
      }
      await ctx.reply('✅ 所有項目查詢完成。');
    })().catch(console.error);
  });

  return bot;
}
