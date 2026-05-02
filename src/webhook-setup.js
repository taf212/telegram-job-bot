/**
 * webhook-setup.js
 * ─────────────────
 * Script à lancer UNE SEULE FOIS après chaque déploiement
 * pour enregistrer l'URL du webhook auprès de Telegram.
 *
 * Usage :
 *   node src/webhook-setup.js set    → enregistre le webhook
 *   node src/webhook-setup.js delete → supprime le webhook (retour polling)
 *   node src/webhook-setup.js info   → affiche l'état actuel
 */

import 'dotenv/config';
import axios from 'axios';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const BASE = `https://api.telegram.org/bot${TOKEN}`;

const action = process.argv[2] || 'info';

if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN manquant dans .env');
  process.exit(1);
}

async function setWebhook() {
  if (!WEBHOOK_URL) {
    console.error('❌ TELEGRAM_WEBHOOK_URL manquant dans .env');
    console.error('   Exemple : https://telegram-job-bot.up.railway.app');
    process.exit(1);
  }

  const url = `${WEBHOOK_URL}/webhook`;
  console.log(`\n📡 Enregistrement du webhook : ${url}`);

  const { data } = await axios.post(`${BASE}/setWebhook`, {
    url,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  });

  if (data.ok) {
    console.log('✅ Webhook enregistré avec succès !');
    console.log(`   URL : ${url}`);
  } else {
    console.error('❌ Échec :', data.description);
  }
}

async function deleteWebhook() {
  console.log('\n🗑️  Suppression du webhook (retour mode polling)...');
  const { data } = await axios.post(`${BASE}/deleteWebhook`, {
    drop_pending_updates: true,
  });
  if (data.ok) {
    console.log('✅ Webhook supprimé — mode polling actif');
  } else {
    console.error('❌ Échec :', data.description);
  }
}

async function getWebhookInfo() {
  const { data } = await axios.get(`${BASE}/getWebhookInfo`);
  const info = data.result;
  console.log('\n📊 État du webhook :');
  console.log(`   URL              : ${info.url || '(aucune — mode polling)'}`);
  console.log(`   En attente       : ${info.pending_update_count ?? 0} messages`);
  console.log(`   Dernière erreur  : ${info.last_error_message || 'aucune'}`);
  console.log(`   Certificat       : ${info.has_custom_certificate ? 'oui' : 'non'}`);
}

(async () => {
  try {
    if (action === 'set') await setWebhook();
    else if (action === 'delete') await deleteWebhook();
    else await getWebhookInfo();
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  }
})();
