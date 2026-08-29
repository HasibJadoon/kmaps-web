// ─── /cm/captures — the inbox ─────────────────────────────────────────────────
//
// Capture first, decide later. A link, a passage, a photo, a voice note; the
// only required field is that there is something. Triage happens afterwards, on
// the vocabulary core_source_log has been using by hand for 69 entries.
//
// Ownership comes from the gateway's verified X-KM-User-Id, never from the
// body — the same rule docspace.ts follows. cm_capture_entries.core_user_ref is
// NOT NULL and the old version never set it, which is one of the reasons no
// capture has ever been written.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated, unauthorized } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ContentEnv } from '../env';
import { CaptureRepo, CAPTURE_TYPES, EXPLORE_STATES } from '../repositories/capture.repo';
import { CmSourceRepo } from '../repositories/source.repo';

function actor(req: Request): string | null {
  const id = req.headers.get('X-KM-User-Id');
  return id && id.trim() ? id.trim() : null;
}

export function cmCaptureRoutes(router: Router<ContentEnv>) {

  // GET /cm/captures?type=url&state=want&processed=0
  router.get('/cm/captures', async (req, env) => {
    const user = actor(req);
    if (!user) return unauthorized('Authenticated user required');
    const url = new URL(req.url);
    const processedRaw = url.searchParams.get('processed');
    return paginated(await new CaptureRepo(env.DB_CM).list({
      user,
      type: url.searchParams.get('type'),
      state: url.searchParams.get('state'),
      processed: processedRaw === null ? null : processedRaw === '1',
      ...parsePagination(url),
    }));
  });

  // GET /cm/captures/states — the triage vocabulary, so a client offers the
  // same five words the log has always used rather than inventing its own.
  router.get('/cm/captures/states', async (_req, _env) =>
    ok({ states: EXPLORE_STATES, types: CAPTURE_TYPES }));

  router.get('/cm/captures/:id', async (req, env, { id }) => {
    const user = actor(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new CaptureRepo(env.DB_CM);
    const row = await repo.findById(id);
    if (!row) return notFound(`capture ${id}`);
    if (row.core_user_ref !== user) return notFound(`capture ${id}`);
    return ok({ capture: row, links: (await repo.links(id)).rows });
  });

  // POST /cm/captures
  router.post('/cm/captures', async (req, env) => {
    const user = actor(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await req.json() as Record<string, unknown>;

    const text = typeof b['raw_text'] === 'string' ? b['raw_text'].trim() : '';
    const url = typeof b['source_url'] === 'string' ? b['source_url'].trim() : '';
    const asset = typeof b['media_asset_ref'] === 'string' ? b['media_asset_ref'] : '';
    // One check only: that something was captured. An inbox that argues about
    // shape is an inbox nobody uses.
    if (!text && !url && !asset) {
      return badRequest('raw_text, source_url or media_asset_ref required');
    }

    const state = typeof b['explore_state'] === 'string' ? b['explore_state'] : undefined;
    if (state && !(EXPLORE_STATES as readonly string[]).includes(state)) {
      return badRequest(`explore_state must be one of: ${EXPLORE_STATES.join(', ')}`);
    }

    return created(await new CaptureRepo(env.DB_CM).create({
      core_user_ref: user,
      capture_type: typeof b['capture_type'] === 'string' ? b['capture_type'] : undefined,
      raw_text: text || null,
      raw_ar: typeof b['raw_ar'] === 'string' ? b['raw_ar'] : null,
      source_url: url || null,
      source_title: typeof b['source_title'] === 'string' ? b['source_title'] : null,
      media_asset_ref: asset || null,
      tags: Array.isArray(b['tags']) ? (b['tags'] as string[]) : null,
      workspace_ref: typeof b['workspace_ref'] === 'string' ? b['workspace_ref'] : null,
      explore_state: state ?? null,
      priority: typeof b['priority'] === 'number' ? b['priority'] : null,
      why: typeof b['why'] === 'string' ? b['why'] : null,
    }));
  });

  // PATCH /cm/captures/:id — triage. What state it is in, and what you concluded.
  router.patch('/cm/captures/:id', async (req, env, { id }) => {
    const user = actor(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await req.json() as Record<string, unknown>;
    const repo = new CaptureRepo(env.DB_CM);
    const row = await repo.findById(id);
    if (!row || row.core_user_ref !== user) return notFound(`capture ${id}`);

    const patch: Record<string, unknown> = {};
    if (typeof b['explore_state'] === 'string') {
      if (!(EXPLORE_STATES as readonly string[]).includes(b['explore_state'])) {
        return badRequest(`explore_state must be one of: ${EXPLORE_STATES.join(', ')}`);
      }
      patch['explore_state'] = b['explore_state'];
    }
    if (typeof b['priority'] === 'number') patch['priority'] = b['priority'];
    for (const key of ['why', 'found_what', 'verdict']) {
      if (typeof b[key] === 'string') patch[key] = b[key];
    }
    if (!Object.keys(patch).length) return badRequest('nothing to update');
    return ok(await repo.triage(id, patch));
  });

  // POST /cm/captures/:id/promote — this became something worth keeping.
  //
  // Creates the cm_source and marks the capture as having become it. The
  // capture is kept rather than deleted: what you noticed and what it turned
  // into are different facts, and the first is worth being able to look back at.
  router.post('/cm/captures/:id/promote', async (req, env, { id }) => {
    const user = actor(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const repo = new CaptureRepo(env.DB_CM);
    const capture = await repo.findById(id);
    if (!capture || capture.core_user_ref !== user) return notFound(`capture ${id}`);
    if (capture.processed_into_ref) {
      return badRequest(`already promoted into ${capture.processed_into_ref}`);
    }

    const title = (typeof b['title'] === 'string' && b['title'].trim())
      || capture.source_title
      || capture.raw_text?.slice(0, 80)
      || 'Untitled';

    const source = await new CmSourceRepo(env.DB_CM).create({
      core_user_ref: user,
      title,
      source_type: typeof b['source_type'] === 'string' ? b['source_type'] : 'other',
      language: typeof b['language'] === 'string' ? b['language'] : undefined,
      url: capture.source_url,
      author_names: Array.isArray(b['author_names']) ? (b['author_names'] as string[]) : null,
      publisher: typeof b['publisher'] === 'string' ? b['publisher'] : null,
      publication_year: typeof b['publication_year'] === 'number' ? b['publication_year'] : null,
      isbn: typeof b['isbn'] === 'string' ? b['isbn'] : null,
      doi: typeof b['doi'] === 'string' ? b['doi'] : null,
    });

    await repo.markProcessed(id, source.source_id);
    await repo.addLink(id, source.source_id, 'promoted_into');
    return created({ capture: await repo.findById(id), source });
  });
}
