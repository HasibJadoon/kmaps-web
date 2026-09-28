import type { Router } from '../../../shared/src/router';
import { badRequest, created, noContent, notFound, ok, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ContentEnv } from '../env';
import { DocumentRepo, type DocumentInclude, type DocumentListFilters } from '../repositories/document.repo';
import {
  validateCmDocumentBlockCreate,
  validateCmDocumentBlockPatch,
  validateCmDocumentCreate,
  validateCmDocumentLinkCreate,
  validateCmDocumentPatch,
  validateCmDocumentReplace,
  validateCmDocumentVersionCreate,
} from '../schemas/document.schema';

type Validator<T> = (body: unknown) => { data: T } | { error: string };

async function readValidatedJson<T>(req: Request, validate: Validator<T>): Promise<{ data: T } | { response: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { response: badRequest('Request body must be valid JSON') };
  }

  const result = validate(body);
  if ('error' in result) return { response: badRequest(result.error) };
  return { data: result.data };
}

function parseIncludes(url: URL, defaults: DocumentInclude[] = []): DocumentInclude[] {
  const raw = url.searchParams.get('include');
  if (!raw) return defaults;
  if (raw === 'all') return ['blocks', 'links', 'versions'];

  const allowed = new Set<DocumentInclude>(['blocks', 'links', 'versions']);
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is DocumentInclude => allowed.has(part as DocumentInclude));
}

