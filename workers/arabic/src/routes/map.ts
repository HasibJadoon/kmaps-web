import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';
import { paletteOf, WORLD_WORDS } from '../lib/everyday-world';
import { canvasOf, settingsOf, treeOf, type MapRow } from '../lib/map-canvas';
import { buildVocabulary, keysOf, VOCAB_WORDS, type VocabInput } from '../lib/stop-vocab';
import { bare } from '../lib/levels';

// ── The Everyday atlas, one route for any level (owner, 2026-10-31) ─────────────────────────────────────────────────
// GET /ar/map/:id — a stop of ar_map_node (a world 'MAP:modern-city', a district, a place, a side, a room), or
// 'domain:<slug>' for a place the atlas has no rows for yet (its content laid out by default). The answer is the same
// for every level: the stop and its breadcrumbs, its canvas (size, picture, areas) and its direct children as markers
// with their place, state and caption. GET /ar/vocab/:domain — a place's vocabulary hub. The app only draws these.

export const MAP_WORDS = {
  soon: 'Coming soon',
  story: (n: number) => `${n} lines · read-along`,
  qa: (n: number) => `${n} lines · Q&A · read-along`,
  dialogue: (n: number) => `${n} lines · listen in`,
  sentences: (n: number) => `${n} sentence${n === 1 ? '' : 's'} · say it`,
  passage: (n: number) => `${n} words · read & listen`,
  hub: { title: VOCAB_WORDS.title, titleAr: VOCAB_WORDS.titleAr, icon: 'archivebox.fill' },
  dialogueTitle: 'Listen in', sentencesTitle: 'Say it', sentencesTitleAr: 'قُلْهَا', passageTitle: 'Passage',
  toExplore: (n: number) => `${n} to explore`,
  portal: (t: string) => `Travel to ${t}`,
  inside: (n: number) => `${n} place${n === 1 ? '' : 's'} to explore`,
};
const ICONS: Record<string, string> = { reading: 'book.fill', dialogue: 'bubble.left.and.bubble.right.fill', sentences: 'text.quote',
                                        passage: 'doc.text.fill', vocab_hub: 'archivebox.fill' };
const asset = (k: string | null) => (k ? `/api/ar/audio/${k}` : null);

interface Live {
  domain: { id: string; slug: string; title: string; title_ar: string | null; cover: string | null; map_id: string | null; map_order: number | null };
  readings: Array<{ slug: string; kind: string; title_en: string; title_ar: string; lines: number; cover: string | null; body: string | null }>;
  dialogues: Array<{ id: string; title_ar: string; title_en: string | null; image: string | null; turns: number; wordIds: string[] }>;
  passages: Array<{ id: string; title_ar: string; word_count: number }>;
  sentenceIds: string[];
  words: VocabInput['words'];
}

async function tryQuery<T>(p: Promise<T[]>): Promise<T[]> { try { return await p; } catch { return []; } }

