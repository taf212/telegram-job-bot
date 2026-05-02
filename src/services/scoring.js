import { config } from '../config.js';

/**
 * @typedef {{ title: string, company: string, location: string, remote: boolean,
 *   salary: string|null, date: string|null, url: string, description: string,
 *   source: string, id: string }} RawJob
 *
 * @typedef {RawJob & { score: number }} ScoredJob
 */

const { recencyWeight, relevanceWeight, remoteBonus, maxDaysOld } = config.scoring;

// ── Déduplication ──────────────────────────────────────────────────────────────

function fingerprint(job) {
  const title = job.title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const company = job.company.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${title}__${company}`;
}

export function deduplicate(jobs) {
  const seen = new Map();
  for (const job of jobs) {
    const fp = fingerprint(job);
    if (!seen.has(fp)) {
      seen.set(fp, job);
    } else {
      // Garder la version avec l'URL la plus informative
      const existing = seen.get(fp);
      if (job.url.length > existing.url.length) seen.set(fp, job);
    }
  }
  return [...seen.values()];
}

// ── Scoring ────────────────────────────────────────────────────────────────────

function recencyScore(dateStr) {
  if (!dateStr) return 0;
  try {
    const daysOld = (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
    if (daysOld < 0 || daysOld > maxDaysOld) return 0;
    // Score linéaire : 10 pour aujourd'hui, 0 pour maxDaysOld
    return Math.max(0, 10 * (1 - daysOld / maxDaysOld));
  } catch {
    return 0;
  }
}

function relevanceScore(job, query) {
  const haystack = `${job.title} ${job.description}`.toLowerCase();
  const needles = query.keywords.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  if (needles.length === 0) return 5;

  let hits = 0;
  let titleHits = 0;
  for (const word of needles) {
    if (haystack.includes(word)) hits++;
    if (job.title.toLowerCase().includes(word)) titleHits++;
  }

  const baseScore = (hits / needles.length) * 10;
  const titleBonus = (titleHits / needles.length) * 2; // bonus si le titre matche bien
  return Math.min(10, baseScore + titleBonus);
}

function remoteScore(job, query) {
  if (!query.remote) return 0;
  return job.remote ? remoteBonus : -2;
}

/**
 * Score, déduplique et trie les offres.
 * @param {RawJob[]} rawJobs
 * @param {{ keywords: string, location: string, remote: boolean }} query
 * @returns {ScoredJob[]}
 */
export function scoreAndRank(rawJobs, query) {
  const unique = deduplicate(rawJobs);

  const scored = unique.map((job) => {
    const recency = recencyScore(job.date);
    const relevance = relevanceScore(job, query);
    const remote = remoteScore(job, query);
    const score = recency * recencyWeight + relevance * relevanceWeight + remote;
    return { ...job, score: Math.round(score * 100) / 100 };
  });

  return scored
    .filter((j) => j.score > 0)
    .sort((a, b) => b.score - a.score);
}
