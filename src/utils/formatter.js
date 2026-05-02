// Formatter HTML pour Telegram (parse_mode: 'HTML')
// Balises supportées : <b>, <i>, <u>, <s>, <code>, <pre>, <a href="">

const DIVIDER = '━'.repeat(26);

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Formate la liste des offres pour Telegram (HTML).
 * @param {import('../services/scoring.js').ScoredJob[]} jobs
 * @param {{ keywords: string, location: string, remote: boolean, raw: string }} query
 */
export function formatJobsMessage(jobs, query) {
  const remoteTag = query.remote ? '  🏠 <b>Remote</b>' : '';

  const header = [
    `✅ <b>${jobs.length} offre(s) trouvée(s)</b>`,
    `🔎 <i>${esc(query.keywords)}</i> — 📍 ${esc(query.location)}${remoteTag}`,
    DIVIDER,
  ].join('\n');

  const blocks = jobs.map((job, i) => {
    const lines = [`<b>${i + 1}. ${esc(job.title)}</b>`];
    lines.push(`🏢 ${esc(job.company)}`);
    lines.push(`📍 ${esc(job.location)}${job.remote ? '  🏠 <i>Remote</i>' : ''}`);
    if (job.salary) lines.push(`💰 ${esc(job.salary)}`);
    lines.push(`🕐 ${formatDate(job.date)}  ·  <i>${esc(job.source)}</i>`);
    lines.push(`🔗 <a href="${esc(job.url)}">Voir l'offre</a>`);
    return lines.join('\n');
  });

  const footer = [
    DIVIDER,
    `📊 <i>Résultats enregistrés dans Google Sheets</i>`,
    `💬 <i>Nouvelle recherche ? Envoyez un autre message.</i>`,
  ].join('\n');

  return [header, ...blocks, footer].join('\n\n');
}

export function formatNoResults(query) {
  return [
    `❌ <b>Aucune offre trouvée</b> pour : <i>${esc(query.raw)}</i>`,
    '',
    '💡 <b>Conseils :</b>',
    '• Utilisez des termes plus généraux',
    '• Retirez la ville pour chercher partout en France',
    '• Essayez en anglais : <code>frontend developer</code>',
    '• Ajoutez <code>remote</code> pour le télétravail',
  ].join('\n');
}

export function formatError(type) {
  if (type === 'HELP') {
    return [
      `👋 <b>Bot Offres d'Emploi</b> — Mode d'emploi`,
      DIVIDER,
      '',
      '📨 Envoyez simplement votre recherche :',
      '',
      '<b>Exemples :</b>',
      '• <code>Data Engineer Paris</code>',
      '• <code>Frontend developer remote</code>',
      '• <code>Responsable Data à Toulouse</code>',
      '• <code>Chef de projet SI Lyon CDI</code>',
      '',
      '🔍 <i>Je recherche sur Adzuna, France Travail et JSearch</i>',
      '📊 <i>Les résultats sont enregistrés dans Google Sheets</i>',
    ].join('\n');
  }

  return '⚠️ Une erreur est survenue. Réessayez dans quelques instants.';
}

function formatDate(dateStr) {
  if (!dateStr) return 'Date inconnue';
  try {
    const dt = new Date(dateStr);
    const diffDays = Math.floor((Date.now() - dt.getTime()) / 86_400_000);
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays <= 7) return `Il y a ${diffDays} jours`;
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
