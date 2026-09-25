export function parsePagination(
  url: URL,
  bounds: { defaultPerPage?: number; maxPerPage?: number } = {},
): { page: number; per_page: number } {
  const def = bounds.defaultPerPage ?? 20;
  const max = bounds.maxPerPage ?? 100;
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const per_page = Math.min(
    max,
    Math.max(1, parseInt(url.searchParams.get('per_page') ?? String(def), 10) || def),
  );
  return { page, per_page };
}

export function parseIntParam(value: string): number | null {
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

/** A request body that is a plain object — not null, not an array.
 *
 *  Every schema file had its own private copy of these three lines; sixty-eight
 *  of them, byte-identical. One export, so a change to what counts as a record
 *  is a change in one place. */
export function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

/** The request body parsed as JSON, or `undefined` when it is empty or not
 *  valid JSON. Callers that want an object narrow it with isSchemaRecord. */
export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

/** The request body when it is a plain JSON object; `null` when it is empty,
 *  malformed, an array or a primitive. */
export async function readJsonObject(req: Request): Promise<Record<string, unknown> | null> {
  const body = await readJsonBody(req);
  return isSchemaRecord(body) ? body : null;
}

/** A string with surrounding whitespace removed, or null when the value is
 *  not a string or is blank. */
export function nonBlank(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