async function loadLive(env: ArabicEnv, slug: string): Promise<Live | null> {
  const dom = await queryOne<{ id: string; slug: string; title: string; title_ar: string | null; cover_key: string | null; map_id: string | null; map_order: number | null }>(env.DB_AR,
    `SELECT id, slug, title, title_ar, cover_key, map_id, map_order FROM ar_curriculum_domain WHERE slug = ?`, [slug]);
  if (!dom) return null;
  const set = `JOIN ar_daily_theme t ON t.id = x.theme_id AND t.domain_id = ? AND t.is_published = 1`;
  const [readings, dialogues, turns, passages, sentences, words] = await Promise.all([
    query<{ slug: string; kind: string; title_en: string; title_ar: string; lines: number; cover_key: string | null; body_md: string | null }>(env.DB_AR,
      `SELECT slug, kind, title_en, title_ar, lines, cover_key, body_md FROM ar_daily_reading WHERE domain_id = ? AND is_published = 1 ORDER BY sort_order, created_at`, [dom.id]),
    query<{ id: string; title_ar: string; title_en: string | null; image_key: string | null }>(env.DB_AR,
      `SELECT x.id, x.title_ar, x.title_en, x.image_key FROM ar_daily_dialogue x ${set} ORDER BY t.day_index, x.sort_order`, [dom.id]),
    query<{ dialogue_id: string; word_id: string | null }>(env.DB_AR,
      `SELECT n.dialogue_id, n.word_id FROM ar_daily_dialogue_turn n JOIN ar_daily_dialogue x ON x.id = n.dialogue_id ${set}`, [dom.id]),
    query<{ id: string; title_ar: string; word_count: number }>(env.DB_AR,
      `SELECT x.id, x.title_ar, x.word_count FROM ar_daily_passage x ${set} ORDER BY t.day_index`, [dom.id]),
    query<{ id: string; word_id: string | null }>(env.DB_AR, `SELECT x.id, x.word_id FROM ar_daily_sentence x ${set} ORDER BY t.day_index, x.sort_order`, [dom.id]),
    query<{ id: string; singular_ar: string; plural_ar: string; gloss_en: string; image_key: string | null; audio_key_sg: string | null; audio_key_pl: string | null }>(env.DB_AR,
      `SELECT x.id, x.singular_ar, x.plural_ar, x.gloss_en, x.image_key, x.audio_key_sg, x.audio_key_pl FROM ar_daily_word x ${set} ORDER BY t.day_index, x.sort_order`, [dom.id]),
  ]);
  return {
    domain: { id: dom.id, slug: dom.slug, title: dom.title, title_ar: dom.title_ar, cover: dom.cover_key, map_id: dom.map_id, map_order: dom.map_order },
    readings: readings.map((r) => ({ slug: r.slug, kind: r.kind, title_en: r.title_en, title_ar: r.title_ar, lines: r.lines, cover: r.cover_key, body: r.body_md })),
    dialogues: dialogues.map((d) => ({ id: d.id, title_ar: d.title_ar, title_en: d.title_en, image: d.image_key,
                                      turns: turns.filter((t) => t.dialogue_id === d.id).length,
                                      wordIds: turns.filter((t) => t.dialogue_id === d.id && t.word_id).map((t) => t.word_id!) })),
    passages,
    sentenceIds: sentences.map((s) => s.word_id ?? '').filter(Boolean),
    words: words.map((w) => ({ id: w.id, singular: w.singular_ar, plural: w.plural_ar, gloss: w.gloss_en, image: w.image_key, audioSg: w.audio_key_sg, audioPl: w.audio_key_pl })),
    // (sentence count kept apart: sentenceIds only holds those naming a word)
    ...({ sentenceCount: sentences.length } as object),
  } as Live;
}
const sentenceCount = (l: Live) => (l as unknown as { sentenceCount: number }).sentenceCount ?? 0;

/** The vocabulary of a place (lib/stop-vocab), with the rooms its nodes stand in as sections. */
async function vocabOf(env: ArabicEnv, live: Live, rows: MapRow[]) {
  // words taught earlier on the same map are not repeated here
  const before = live.domain.map_id && live.domain.map_order != null
    ? await tryQuery(query<{ w: string }>(env.DB_AR,
        `SELECT w.singular_ar AS w FROM ar_daily_word w JOIN ar_daily_theme t ON t.id = w.theme_id AND t.is_published = 1
           JOIN ar_curriculum_domain d ON d.id = t.domain_id WHERE d.map_id = ? AND d.map_order < ?`, [live.domain.map_id, live.domain.map_order]))
    : [];
  // where each artifact stands: its room (the nearest inline ancestor of the place)
  const byId = new Map(rows.map((r) => [r.id, r]));
  const place = rows.find((r) => r.domain === live.domain.slug && r.kind === 'place');
  const roomOf = new Map<string, string>(); const rooms: VocabInput['rooms'] = [];
  if (place) {
    const inRooms = (id: string, room: MapRow | null) => {
      for (const c of rows.filter((r) => r.parent_id === id)) {
        if (c.type === 'stop' && settingsOf(c).inline) { rooms.push({ key: c.id, title: c.title_en ?? '', titleAr: c.title_ar }); inRooms(c.id, c); }
        else if (c.type === 'stop') inRooms(c.id, room);
        else if (c.type === 'artifact' && room) roomOf.set(nodeKey(c), room.id);
      }
    };
    inRooms(place.id, null);
    void byId;
  }
  const input: VocabInput = {
    words: live.words,
    readings: live.readings.map((r) => ({ slug: r.slug, titleEn: r.title_en, titleAr: r.title_ar, keys: keysOf(r.body) })),
    dialogues: live.dialogues.map((d) => ({ id: d.id, titleAr: d.title_ar, titleEn: d.title_en, wordIds: d.wordIds })),
    sentenceWordIds: live.sentenceIds,
    taughtBefore: new Set(before.map((b) => bare(b.w))),
    roomOf, rooms,
  };
  return buildVocabulary(input);
}

