// Mots déclencheurs de commandes d'aide
const HELP_TRIGGERS = new Set(['aide', 'help', 'start', 'bonjour', 'salut', 'hello', '/aide', '/help']);

// Indicateurs remote explicites
const REMOTE_KEYWORDS = ['remote', 'télétravail', 'teletravail', 'full remote', 'distanciel', 'à distance'];

// Prépositions de lieu
const LOCATION_PREPOSITIONS = /\b(?:à|a|en|near|in|sur|dans|autour de)\s+/i;

// Mots à ignorer pour la détection de ville
const IGNORE_WORDS = new Set([
  'emploi', 'job', 'jobs', 'offre', 'offres', 'poste', 'postes',
  'cherche', 'recherche', 'trouve', 'trouver', 'besoin',
  'developpeur', 'développeur', 'ingénieur', 'ingenieur',
  'senior', 'junior', 'lead', 'manager', 'chef', 'responsable',
  'stage', 'alternance', 'cdi', 'cdd', 'freelance', 'consultant',
]);

/**
 * Parse un message utilisateur en objet de requête structurée.
 * @param {string} text
 * @returns {{ keywords: string, location: string, remote: boolean, raw: string } | null}
 */
export function parseQuery(text) {
  if (!text || text.length < 2) return null;

  const normalized = text.trim().toLowerCase();

  if (HELP_TRIGGERS.has(normalized)) return null;

  // Détection remote
  const remote = REMOTE_KEYWORDS.some((kw) => normalized.includes(kw));

  // Nettoyage des mots-clés remote du texte pour ne pas les inclure dans les mots-clés
  let cleaned = text.trim();
  for (const kw of REMOTE_KEYWORDS) {
    cleaned = cleaned.replace(new RegExp(kw, 'gi'), '').trim();
  }

  // Extraction de la localisation
  let location = '';
  let keywords = cleaned;

  const prepMatch = cleaned.match(new RegExp(LOCATION_PREPOSITIONS.source + '(.+)', 'i'));
  if (prepMatch) {
    location = prepMatch[1].trim();
    keywords = cleaned.slice(0, prepMatch.index).trim();
  } else {
    // Heuristique : dernier mot = ville potentielle si pas dans IGNORE_WORDS
    const words = cleaned.split(/\s+/);
    if (words.length > 1) {
      const lastWord = words[words.length - 1].toLowerCase();
      if (!IGNORE_WORDS.has(lastWord) && /^[a-zàâäéèêëîïôùûüç-]{3,}$/i.test(lastWord)) {
        location = words[words.length - 1];
        keywords = words.slice(0, -1).join(' ');
      }
    }
  }

  keywords = keywords.replace(/\s+/g, ' ').trim();
  location = location || 'France';

  if (!keywords) return null;

  return { keywords, location, remote, raw: text.trim() };
}
