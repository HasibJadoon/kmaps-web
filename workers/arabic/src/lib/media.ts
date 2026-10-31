/// A key in the km-arabic-audio bucket as the URL the app fetches it from (the worker serves the bucket at
/// /ar/audio/:key+, the gateway at /api/ar/audio/…). Keys carry a content hash, so the answer never goes stale.
export const mediaUrl = (key: string | null | undefined): string | null => (key ? `/api/ar/audio/${encodeURI(key)}` : null);
