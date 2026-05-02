import axios from 'axios';
import { config } from '../../config.js';

const BASE = 'https://jsearch.p.rapidapi.com/search';

/**
 * @param {{ keywords: string, location: string, remote: boolean }} query
 * @returns {Promise<RawJob[]>}
 */
export async function fetchJSearch(query) {
  const { apiKey } = config.apis.jsearch;
  if (!apiKey) return [];

  const queryStr = query.remote
    ? `${query.keywords} remote`
    : `${query.keywords} ${query.location}`;

  const reqParams = (page) => ({
    params: {
      query: queryStr,
      page,
      num_pages: 1,
      date_posted: 'month',
      country: 'fr',
    },
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
    timeout: 8000,
  });

  try {
    // Deux appels parallèles : page 1 + page 2 → 20 résultats bruts
    const [res1, res2] = await Promise.allSettled([
      axios.get(BASE, reqParams(1)),
      axios.get(BASE, reqParams(2)),
    ]);

    const page1 = res1.status === 'fulfilled' ? (res1.value.data.data || []) : [];
    const page2 = res2.status === 'fulfilled' ? (res2.value.data.data || []) : [];

    console.log(`[jsearch] Page1=${page1.length} Page2=${page2.length}`);

    return [...page1, ...page2].map(normalizeJSearch);
  } catch (err) {
    console.error('[jsearch] Erreur:', err.message);
    return [];
  }
}

function normalizeJSearch(item) {
  return {
    title: item.job_title || '',
    company: item.employer_name || 'Confidentiel',
    location: [item.job_city, item.job_country].filter(Boolean).join(', ') || '',
    remote: item.job_is_remote || false,
    salary: formatSalary(item),
    date: item.job_posted_at_datetime_utc || null,
    url: item.job_apply_link || item.job_google_link || '',
    description: item.job_description || '',
    source: 'JSearch',
    id: `jsearch_${item.job_id}`,
  };
}

function formatSalary(item) {
  const min = item.job_min_salary;
  const max = item.job_max_salary;
  const period = item.job_salary_period;
  if (!min && !max) return null;
  const fmt = (n) => `${Math.round(n).toLocaleString('fr-FR')} €`;
  const periodLabel = period === 'YEAR' ? '/an' : period === 'MONTH' ? '/mois' : '';
  if (min && max) return `${fmt(min)} – ${fmt(max)}${periodLabel}`;
  if (min) return `À partir de ${fmt(min)}${periodLabel}`;
  return `Jusqu'à ${fmt(max)}${periodLabel}`;
}
