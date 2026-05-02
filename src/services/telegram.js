import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';

const token = config.telegram.token;
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN manquant dans .env');
  process.exit(1);
}

// Bot créé UNE seule fois à l'import du module
// polling: true = même config que le test-bot.mjs qui fonctionnait
export const bot = new TelegramBot(token, {
  polling: config.telegram.mode !== 'webhook',
});

// ── Envoi de messages ──────────────────────────────────────────────────────────

/**
 * Envoie un message HTML avec découpage automatique (limite 4096 chars Telegram).
 * @param {number|string} chatId
 * @param {string} html
 */
export async function sendMessage(chatId, html) {
  const chunks = splitHtml(String(html), 4096);
  for (const chunk of chunks) {
    await bot.sendMessage(chatId, chunk, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  }
}

/**
 * Affiche l'indicateur "en train d'écrire…" dans Telegram.
 * @param {number|string} chatId
 */
export async function sendTyping(chatId) {
  try {
    await bot.sendChatAction(chatId, 'typing');
  } catch {
    // Non bloquant — ignoré silencieusement
  }
}

// ── Utilitaires ────────────────────────────────────────────────────────────────

function splitHtml(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const parts = [];
  let current = '';
  for (const line of text.split('\n')) {
    const next = current ? current + '\n' + line : line;
    if (next.length > maxLen) {
      if (current) parts.push(current.trim());
      current = line;
    } else {
      current = next;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
