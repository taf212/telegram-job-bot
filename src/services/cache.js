import NodeCache from 'node-cache';
import { config } from '../config.js';

const cache = new NodeCache({
  stdTTL: config.cache.ttlSeconds,
  checkperiod: 60,
  useClones: false,
});

export function getCache(key) {
  return cache.get(key) ?? null;
}

export function setCache(key, value) {
  cache.set(key, value);
}

export function deleteCache(key) {
  cache.del(key);
}

export function getCacheStats() {
  return cache.getStats();
}
