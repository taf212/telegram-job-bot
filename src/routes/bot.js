import { Router } from 'express';
import { bot, sendMessage, sendTyping, escHtml } from '../services/telegram.js';
import { parseQuery } from '../utils/parser.js';
import { formatJobsMessage, formatError, formatNoResults } from '../utils/formatter.js';
import { aggregateJobs } from '../services/jobSearch.js';
import { writeLatest, appendHistory } from '../services/sheets.js';
import { config } from '../config.js';

const router = Router();

// ── Mode POLLING (local) : handlers enregistrés directement sur le bot ─────────
if (config.telegram.mode !== 'webhook') {
  bot.on('message', handleMessage);

  bot.on('polling_error', (err) => {
    console.error('[bot] Polling error:', err.code, '-', err.message);
    if (err.message?.includes('409')) {
      console.error('[bot] → Une autre instance tourne déjà. Fermez-la et relancez.');
    }
  });

  console.log('[bot] Handlers enregistrés ✅ (mode polling)');
}

// ── Mode WEBHOOK (production) : Telegram envoie les updates en POST ────────────
router.post('/webhook', (req, res) => {
  res.sendStatus(200); // Accusé de réception immédiat (< 5s exigé)
  const update = req.body;
  if (update?.message) {
    handleMessage(update.message).catch((err) =>
      console.error('[bot] Erreur traitement webhook:', err.message)
    );
  }
});

// ── Handler principal (commun polling + webhook) ───────────────────────────────

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  const username = msg.from?.first_name || 'utilisateur';

  if (!text) return;

  console.log(`[bot] ✉️  Message de ${username} (${chatId}): "${text}"`);

  if (['/start', '/aide', '/help'].includes(text.toLowerCase())) {
    await sendMessage(chatId, formatError('HELP'));
    return;
  }

  const query = parseQuery(text);
  if (!query) {
    await sendMessage(chatId, formatError('HELP'));
    return;
  }

  await sendTyping(chatId);
  await sendMessage(chatId, `🔍 <b>Recherche en cours…</b>\n<i>${escHtml(query.raw)}</i>`);

  try {
    await sendTyping(chatId);
    const jobs = await aggregateJobs(query);

    if (jobs.length === 0) {
      await sendMessage(chatId, formatNoResults(query));
      return;
    }

    await sendMessage(chatId, formatJobsMessage(jobs, query));

    Promise.allSettled([writeLatest(jobs, query), appendHistory(jobs, query)]).then((results) => {
      const errors = results.filter((r) => r.status === 'rejected');
      if (errors.length > 0) {
        console.warn('[bot] Sheets partiel:', errors.map((r) => r.reason?.message).join(', '));
      } else {
        console.log('[bot] ✅ Google Sheets mis à jour.');
      }
    });

  } catch (err) {
    console.error('[bot] ❌ Erreur:', err.message);
    await sendMessage(chatId, '⚠️ Une erreur est survenue. Réessayez dans quelques instants.');
  }
}

export default router;
