import { Router } from 'express';
import { config } from '../config.js';
import { sendMessage, sendReply } from '../services/whatsapp.js';
import { parseQuery } from '../utils/parser.js';
import { formatJobsMessage, formatError, formatNoResults } from '../utils/formatter.js';
import { aggregateJobs } from '../services/jobSearch.js';
import { writeLatest, appendHistory } from '../services/sheets.js';

const router = Router();

// ── Vérification webhook Meta (GET) ──────────────────────────────────────────
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    console.log('[webhook] Webhook vérifié par Meta.');
    return res.status(200).send(challenge);
  }
  res.status(403).json({ error: 'Verification failed' });
});

// ── Réception des messages (POST) ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  // Accuser réception immédiatement (Meta exige < 5s)
  res.status(200).send('EVENT_RECEIVED');

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Ignorer les status updates (delivered, read, etc.)
    if (!value?.messages) return;

    const message = value.messages[0];
    if (message.type !== 'text') return;

    const userPhone = message.from;
    const userText = message.text.body.trim();

    console.log(`[webhook] Message de ${userPhone}: "${userText}"`);

    // Parsing de la requête
    const query = parseQuery(userText);

    if (!query) {
      await sendMessage(userPhone, formatError('HELP'));
      return;
    }

    // Accusé de réception + indication de recherche
    await sendMessage(userPhone, `🔍 Recherche en cours pour : *${query.raw}*\n_Patientez quelques secondes…_`);

    // Recherche multi-API + scoring
    const jobs = await aggregateJobs(query);

    if (jobs.length === 0) {
      await sendMessage(userPhone, formatNoResults(query));
      return;
    }

    // Envoi des résultats WhatsApp
    await sendMessage(userPhone, formatJobsMessage(jobs, query));

    // Écriture Google Sheets en parallèle
    await Promise.allSettled([
      writeLatest(jobs, query),
      appendHistory(jobs, query),
    ]);

  } catch (err) {
    console.error('[webhook] Erreur lors du traitement:', err.message);
  }
});

export default router;
