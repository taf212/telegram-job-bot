import axios from 'axios';
import { config } from '../../config.js';

const BASE = 'https://api.adzuna.com/v1/api/jobs';

/**
 * @param {{ keywords: string, location: string, remote: boolean }} query
 * @returns {Promise<RawJob[]>}
 */
export async function fetchAdzuna(query) {
  const { appId, appKey, country } = config.apis.adzuna;
  if (!appId || !appKey) return [];

  const params = {
    app_id: appId,
    app_key: appKey,
    results_per_page: 20,
    what: query.keywords,
    where: query.location === 'France' ? '' : query.location,
    sort_by: 'date',
    max_days_old: config.scoring.maxDaysOld,
    ...(query.remote && { 'content-type': 'application/json', what_and: 'remote télétravail' }),
  };

  try {
    const { data } = await axios.get(`${BASE}/${country}/search/1`, { params, timeout: 8000 });
    return (data.results || []).map(normalizeAdzuna);
  } catch (err) {
    console.error('[adzuna] Erreur:', err.message);
    return [];
  }
}

function normalizeAdzuna(item) {
  return {
    title: item.title || '',
    company: item.company?.display_name || 'Confidentiel',
    location: item.location?.display_name || '',
    remote: /remote|télétravail|distanciel/i.test(item.title + ' ' + (item.description || '')),
    salary: formatSalary(item.salary_min, item.salary_max),
    date: item.created || null,
    url: item.redirect_url || '',
    description: item.description || '',
    source: 'Adzuna',
    id: `adzuna_${item.id}`,
  };
}

function formatSalary(min, max) {
  if (!min && !max) return null;
  const fmt = (n) => `${Math.round(n).toLocaleString('fr-FR')} €`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}/an`;
  if (min) return `À partir de ${fmt(min)}/an`;
  return `Jusqu'à ${fmt(max)}/an`;
}
