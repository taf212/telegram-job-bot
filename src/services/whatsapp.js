import axios from 'axios';
import { config } from '../config.js';

const client = axios.create({
  baseURL: config.whatsapp.baseUrl,
  headers: {
    Authorization: `Bearer ${config.whatsapp.token}`,
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

export async function sendMessage(to, text) {
  // WhatsApp limite à 4096 caractères par message
  const chunks = splitMessage(text, 4096);

  for (const chunk of chunks) {
    await client.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: chunk, preview_url: false },
    });
  }
}

export async function sendReply(to, replyToMessageId, text) {
  await client.post('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    context: { message_id: replyToMessageId },
    text: { body: text, preview_url: false },
  });
}

function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];

  const parts = [];
  let current = '';

  for (const line of text.split('\n')) {
    if ((current + '\n' + line).length > maxLen) {
      parts.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) parts.push(current);
  return parts;
}
