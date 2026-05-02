import axios from 'axios';
import { config } from '../../config.js';

const AUTH_URL = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire';
const SEARCH_URL = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search';

let tokenCache = { value: null, expiresAt: 0 };

async function getToken() {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt) return tokenCache.value;

  const { clientId, clientSecret } = config.apis.franceTravail;
  if (!clientId || !clientSecret) return null;

  try {
    const { data } = await axios.post(
      AUTH_URL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'api_offresdemploiv2 o2dsoffre',
      }),
      { timeout: 8000 }
    );
    tokenCache = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 - 60_000 };
    return tokenCache.value;
  } catch (err) {
    console.error('[francetravail] Auth error:', err.message);
    return null;
  }
}

/**
 * @param {{ keywords: string, location: string, remote: boolean }} query
 * @returns {Promise<RawJob[]>}
 */
export async function fetchFranceTravail(query) {
  const token = await getToken();
  if (!token) return [];

  const params = {
    motsCles: query.keywords,
    range: '0-29',
    sort: 1,
    ...(query.location !== 'France' && { commune: query.location }),
    ...(query.remote && { modesTravail: 'T' }), // T = télétravail
  };

  try {
    const { data } = await axios.get(SEARCH_URL, {
      params,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 8000,
    });
    return (data.resultats || []).map(normalizeFranceTravail);
  } catch (err) {
    console.error('[francetravail] Search error:', err.message);
    return [];
  }
}

function normalizeFranceTravail(item) {
  const salaire = item.salaire?.libelle || null;
  return {
    title: item.intitule || '',
    company: item.entreprise?.nom || 'Confidentiel',
    location: item.lieuTravail?.libelle || '',
    remote: item.modesTravail === 'T' || /télétravail/i.test(item.intitule + ' ' + (item.description || '')),
    salary: salaire,
    date: item.dateCreation || null,
    url: item.origineOffre?.urlOrigine || `https://candidat.francetravail.fr/offres/recherche/detail/${item.id}`,
    description: item.description || '',
    source: 'France Travail',
    id: `ft_${item.id}`,
  };
}
