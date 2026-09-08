import type { Router } from '../../../shared/src/router';
import {
  ok, created, notFound, badRequest, paginated, err,
} from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { WorldviewEnv } from '../env';
import {
  RhetoricRepo,
  type WvRhetoricDevice, type WvRhetoricTerm, type WvRhetoricUsage,
} from '../repositories/rhetoric.repo';
import {
  buildRhetoricCards, RHETORIC_TEMPLATES,
  type RhetoricCard, type RhetoricTemplate,
} from '../lib/rhetoric-cards';
import { dual } from './prefix';

const TEMPLATE_SET = new Set<string>(RHETORIC_TEMPLATES);

/** `?only=production,critique` — bare names, or the full `rhetoric.` form. */
function templateFilter(raw: string | null): Set<RhetoricTemplate> | null {
  if (!raw) return null;
  const wanted = new Set<RhetoricTemplate>();
  for (const part of raw.split(',').map(p => p.trim()).filter(Boolean)) {
    const full = part.startsWith('rhetoric.') ? part : `rhetoric.${part}`;
    if (TEMPLATE_SET.has(full)) wanted.add(full as RhetoricTemplate);
  }
  return wanted.size ? wanted : null;
}

function cardsForTerms(
  terms: WvRhetoricTerm[],
  devices: WvRhetoricDevice[],
  usages: WvRhetoricUsage[],
  only: Set<RhetoricTemplate> | null,
): RhetoricCard[] {
  const deviceById = new Map(devices.map(d => [d.id, d]));
  const usageByTerm = new Map<string, WvRhetoricUsage[]>();
  for (const u of usages) {
    const bucket = usageByTerm.get(u.rhetoric_term_id);
    if (bucket) bucket.push(u); else usageByTerm.set(u.rhetoric_term_id, [u]);
  }
  const out: RhetoricCard[] = [];
  for (const term of terms) {
    const built = buildRhetoricCards(
      term,
      term.device_id ? deviceById.get(term.device_id) ?? null : null,
      usageByTerm.get(term.id) ?? [],
    );
    for (const c of built) if (!only || only.has(c.card_template)) out.push(c);
  }
  return out;
}

/**
 * Hands the batch to CORE, which owns km_core. The caller's Authorization
 * header rides along, so the cards land in that user's own deck and WV never
 * needs to know who they are.
 */
async function pushToCore(
  env: WorldviewEnv,
  req: Request,
  cards: RhetoricCard[],
  body: Record<string, unknown>,
): Promise<Response> {
  if (!env.CORE) return err('service_unavailable', 'CORE service binding is not configured', 503);
  const auth = req.headers.get('Authorization');
  if (!auth) return err('unauthorized', 'Valid Bearer token required', 401);

  const headers = new Headers({ 'Content-Type': 'application/json', Authorization: auth });
  for (const h of ['X-KM-Internal', 'X-KM-Internal-Secret', 'X-KM-User-Id', 'X-KM-Workspace-Id', 'X-KM-Role']) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }

  const payload: Record<string, unknown> = { cards };
  if (typeof body['deck_id'] === 'string') payload['deck_id'] = body['deck_id'];
  else payload['title'] = typeof body['title'] === 'string' ? body['title'] : 'English — rhetoric (WGRT)';
  if (typeof body['description'] === 'string') payload['description'] = body['description'];

  const upstream = await env.CORE.fetch(new Request(
    'https://domain.internal/core/srs/cards/bulk',
    { method: 'POST', headers, body: JSON.stringify(payload) },
  ));
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * WGRT — WorldView Global Rhetorical Terms.
 *
 * The figures that carry worldview claims in living political English: the
 * expression, the picture underneath it, what it foregrounds and what it
 * hides. Mounted at /wv/rhetoric/* (and /worldview/rhetoric/*).
 */
