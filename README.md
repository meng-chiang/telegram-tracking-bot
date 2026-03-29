# telegram-tracking-bot

每日追蹤 Telegram Bot，讓你設定任意追蹤項目，每天早上 09:00 自動以 AI 查詢並推送結果到 Telegram。

## 功能

- 新增、編輯、刪除追蹤項目（例如：股價、新聞、天氣）
- 每日 09:00（Asia/Taipei）自動查詢所有項目並推播
- 支援手動立即查詢單一或全部項目
- 支援多 AI Provider：Grok（xAI）、Gemini（Google）
- 使用 SQLite 儲存資料，輕量免額外服務

## 指令

| 指令 | 說明 |
|------|------|
| `/add [描述]` | 新增追蹤項目 |
| `/list` | 列出所有追蹤項目 |
| `/delete [ID]` | 刪除項目 |
| `/edit [ID] [新描述]` | 更新項目描述 |
| `/query [ID]` | 立即查詢單一項目 |
| `/queryall` | 立即查詢所有項目 |
| `/help` | 顯示說明 |

## 環境設定

複製 `.env.example` 並填入對應金鑰：

```bash
cp .env.example .env
```

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# AI Provider: grok 或 gemini
AI_PROVIDER=grok

# Grok (xAI)
XAI_API_KEY=your_xai_api_key

# Gemini (Google)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash-lite
```

## 安裝與啟動

```bash
npm install
npm run dev       # 開發模式
npm run build     # 編譯 TypeScript
npm start         # 正式啟動
```

## 使用 PM2 部署

```bash
npm run build
pm2 start ecosystem.config.js
```

## 技術棧

- [Telegraf](https://telegraf.js.org/) — Telegram Bot framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — SQLite
- [node-cron](https://github.com/node-cron/node-cron) — 排程
- TypeScript
