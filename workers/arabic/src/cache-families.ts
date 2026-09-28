// The cache-version families of this worker's database (migrations/kmaps_cache_version*.sql):
// a row each in kmaps_cache_version, stamped by a trigger on every write to its tables.
export const FAMILIES: Record<string, string> = {
  content: `SELECT version AS v FROM kmaps_cache_version WHERE family = 'content'`,
};