export function rhetoricRoutes(router: Router<WorldviewEnv>) {

  dual(router, 'get', '/rhetoric/devices', async (req, env) => {
    const url = new URL(req.url);
    return paginated(await new RhetoricRepo(env.DB_WV).listDevices({
      device_family: url.searchParams.get('family'),
      ...parsePagination(url),
    }));
  });

  dual(router, 'post', '/rhetoric/devices', async (req, env) => {
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!b) return badRequest('Request body must be valid JSON');
    if (!b.slug || !b.title) return badRequest('slug and title required');
    const device = await new RhetoricRepo(env.DB_WV).createDevice({
      slug: String(b.slug),
      title: String(b.title),
      title_ar: (b.title_ar as string | null) ?? null,
      title_ur: (b.title_ur as string | null) ?? null,
      classical_name: (b.classical_name as string | null) ?? null,
      device_family: b.device_family ? String(b.device_family) : undefined,
      definition_en: (b.definition_en as string | null) ?? null,
      al_concept_ref: (b.al_concept_ref as string | null) ?? null,
      balagha_fit: (b.balagha_fit as string | null) ?? null,
      divergence_en: (b.divergence_en as string | null) ?? null,
      sort_order: typeof b.sort_order === 'number' ? b.sort_order : undefined,
    });
    return created(device);
  });

  dual(router, 'get', '/rhetoric/facets', async (_req, env) =>
    ok(await new RhetoricRepo(env.DB_WV).facets()));

  dual(router, 'get', '/rhetoric/terms', async (req, env) => {
    const url = new URL(req.url);
    return paginated(await new RhetoricRepo(env.DB_WV).listTerms({
      device_id:     url.searchParams.get('device'),
      lang:          url.searchParams.get('lang'),
      source_domain: url.searchParams.get('source_domain'),
      target_domain: url.searchParams.get('target_domain'),
      register:      url.searchParams.get('register'),
      stance:        url.searchParams.get('stance'),
      q:             url.searchParams.get('q'),
      live_only:     url.searchParams.get('live') === '1',
      ...parsePagination(url),
    }));
  });

  dual(router, 'post', '/rhetoric/terms', async (req, env) => {
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!b) return badRequest('Request body must be valid JSON');
    if (!b.slug || !b.term) return badRequest('slug and term required');

    const repo = new RhetoricRepo(env.DB_WV);
    if (await repo.findTerm(String(b.slug))) return badRequest(`slug ${b.slug} already exists`);

    // Accept a device slug as well as an id, so callers can post readable JSON.
    let deviceId: string | null = null;
    if (b.device_id ?? b.device) {
      const device = await repo.findDevice(String(b.device_id ?? b.device));
      if (!device) return badRequest(`unknown device ${String(b.device_id ?? b.device)}`);
      deviceId = device.id;
    }

    return created(await repo.createTerm({
      slug: String(b.slug),
      term: String(b.term),
      lang: b.lang ? String(b.lang) : undefined,
      term_ar: (b.term_ar as string | null) ?? null,
      term_ur: (b.term_ur as string | null) ?? null,
      device_id: deviceId,
      literal_sense: (b.literal_sense as string | null) ?? null,
      figurative_sense: (b.figurative_sense as string | null) ?? null,
      source_domain: (b.source_domain as string | null) ?? null,
      target_domain: (b.target_domain as string | null) ?? null,
      register: b.register ? String(b.register) : undefined,
      stance: b.stance ? String(b.stance) : undefined,
      origin_note: (b.origin_note as string | null) ?? null,
      highlights: (b.highlights as string | null) ?? null,
      hides: (b.hides as string | null) ?? null,
      counter_term: (b.counter_term as string | null) ?? null,
      tradition_id: (b.tradition_id as string | null) ?? null,
      al_concept_ref: (b.al_concept_ref as string | null) ?? null,
      quran_ref: (b.quran_ref as string | null) ?? null,
      concept_ref: (b.concept_ref as string | null) ?? null,
      notes_md: (b.notes_md as string | null) ?? null,
      sort_order: typeof b.sort_order === 'number' ? b.sort_order : undefined,
    }));
  });

  dual(router, 'get', '/rhetoric/terms/:id', async (_req, env, { id }) => {
    const repo = new RhetoricRepo(env.DB_WV);
    const term = await repo.findTerm(id);
    if (!term) return notFound(`rhetoric term ${id}`);
    const [device, usages] = await Promise.all([
      term.device_id ? repo.findDevice(term.device_id) : Promise.resolve(null),
      repo.listUsagesForTerm(term.id),
    ]);
    return ok({ term, device, usages });
  });

  dual(router, 'patch', '/rhetoric/terms/:id', async (req, env, { id }) => {
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!b) return badRequest('Request body must be valid JSON');
    const repo = new RhetoricRepo(env.DB_WV);
    const term = await repo.findTerm(id);
    if (!term) return notFound(`rhetoric term ${id}`);
    return ok(await repo.updateTerm(term.id, b));
  });

  // ------------------------------------------------------------------ SRS ---
  // WGRT entries become English study cards. WV builds the payloads; CORE owns
  // km_core and does the writing.

  dual(router, 'get', '/rhetoric/terms/:id/cards', async (req, env, { id }) => {
    const repo = new RhetoricRepo(env.DB_WV);
    const term = await repo.findTerm(id);
    if (!term) return notFound(`rhetoric term ${id}`);
    const [device, usages] = await Promise.all([
      term.device_id ? repo.findDevice(term.device_id) : Promise.resolve(null),
      repo.listUsagesForTerm(term.id),
    ]);
    const only = templateFilter(new URL(req.url).searchParams.get('only'));
    const cards = buildRhetoricCards(term, device, usages)
      .filter(c => !only || only.has(c.card_template));
    return ok({ term: term.slug, total: cards.length, cards });
  });

  dual(router, 'post', '/rhetoric/terms/:id/cards', async (req, env, { id }) => {
    const repo = new RhetoricRepo(env.DB_WV);
    const term = await repo.findTerm(id);
    if (!term) return notFound(`rhetoric term ${id}`);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const [device, usages] = await Promise.all([
      term.device_id ? repo.findDevice(term.device_id) : Promise.resolve(null),
      repo.listUsagesForTerm(term.id),
    ]);
    const only = templateFilter(
      typeof body['only'] === 'string' ? body['only'] : new URL(req.url).searchParams.get('only'),
    );
    const cards = buildRhetoricCards(term, device, usages)
      .filter(c => !only || only.has(c.card_template));
    if (!cards.length) return badRequest('nothing to build for this term');
    return pushToCore(env, req, cards, body);
  });

  /** The whole filtered set at once — the same filters the term list takes. */
  dual(router, 'get', '/rhetoric/cards', async (req, env) => {
    const url = new URL(req.url);
    const { terms, devices, usages } = await collect(env, url);
    const cards = cardsForTerms(terms, devices, usages, templateFilter(url.searchParams.get('only')));
    return ok({ terms: terms.length, total: cards.length, cards });
  });

  dual(router, 'post', '/rhetoric/cards', async (req, env) => {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const { terms, devices, usages } = await collect(env, url);
    const only = templateFilter(
      typeof body['only'] === 'string' ? body['only'] : url.searchParams.get('only'),
    );
    const cards = cardsForTerms(terms, devices, usages, only);
    if (!cards.length) return badRequest('no terms matched, so there is nothing to build');
    return pushToCore(env, req, cards, body);
  });

  dual(router, 'post', '/rhetoric/terms/:id/usages', async (req, env, { id }) => {
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!b) return badRequest('Request body must be valid JSON');
    if (!b.quote) return badRequest('quote required');
    const repo = new RhetoricRepo(env.DB_WV);
    const term = await repo.findTerm(id);
    if (!term) return notFound(`rhetoric term ${id}`);
    return created(await repo.createUsage({
      rhetoric_term_id: term.id,
      quote: String(b.quote),
      speaker: (b.speaker as string | null) ?? null,
      speaker_ref: (b.speaker_ref as string | null) ?? null,
      venue: (b.venue as string | null) ?? null,
      said_on: (b.said_on as string | null) ?? null,
      source_url: (b.source_url as string | null) ?? null,
      function_note: (b.function_note as string | null) ?? null,
      is_locus_classicus: Boolean(b.is_locus_classicus),
      sort_order: typeof b.sort_order === 'number' ? b.sort_order : undefined,
    }));
  });
}

/** The filtered term set plus everything the card builder needs, in 3 queries. */
async function collect(env: WorldviewEnv, url: URL) {
  const repo = new RhetoricRepo(env.DB_WV);
  const page = await repo.listTerms({
    device_id:     url.searchParams.get('device'),
    lang:          url.searchParams.get('lang'),
    source_domain: url.searchParams.get('source_domain'),
    target_domain: url.searchParams.get('target_domain'),
    register:      url.searchParams.get('register'),
    stance:        url.searchParams.get('stance'),
    q:             url.searchParams.get('q'),
    live_only:     url.searchParams.get('live') !== '0',
    page: 1,
    per_page: 100,
  });
  const terms = page.rows as WvRhetoricTerm[];
  const [devices, usages] = await Promise.all([
    repo.allDevices(),
    repo.listUsagesForTerms(terms.map(t => t.id)),
  ]);
  return { terms, devices, usages };
}
