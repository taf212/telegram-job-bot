/**
 * Script de test minimal — lance un bot Telegram simple
 * sans Google Sheets ni APIs d'emploi complexes.
 *
 * Lancez avec : node test-bot.mjs
 * Envoyez "ping" à votre bot → il répond "pong ✅"
 * Envoyez n'importe quoi → il appelle Adzuna et affiche les résultats bruts
 */

import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADZUNA_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_KEY = process.env.ADZUNA_APP_KEY;
const JSEARCH_KEY = process.env.JSEARCH_API_KEY;

if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN manquant dans .env');
  process.exit(1);
}

console.log('🔑 Token Telegram :', TOKEN.slice(0, 10) + '...');
console.log('🔑 Adzuna ID      :', ADZUNA_ID || '❌ manquant');
console.log('🔑 JSearch Key    :', JSEARCH_KEY ? JSEARCH_KEY.slice(0, 8) + '...' : '❌ manquant');
console.log('\n⏳ Connexion à Telegram...\n');

const bot = new TelegramBot(TOKEN, { polling: true });

bot.on('polling_error', (err) => {
  console.error('❌ Erreur polling :', err.code, err.message);
  if (err.code === 'ETELEGRAM' && err.message.includes('409')) {
    console.error('   → Une autre instance du bot tourne déjà. Fermez-la et relancez.');
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() || '';
  console.log(`📩 Message reçu de ${msg.from.first_name} (${chatId}): "${text}"`);

  // Test de base
  if (text.toLowerCase() === 'ping') {
    await bot.sendMessage(chatId, 'pong ✅ — Le bot fonctionne !');
    return;
  }

  await bot.sendMessage(chatId, `🔍 Test Adzuna pour : "${text}"...`);

  // Test Adzuna
  try {
    const { data } = await axios.get(`https://api.adzuna.com/v1/api/jobs/fr/search/1`, {
      params: {
        app_id: ADZUNA_ID,
        app_key: ADZUNA_KEY,
        what: text,
        results_per_page: 3,
      },
      timeout: 8000,
    });
    const jobs = data.results || [];
    if (jobs.length === 0) {
      await bot.sendMessage(chatId, '⚠️ Adzuna : 0 résultats (API ok mais pas d\'offres)');
    } else {
      const lines = [`✅ Adzuna : ${jobs.length} offres trouvées\n`];
      jobs.forEach((j, i) => {
        lines.push(`${i + 1}. ${j.title} — ${j.company?.display_name || 'N/A'}`);
        lines.push(`   📍 ${j.location?.display_name || 'N/A'}`);
        lines.push(`   🔗 ${j.redirect_url}\n`);
      });
      await bot.sendMessage(chatId, lines.join('\n'));
    }
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Adzuna erreur : ${err.message}`);
    console.error('Adzuna error:', err.response?.data || err.message);
  }
});

console.log('✅ Bot démarré en mode polling.');
console.log('📱 Ouvrez Telegram, trouvez votre bot et envoyez "ping"\n');