function numberParam(url: URL, name: string): number | undefined {
  const raw = url.searchParams.get(name);
  if (raw === null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function filtersFromUrl(url: URL): DocumentListFilters {
  const publicationState = url.searchParams.get('publication_state') ?? url.searchParams.get('state') ?? undefined;
  return {
    core_user_ref: url.searchParams.get('core_user_ref') ?? undefined,
    doc_type: url.searchParams.get('doc_type') ?? undefined,
    publication_state: publicationState,
    workspace_ref: url.searchParams.get('workspace_ref') ?? undefined,
    policy_ref: url.searchParams.get('policy_ref') ?? undefined,
    primary_source_ref:
      url.searchParams.get('primary_source_ref') ??
      url.searchParams.get('source_ref') ??
      url.searchParams.get('ref') ??
      undefined,
    language: url.searchParams.get('language') ?? undefined,
    q: url.searchParams.get('q') ?? undefined,
    domain: url.searchParams.get('domain') ?? undefined,
    subdomain: url.searchParams.get('subdomain') ?? undefined,
    surah: numberParam(url, 'surah'),
    ayah: numberParam(url, 'ayah'),
    include_archived:
      url.searchParams.get('include_archived') === 'true' ||
      publicationState === 'all',
  };
}

async function ensureDocument(repo: DocumentRepo, docId: string): Promise<Response | null> {
  return (await repo.exists(docId)) ? null : notFound(`document ${docId}`);
}

export function documentRoutes(router: Router<ContentEnv>) {
  router.get('/cm/documents', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new DocumentRepo(env.DB_CM).list(
        filtersFromUrl(url),
        parsePagination(url),
      ),
    );
  });

  router.get('/cm/documents/search', async (req, env) => {
    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim();
    if (!q) return badRequest('q is required');

    return paginated(
      await new DocumentRepo(env.DB_CM).search(
        { ...filtersFromUrl(url), q },
        parsePagination(url),
      ),
    );
  });

  router.get('/cm/documents/:id', async (req, env, { id }) => {
    const url = new URL(req.url);
    const row = await new DocumentRepo(env.DB_CM).findAggregate(
      id,
      parseIncludes(url, ['blocks']),
    );
    return row ? ok(row) : notFound(`document ${id}`);
  });

  router.post('/cm/documents', async (req, env) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }

    if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
      const record = body as Record<string, unknown>;
      const headerUser = req.headers.get('X-KM-User-Id');
      if (headerUser) record.core_user_ref = headerUser;
      else if (!record.core_user_ref) record.core_user_ref = 'CORE:local';
    }

    const result = validateCmDocumentCreate(body);
    if ('error' in result) return badRequest(result.error);
    return created(await new DocumentRepo(env.DB_CM).create(result.data));
  });

  router.put('/cm/documents/:id', async (req, env, { id }) => {
    const parsed = await readValidatedJson(req, validateCmDocumentReplace);
    if ('response' in parsed) return parsed.response;

    const repo = new DocumentRepo(env.DB_CM);
    const row = await repo.patch(id, parsed.data);
    if (!row) return notFound(`document ${id}`);
    return ok(await repo.findAggregate(id, ['blocks']));
  });

  router.patch('/cm/documents/:id', async (req, env, { id }) => {
    const parsed = await readValidatedJson(req, validateCmDocumentPatch);
    if ('response' in parsed) return parsed.response;

    const repo = new DocumentRepo(env.DB_CM);
    const row = await repo.patch(id, parsed.data);
    if (!row) return notFound(`document ${id}`);
    return ok(await repo.findAggregate(id, parsed.data.blocks !== undefined ? ['blocks'] : []));
  });

  router.delete('/cm/documents/:id', async (req, env, { id }) => {
    const url = new URL(req.url);
    const repo = new DocumentRepo(env.DB_CM);
    const deleted = url.searchParams.get('hard') === 'true'
      ? await repo.hardDelete(id)
      : await repo.archive(id);
    return deleted ? noContent() : notFound(`document ${id}`);
  });

  router.get('/cm/documents/:id/blocks', async (_req, env, { id }) => {
    const repo = new DocumentRepo(env.DB_CM);
    const missing = await ensureDocument(repo, id);
    if (missing) return missing;
    return ok(await repo.blocksWithChildren(id));
  });

  router.post('/cm/documents/:id/blocks', async (req, env, { id }) => {
    const parsed = await readValidatedJson(req, validateCmDocumentBlockCreate);
    if ('response' in parsed) return parsed.response;

    const repo = new DocumentRepo(env.DB_CM);
    const missing = await ensureDocument(repo, id);
    if (missing) return missing;
    return created(await repo.createBlock(id, parsed.data));
  });

  router.patch('/cm/documents/:id/blocks/:blockId', async (req, env, { id, blockId }) => {
    const parsed = await readValidatedJson(req, validateCmDocumentBlockPatch);
    if ('response' in parsed) return parsed.response;

    const row = await new DocumentRepo(env.DB_CM).patchBlock(id, blockId, parsed.data);
    return row ? ok(row) : notFound(`block ${blockId}`);
  });

  router.delete('/cm/documents/:id/blocks/:blockId', async (_req, env, { id, blockId }) => {
    const deleted = await new DocumentRepo(env.DB_CM).deleteBlock(id, blockId);
    return deleted ? noContent() : notFound(`block ${blockId}`);
  });

  router.get('/cm/documents/:id/links', async (_req, env, { id }) => {
    const repo = new DocumentRepo(env.DB_CM);
    const missing = await ensureDocument(repo, id);
    if (missing) return missing;
    return ok(await repo.links(id));
  });

  router.post('/cm/documents/:id/links', async (req, env, { id }) => {
    const parsed = await readValidatedJson(req, validateCmDocumentLinkCreate);
    if ('response' in parsed) return parsed.response;

    const repo = new DocumentRepo(env.DB_CM);
    const missing = await ensureDocument(repo, id);
    if (missing) return missing;
    return created(await repo.createLink(id, parsed.data));
  });

  router.delete('/cm/documents/:id/links/:linkId', async (_req, env, { id, linkId }) => {
    const repo = new DocumentRepo(env.DB_CM);
    const missing = await ensureDocument(repo, id);
    if (missing) return missing;
    const deleted = await repo.deleteLink(id, linkId);
    return deleted ? noContent() : notFound(`link ${linkId}`);
  });

  router.get('/cm/documents/:id/versions', async (_req, env, { id }) => {
    const repo = new DocumentRepo(env.DB_CM);
    const missing = await ensureDocument(repo, id);
    if (missing) return missing;
    return ok(await repo.versions(id));
  });

  router.post('/cm/documents/:id/versions', async (req, env, { id }) => {
    const parsed = await readValidatedJson(req, validateCmDocumentVersionCreate);
    if ('response' in parsed) return parsed.response;

    const version = await new DocumentRepo(env.DB_CM).createVersion(id, parsed.data);
    return version ? created(version) : notFound(`document ${id}`);
  });
}