/** The id a reader refers to an artifact by: 'reading:<slug>', 'dialogue:<id>', 'passage:<id>', 'sentences', 'vocab_hub'. */
const nodeKey = (a: { kind: string | null; ref: string | null }) =>
  a.kind === 'reading' ? `reading:${(a.ref ?? '').replace(/^ARDR:/, '')}` : a.kind === 'sentences' ? 'sentences'
  : a.kind === 'vocab_hub' ? 'words' : `${a.kind}:${a.ref}`;

interface Resolved { title: string; titleAr: string | null; caption: string; picture: string | null; icon: string; open: boolean }

function resolveArtifact(a: MapRow, live: Live | null, vocabCount: number): Resolved {
  const base: Resolved = { title: a.title_en ?? a.kind ?? '', titleAr: a.title_ar, caption: MAP_WORDS.soon, picture: null, icon: a.icon ?? ICONS[a.kind ?? ''] ?? 'questionmark', open: false };
  if (!live) return base;
  switch (a.kind) {
    case 'reading': {
      const r = live.readings.find((x) => `ARDR:${x.slug}` === a.ref || x.slug === a.ref);
      return r ? { ...base, title: r.title_en, titleAr: r.title_ar, caption: r.kind === 'qa' ? MAP_WORDS.qa(r.lines) : MAP_WORDS.story(r.lines), picture: asset(r.cover), open: true } : base;
    }
    case 'dialogue': {
      const d = live.dialogues.find((x) => x.id === a.ref);
      return d ? { ...base, title: d.title_en ?? MAP_WORDS.dialogueTitle, titleAr: d.title_ar, caption: MAP_WORDS.dialogue(d.turns), picture: asset(d.image), open: true } : base;
    }
    case 'passage': {
      const p = live.passages.find((x) => x.id === a.ref);
      return p ? { ...base, title: MAP_WORDS.passageTitle, titleAr: p.title_ar, caption: MAP_WORDS.passage(p.word_count), open: true } : base;
    }
    case 'sentences': {
      const n = sentenceCount(live);
      return n ? { ...base, title: MAP_WORDS.sentencesTitle, titleAr: MAP_WORDS.sentencesTitleAr, caption: MAP_WORDS.sentences(n), open: true } : { ...base, title: MAP_WORDS.sentencesTitle, titleAr: MAP_WORDS.sentencesTitleAr };
    }
    case 'vocab_hub':
      return { ...base, title: MAP_WORDS.hub.title, titleAr: MAP_WORDS.hub.titleAr, icon: MAP_WORDS.hub.icon,
               caption: vocabCount ? VOCAB_WORDS.count(vocabCount) : MAP_WORDS.soon, open: vocabCount > 0 };
    default: return base;
  }
}

