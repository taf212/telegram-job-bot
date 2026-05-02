import { getCache, setCache } from './cache.js';
import { fetchAdzuna } from './jobApis/adzuna.js';
import { fetchFranceTravail } from './jobApis/franceTravail.js';
import { fetchJSearch } from './jobApis/jsearch.js';
import { scoreAndRank } from './scoring.js';

const MAX_RESULTS = 20;

/**
 * Agrège les résultats de toutes les APIs, score et retourne les 10 meilleures offres.
 * @param {{ keywords: string, location: string, remote: boolean, raw: string }} query
 * @returns {Promise<import('./scoring.js').ScoredJob[]>}
 */
export async function aggregateJobs(query) {
  const cacheKey = `${query.keywords}__${query.location}__${query.remote}`;
  const cached = getCache(cacheKey);
  if (cached) {
    console.log(`[jobSearch] Cache hit pour "${cacheKey}"`);
    return cached;
  }

  console.log(`[jobSearch] Recherche multi-API pour "${query.raw}"`);

  // Appels parallèles à toutes les APIs
  const [adzunaJobs, ftJobs, jsearchJobs] = await Promise.allSettled([
    fetchAdzuna(query),
    fetchFranceTravail(query),
    fetchJSearch(query),
  ]).then((results) =>
    results.map((r) => {
      if (r.status === 'fulfilled') return r.value;
      console.error('[jobSearch] API failure:', r.reason?.message);
      return [];
    })
  );

  const allJobs = [...adzunaJobs, ...ftJobs, ...jsearchJobs];
  console.log(
    `[jobSearch] Brut: Adzuna=${adzunaJobs.length}, FT=${ftJobs.length}, JSearch=${jsearchJobs.length} → Total=${allJobs.length}`
  );

  const ranked = scoreAndRank(allJobs, query).slice(0, MAX_RESULTS);
  console.log(`[jobSearch] Après scoring+dédup: ${ranked.length} offres retenues`);

  if (ranked.length > 0) setCache(cacheKey, ranked);

  return ranked;
}
