import 'dotenv/config';
import express from 'express';
import { config } from './config.js';

if (!config.telegram.token) {
  console.error('\n❌ TELEGRAM_BOT_TOKEN manquant dans .env\n');
  process.exit(1);
}

import botRouter from './routes/bot.js';

const app = express();
app.use(express.json());

// Route de santé (Railway / Render healthcheck)
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'telegram-job-bot', mode: config.telegram.mode })
);

// Route webhook (mode production uniquement)
if (config.telegram.mode === 'webhook') {
  app.use('/', botRouter);
}

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(config.port, () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🤖 Telegram Job Bot — démarrage');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Port    : ${config.port}`);
  console.log(`  Mode    : ${config.telegram.mode}`);
  console.log(`  Adzuna  : ${config.apis.adzuna.appId ? '✅' : '❌ manquant'}`);
  console.log(`  JSearch : ${config.apis.jsearch.apiKey ? '✅' : '❌ manquant'}`);
  console.log(`  Sheets  : ${config.sheets.spreadsheetId ? '✅' : '❌ manquant'}`);
  if (config.telegram.mode === 'webhook') {
    console.log(`  Webhook : ${config.telegram.webhookUrl}/webhook`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📱 En attente de messages Telegram…\n');
});