export function mapRoutes(router: Router<ArabicEnv>) {
  router.get('/ar/vocab/:domain', async (_req, env, { domain }) => {
    const live = await loadLive(env, domain);
    if (!live) return notFound(`place ${domain}`);
    const rows = await tryQuery(query<MapRow>(env.DB_AR, `SELECT * FROM ar_map_node WHERE map_id = ?`, [live.domain.map_id ?? '']));
    return ok({ place: { slug: domain, title: live.domain.title, titleAr: live.domain.title_ar },
                words: { title: VOCAB_WORDS.title, titleAr: VOCAB_WORDS.titleAr }, ...(await vocabOf(env, live, rows)) });
  });

  router.get('/ar/map/:id', async (_req, env, { id }) => {
    // the node: a row of the atlas, or a place with no rows yet (laid out by default from its content)
    let rows: MapRow[] = [];
    let node: MapRow | undefined;
    if (id.startsWith('domain:')) {
      const slug = id.slice(7);
      const live = await loadLive(env, slug);
      if (!live) return notFound(`place ${slug}`);
      node = { id, parent_id: live.domain.map_id, type: 'stop', kind: 'place', ref: null, title_ar: live.domain.title_ar, title_en: live.domain.title,
               icon: null, color: null, picture_key: live.domain.cover, picture_brief: null, x: null, y: null, w: null, h: null, sort_order: 0,
               status: 'live', unlock: 'content', settings: '{}', domain: slug, map_id: live.domain.map_id ?? '' };
      rows = [node];
    } else {
      const mapId = (await queryOne<{ map_id: string }>(env.DB_AR, `SELECT map_id FROM ar_map_node WHERE id = ?`, [id]).catch(() => null))?.map_id ?? (id.startsWith('MAP:') ? id : null);
      if (!mapId) return notFound(`map ${id}`);
      rows = await tryQuery(query<MapRow>(env.DB_AR, `SELECT * FROM ar_map_node WHERE map_id = ?`, [mapId]));
      node = rows.find((r) => r.id === id);
      if (!node) return notFound(`map ${id}`);
    }
    const byId = new Map(rows.map((r) => [r.id, r]));
    const chain: MapRow[] = [];
    for (let r: MapRow | undefined = node; r; r = r.parent_id ? byId.get(r.parent_id) : undefined) chain.unshift(r);
    const domainOf = (r: MapRow): string | null => { for (let x: MapRow | undefined = r; x; x = x.parent_id ? byId.get(x.parent_id) : undefined) if (x.domain) return x.domain; return null; };
    const world = await queryOne<{ era: string; title: string; title_ar: string | null; image_key: string | null }>(env.DB_AR,
      `SELECT era, title, title_ar, image_key FROM ar_map WHERE id = ?`, [node.map_id]);
    const era = world?.era ?? 'msa';

    // the place whose content this canvas shows: the node itself or its nearest place ancestor
    const placeSlug = domainOf(node);
    const live = placeSlug ? await loadLive(env, placeSlug) : null;

    // content that is live but not yet hung on the tree goes into the place's default room (or, with no rooms, onto the place)
    const virtual: MapRow[] = [];
    if (live && (node.kind === 'place' || node.id.startsWith('domain:') || domainOf(node) === placeSlug)) {
      const place = rows.find((r) => r.domain === placeSlug && r.kind === 'place') ?? node;
      const below = (id: string): MapRow[] => rows.filter((r) => r.parent_id === id).flatMap((r) => [r, ...below(r.id)]);
      const mine = below(place.id).filter((r) => r.type === 'artifact');
      const rooms = rows.filter((r) => r.parent_id === place.id && r.type === 'stop' && settingsOf(r).inline);
      const hasRooms = rooms.length > 0;
      const home = (hasRooms ? (rooms.find((r) => settingsOf(r).default) ?? rooms[0]!) : place);
      const has = (k: string, ref: string) => mine.some((a) => a.kind === k && (a.ref === ref || a.ref === `ARDR:${ref}`));
      const want: Array<{ kind: string; ref: string }> = [
        ...live.readings.map((r) => ({ kind: 'reading', ref: `ARDR:${r.slug}` })), ...live.dialogues.map((d) => ({ kind: 'dialogue', ref: d.id })),
        ...(sentenceCount(live) ? [{ kind: 'sentences', ref: 'sentences' }] : []), ...live.passages.map((p) => ({ kind: 'passage', ref: p.id })),
        { kind: 'vocab_hub', ref: 'hub' }];
      let n = 0;
      for (const w of want) {
        if (has(w.kind, w.ref) || (w.kind === 'vocab_hub' && mine.some((a) => a.kind === 'vocab_hub'))) continue;
        const pos = hasRooms ? {} : { x: [0.2, 0.5, 0.8][n % 3]!, y: 0.2 + Math.floor(n / 3) * 0.2 };
        virtual.push({ id: `${home.id}~${w.kind}~${w.ref.replace(/[^A-Za-z0-9]+/g, '-')}`, parent_id: home.id, type: 'artifact', kind: w.kind, ref: w.ref,
                       title_ar: null, title_en: null, icon: null, color: null, picture_key: null, picture_brief: null, x: (pos as { x?: number }).x ?? null,
                       y: (pos as { y?: number }).y ?? null, w: null, h: null, sort_order: 100 + n, status: 'live', unlock: 'content', settings: '{}',
                       domain: null, map_id: node.map_id });
        n++;
      }
    }
    const all = [...rows, ...virtual];
    const kids = treeOf(all);
    const hasPicture = !!node.picture_key || !!(node.kind === 'world' && world?.image_key);
    const canvas = canvasOf(node, kids, hasPicture);

    const vocabCount = live ? (await vocabOf(env, live, all)).count : 0;
    // a world's places are open by their domains' content
    const placeStates = node.kind === 'world' || node.kind === 'district' || canvas.markers.some((m) => m.row.kind === 'place')
      ? await tryQuery(query<{ slug: string; title: string; title_ar: string | null; cover_key: string | null; themes: number; words: number; readings: number }>(env.DB_AR,
          `SELECT d.slug, d.title, d.title_ar, d.cover_key,
                  (SELECT COUNT(*) FROM ar_daily_theme t WHERE t.domain_id = d.id AND t.is_published = 1) AS themes,
                  (SELECT COUNT(*) FROM ar_daily_word w JOIN ar_daily_theme t ON t.id = w.theme_id AND t.is_published = 1 WHERE t.domain_id = d.id) AS words,
                  (SELECT COUNT(*) FROM ar_daily_reading r WHERE r.domain_id = d.id AND r.is_published = 1) AS readings
             FROM ar_curriculum_domain d WHERE d.map_id = ?`, [node.map_id]))
      : [];
    const ps = new Map(placeStates.map((p) => [p.slug, p]));
    const liveCache = new Map<string, Live | null>(placeSlug ? [[placeSlug, live]] : []);
    const liveFor = async (d: string | null) => { if (!d) return null; if (!liveCache.has(d)) liveCache.set(d, await loadLive(env, d)); return liveCache.get(d)!; };
    const artifactsBelow = (r: MapRow): MapRow[] => (kids.get(r.id) ?? []).flatMap((c) => c.type === 'artifact' ? [c] : c.type === 'stop' ? artifactsBelow(c) : []);

    const nodes = [];
    for (const m of canvas.markers) {
      const r = m.row, base = { id: r.id, type: r.type, kind: r.kind, x: m.x, y: m.y, zone: m.zone, domain: domainOf(r) };
      if (r.type === 'artifact') {
        const d = base.domain;
        const res = resolveArtifact(r, await liveFor(d), d === placeSlug ? vocabCount : (d ? (await vocabOf(env, (await liveFor(d))!, all)).count : 0));
        nodes.push({ ...base, ref: r.ref, ...res, state: res.open ? 'open' : 'locked', open: undefined });
      } else if (r.type === 'portal') {
        const t = await queryOne<{ title: string; title_ar: string | null; image_key: string | null }>(env.DB_AR, `SELECT title, title_ar, image_key FROM ar_map WHERE id = ?`, [r.ref ?? '']);
        nodes.push({ ...base, ref: r.ref, title: r.title_en ?? t?.title ?? '', titleAr: r.title_ar ?? t?.title_ar ?? null, caption: MAP_WORDS.portal(t?.title ?? r.title_en ?? ''),
                     picture: asset(t?.image_key ?? null), icon: r.icon ?? 'arrow.triangle.turn.up.right.diamond.fill', state: 'open' });
      } else if (r.kind === 'place' && r.domain && ps.has(r.domain)) {
        const p = ps.get(r.domain)!, open = p.themes + p.readings > 0;
        nodes.push({ ...base, ref: null, title: p.title, titleAr: p.title_ar, picture: asset(r.picture_key ?? p.cover_key), icon: r.icon ?? 'house.fill', state: open ? 'open' : 'locked',
                     caption: open ? [p.readings > 0 ? WORLD_WORDS.reading(p.readings) : null, p.words > 0 ? WORLD_WORDS.words(p.words) : null].filter(Boolean).join(' · ') : MAP_WORDS.soon });
      } else {
        // a side, a room or any other stop: open when something live sits under it
        const arts = artifactsBelow(r);
        let liveBelow = 0;
        for (const a of arts) { const d = domainOf(a); const l = await liveFor(d); if (resolveArtifact(a, l, d === placeSlug ? vocabCount : 0).open) liveBelow++; }
        const places = (kids.get(r.id) ?? []).filter((c) => c.kind === 'place').length;
        nodes.push({ ...base, ref: null, title: r.title_en ?? '', titleAr: r.title_ar, picture: asset(r.picture_key), icon: r.icon ?? 'map.fill',
                     state: liveBelow > 0 || places > 0 ? 'open' : 'locked', caption: liveBelow > 0 ? MAP_WORDS.toExplore(liveBelow) : places > 0 ? MAP_WORDS.inside(places) : MAP_WORDS.soon });
      }
    }
    const zones = canvas.zones.map((z) => ({ id: z.row.id, title: z.row.title_en ?? '', titleAr: z.row.title_ar, x: z.x, y: z.y, w: z.w, h: z.h,
                                              tint: z.row.color, icon: z.row.icon, count: z.markers, reveal: z.reveal,
                                              caption: z.markers ? '' : MAP_WORDS.soon, isRoom: z.row.kind === 'room', parent: z.parentZone }));
    const s = settingsOf(node);
    const openCount = nodes.filter((n) => n.state === 'open' && n.type !== 'portal').length, all2 = nodes.filter((n) => n.type !== 'portal').length;
    return ok({
      node: { id: node.id, type: node.type, kind: node.kind, title: node.title_en ?? (node.kind === 'world' ? world?.title : null) ?? live?.domain.title ?? '',
              titleAr: node.title_ar ?? (node.kind === 'world' ? world?.title_ar : null) ?? live?.domain.title_ar ?? null, icon: node.icon,
              picture: asset(node.picture_key ?? (node.kind === 'world' ? world?.image_key ?? null : live?.domain.cover ?? null)),
              domain: placeSlug, settings: { zoom: s.zoom ?? null, sound: s.sound ?? null },
              breadcrumbs: chain.slice(0, -1).map((c) => ({ id: c.id, title: c.title_en ?? (c.kind === 'world' ? world?.title : '') ?? '', titleAr: c.title_ar ?? (c.kind === 'world' ? world?.title_ar ?? null : null) })) },
      world: { w: canvas.w, h: canvas.h, node: canvas.marker.badge, palette: paletteOf(era), path: { start: [0.5, 0], curves: [] }, scenery: [],
               gate: hasPicture ? { x: 0.5, y: 0.5, w: 1, h: 1 } : null, mode: 'picture', marker: canvas.marker, arabicFirst: true },
      zones, nodes,
      progress: { open: openCount, all: all2, label: all2 ? `${openCount} of ${all2} open` : MAP_WORDS.soon },
    });
  });
}
