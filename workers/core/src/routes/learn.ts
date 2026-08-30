import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query } from '../../../shared/src/db';
import type { CoreEnv } from '../env';

type UnitState = 'locked' | 'open' | 'started' | 'done';

interface Unit {
  key: string;
  title: string;
  subtitle: string | null;

  cards: number;

  known: number;
  due: number;
  state: UnitState;
}

function stateOf(cards: number, known: number, previousDone: boolean): UnitState {
  if (cards === 0) return previousDone ? 'open' : 'locked';
  if (known >= cards) return 'done';
  if (known > 0) return 'started';
  return 'open';
}

async function countsByPrefix(
  env: CoreEnv, userId: string, module: string,
): Promise<Map<string, { cards: number; known: number; due: number }>> {
  const rows = await query<{
    ref: string; cards: number; known: number; due: number;
  }>(
    env.DB_CORE,
    `SELECT resource_ref AS ref,
            COUNT(*) AS cards,
            SUM(CASE WHEN card_state = 'review' THEN 1 ELSE 0 END) AS known,
            SUM(CASE WHEN suspended = 0
                      AND (next_review_at IS NULL
                           OR datetime(next_review_at) <= datetime('now'))
                     THEN 1 ELSE 0 END) AS due
       FROM core_srs_card
      WHERE user_ref = ? AND module = ?
      GROUP BY resource_ref`,
    [userId, module],
  );
  const out = new Map<string, { cards: number; known: number; due: number }>();
  for (const r of rows) {
    out.set(String(r.ref ?? ''), {
      cards: Number(r.cards ?? 0),
      known: Number(r.known ?? 0),
      due: Number(r.due ?? 0),
    });
  }
  return out;
}

function foldByPrefix(
  counts: Map<string, { cards: number; known: number; due: number }>,
  matches: (ref: string) => boolean,
) {
  let cards = 0, known = 0, due = 0;
  for (const [ref, c] of counts) {
    if (!matches(ref)) continue;
    cards += c.cards; known += c.known; due += c.due;
  }
  return { cards, known, due };
}

async function builtSurahs(
  env: CoreEnv,
): Promise<{ surah: number; passages: number; title: string }[]> {
  if (!env.QURAN) return [];
  try {
    const res = await env.QURAN.fetch(new Request(
      'http://internal.k-maps.local/qr/internal/study-surahs',
      { method: 'POST' },
    ));
    if (!res.ok) return [];
    const body = await res.json<{ data?: { surahs?: Array<Record<string, unknown>> } }>();
    return (body?.data?.surahs ?? []).map((row) => {
      const surah = Number(row['surah'] ?? 0);
      const name = typeof row['name_tr'] === 'string' && row['name_tr']
        ? String(row['name_tr'])
        : typeof row['name_en'] === 'string' ? String(row['name_en']) : '';
      return {
        surah,
        passages: Number(row['passages'] ?? 0),
        title: name ? `${surah} · ${name}` : `Sūrah ${surah}`,
      };
    }).filter((s) => s.surah > 0);
  } catch {
    return [];
  }
}

async function passagesOf(
  env: CoreEnv, surah: number,
): Promise<{ no: number; from: number; to: number; title: string | null }[]> {
  if (!env.QURAN) return [];
  try {
    const res = await env.QURAN.fetch(new Request(
      `http://internal.k-maps.local/qr/study/surahs/${surah}`,
    ));
    if (!res.ok) return [];
    const body = await res.json<{ data?: { units?: Array<Record<string, unknown>> } }>();
    const units = body?.data?.units ?? [];
    return units.map((u) => ({
      no: Number(u['passage_no'] ?? 0),
      from: Number(u['ayah_from'] ?? 0),
      to: Number(u['ayah_to'] ?? 0),
      title: typeof u['title'] === 'string' ? u['title'] : null,
    })).filter((u) => u.no > 0);
  } catch {
    return [];
  }
}

export function learnRoutes(router: Router<CoreEnv>): void {

  router.get('/core/learn/tracks', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const rows = await query<{ module: string; cards: number; known: number; due: number }>(
      env.DB_CORE,
      `SELECT module,
              COUNT(*) AS cards,
              SUM(CASE WHEN card_state = 'review' THEN 1 ELSE 0 END) AS known,
              SUM(CASE WHEN suspended = 0
                        AND (next_review_at IS NULL
                             OR datetime(next_review_at) <= datetime('now'))
                       THEN 1 ELSE 0 END) AS due
         FROM core_srs_card
        WHERE user_ref = ?
        GROUP BY module`,
      [ctx.userId],
    );
    const byModule = new Map(rows.map((r) => [r.module, r]));
    const qr = byModule.get('QR');

    const surahs = await query<{ surah: number; cards: number; known: number }>(
      env.DB_CORE,
      `SELECT CAST(substr(resource_ref, 1, instr(resource_ref || ':', ':') - 1) AS INTEGER) AS surah,
              COUNT(*) AS cards,
              SUM(CASE WHEN card_state = 'review' THEN 1 ELSE 0 END) AS known
         FROM core_srs_card
        WHERE user_ref = ? AND module = 'QR' AND resource_ref GLOB '[0-9]*'
        GROUP BY surah
        HAVING surah > 0
        ORDER BY surah`,
      [ctx.userId],
    );

    const track = (key: string, title: string, subtitle: string, m?: typeof rows[number]) => ({
      key, title, subtitle,
      cards: Number(m?.cards ?? 0),
      known: Number(m?.known ?? 0),
      due: Number(m?.due ?? 0),
    });

    const ar = byModule.get('AR');
    const al = byModule.get('AL');
    const arabic = {
      module: 'AR',
      cards: Number(ar?.cards ?? 0) + Number(al?.cards ?? 0),
      known: Number(ar?.known ?? 0) + Number(al?.known ?? 0),
      due: Number(ar?.due ?? 0) + Number(al?.due ?? 0),
    };

    return ok({
      tracks: [

        track('quran', 'The Qurʾān', 'Sūrah · passage · step', qr),
        track('worldview', 'Worldviews', 'Concept by concept', byModule.get('WV')),
        track('arabic', 'Arabic', 'Grammar and vocabulary', arabic),
      ],
      surahs: surahs.map((s) => ({
        surah: Number(s.surah), cards: Number(s.cards), known: Number(s.known),
      })),
    });
  });

  router.get('/core/learn/path', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const track = url.searchParams.get('track') ?? 'corpus';

    const surah = Number(url.searchParams.get('surah') ?? '0');
    const from = Number(url.searchParams.get('from') ?? '0');
    const to = Number(url.searchParams.get('to') ?? '0');

    switch (track) {
      case 'quran':
      case 'corpus':
        if (surah > 0 && from > 0 && to > 0) {
          return ok(await stepPath(env, ctx.userId, surah, from, to));
        }
        if (surah > 0) return ok(await surahPath(env, ctx.userId, surah));
        return ok(await corpusPath(env, ctx.userId));
      case 'surah': {
        if (!(surah > 0)) return badRequest('surah is required for this track');
        return ok(await surahPath(env, ctx.userId, surah));
      }
      case 'worldview': return ok(await modulePath(env, ctx.userId, 'WV', 'Worldviews'));
      case 'arabic':    return ok(await arabicPath(env, ctx.userId));
      default:          return badRequest(`unknown track: ${track}`);
    }
  });

  async function surahPath(env: CoreEnv, userId: string, surah: number) {
    const counts = await countsByPrefix(env, userId, 'QR');
    const passages = await passagesOf(env, surah);
    const units: Unit[] = [];
    let previousDone = true;

    const ayahOf = (ref: string): number | null => {
      const [s, a] = ref.split(':');
      return Number(s) === surah && a ? Number(a) : null;
    };

    if (passages.length) {
      for (const p of passages) {
        const c = foldByPrefix(counts, (ref) => {
          const a = ayahOf(ref);
          return a !== null && a >= p.from && a <= p.to;
        });
        const state = stateOf(c.cards, c.known, previousDone);
        units.push({
          key: `${surah}:${p.from}-${p.to}`,
          title: p.title || `Passage ${p.no}`,
          subtitle: `${surah}:${p.from}–${p.to}`,
          ...c, state,
        });
        previousDone = state === 'done';
      }
    } else {

      const refs = [...counts.keys()]
        .filter((r) => ayahOf(r) !== null)
        .sort((a, b) => (ayahOf(a)! - ayahOf(b)!));
      for (const ref of refs) {
        const c = counts.get(ref)!;
        const state = stateOf(c.cards, c.known, previousDone);
        units.push({ key: ref, title: ref, subtitle: null, ...c, state });
        previousDone = state === 'done';
      }
    }
    return { track: 'quran', scope: String(surah), units, level: 'passage' };
  }

  async function stepPath(
    env: CoreEnv, userId: string, surah: number, from: number, to: number,
  ) {
    const rows = await query<{
      step: string; cards: number; known: number; due: number;
    }>(
      env.DB_CORE,
      `SELECT CASE
                WHEN module = 'WV' THEN 'worldview'
                WHEN card_kind IN ('translation','context') THEN 'reading'
                WHEN resource_type IN ('lemma','word','root')
                  OR card_kind IN ('morphology','vocabulary','senses','root_dna',
                                   'root_sense','root_gov','sarf')
                  THEN 'vocabulary'
                WHEN card_kind IN ('nahw','irab','structure') THEN 'sentence_structure'
                WHEN card_kind IN ('balagha','expression','furuq') THEN 'tafsir'
                ELSE 'other'
              END AS step,
              COUNT(*) AS cards,
              SUM(CASE WHEN card_state = 'review' THEN 1 ELSE 0 END) AS known,
              SUM(CASE WHEN suspended = 0
                        AND (next_review_at IS NULL
                             OR datetime(next_review_at) <= datetime('now'))
                       THEN 1 ELSE 0 END) AS due
         FROM core_srs_card
        WHERE user_ref = ?
          AND ((resource_ref GLOB ?
                AND CAST(substr(resource_ref, instr(resource_ref, ':') + 1) AS INTEGER)
                    BETWEEN ? AND ?)
            OR (intro_surah = ? AND intro_ayah BETWEEN ? AND ?))
        GROUP BY step`,
      [userId, `${surah}:*`, from, to, surah, from, to],
    );

    const ORDER: Array<[string, string]> = [
      ['reading', 'Reading'],
      ['vocabulary', 'Vocabulary'],
      ['sentence_structure', 'Sentence structure'],
      ['tafsir', 'Tafsīr and balāgha'],
      ['worldview', 'Worldview'],
      ['other', 'Everything else'],
    ];
    const found = new Map(rows.map((r) => [r.step, r]));
    const units: Unit[] = [];
    let previousDone = true;
    for (const [key, title] of ORDER) {
      const r = found.get(key);
      const cards = Number(r?.cards ?? 0), known = Number(r?.known ?? 0);
      if (key === 'other' && cards === 0) continue;
      const state = stateOf(cards, known, previousDone);
      units.push({
        key: `${surah}:${from}-${to}:${key}`,
        title,
        subtitle: cards === 0 ? 'nothing here yet' : `${cards} ${cards === 1 ? 'card' : 'cards'}`,
        cards, known, due: Number(r?.due ?? 0), state,
      });
      previousDone = state === 'done';
    }

    const whole = rows.reduce(
      (acc, r) => ({
        cards: acc.cards + Number(r.cards ?? 0),
        known: acc.known + Number(r.known ?? 0),
        due: acc.due + Number(r.due ?? 0),
      }),
      { cards: 0, known: 0, due: 0 },
    );
    if (whole.cards > 0) {
      units.push({
        key: `${surah}:${from}-${to}:review`,
        title: 'Passage review',
        subtitle: `all ${whole.cards} together`,
        cards: whole.cards,
        known: whole.known,
        due: whole.due,

        state: previousDone ? stateOf(whole.cards, whole.known, true) : 'locked',
      });
    }
    return { track: 'quran', scope: `${surah}:${from}-${to}`, units, level: 'step' };
  }

  async function corpusPath(env: CoreEnv, userId: string) {
    const counts = await countsByPrefix(env, userId, 'QR');
    const bySurah = new Map<number, { cards: number; known: number; due: number }>();
    for (const [ref, c] of counts) {
      const surah = Number(ref.split(':')[0]);
      if (!Number.isFinite(surah) || surah <= 0) continue;
      const acc = bySurah.get(surah) ?? { cards: 0, known: 0, due: 0 };
      bySurah.set(surah, {
        cards: acc.cards + c.cards, known: acc.known + c.known, due: acc.due + c.due,
      });
    }

    const built = await builtSurahs(env);

    const order = [...new Set([
      ...built.map((b) => b.surah),
      ...bySurah.keys(),
    ])].sort((a, b) => a - b);
    const titles = new Map(built.map((b) => [b.surah, b.title]));
    const passages = new Map(built.map((b) => [b.surah, b.passages]));

    const units: Unit[] = [];
    let previousDone = true;
    for (const surah of order) {
      const c = bySurah.get(surah) ?? { cards: 0, known: 0, due: 0 };
      const state = stateOf(c.cards, c.known, previousDone);
      const passageCount = passages.get(surah) ?? 0;
      units.push({
        key: String(surah),
        title: titles.get(surah) ?? `Sūrah ${surah}`,
        subtitle: c.cards > 0
          ? `${c.cards} ${c.cards === 1 ? 'card' : 'cards'}`
          : passageCount > 0
            ? `${passageCount} ${passageCount === 1 ? 'passage' : 'passages'}`
            : 'not built yet',
        ...c, state,
      });
      previousDone = state === 'done';
    }
    return { track: 'quran', scope: null, units, level: 'surah' };
  }

  async function modulePath(env: CoreEnv, userId: string, module: string, _label: string) {
    const rows = await query<{
      bucket: string | null; cards: number; known: number; due: number;
    }>(
      env.DB_CORE,
      `SELECT COALESCE(concept_domain, concept_topic, 'Other') AS bucket,
              COUNT(*) AS cards,
              SUM(CASE WHEN card_state = 'review' THEN 1 ELSE 0 END) AS known,
              SUM(CASE WHEN suspended = 0
                        AND (next_review_at IS NULL
                             OR datetime(next_review_at) <= datetime('now'))
                       THEN 1 ELSE 0 END) AS due
         FROM core_srs_card
        WHERE user_ref = ? AND module = ?
        GROUP BY bucket
        ORDER BY cards DESC`,
      [userId, module],
    );
    const units: Unit[] = [];
    let previousDone = true;
    for (const r of rows) {
      const cards = Number(r.cards ?? 0), known = Number(r.known ?? 0);
      const state = stateOf(cards, known, previousDone);
      units.push({
        key: r.bucket ?? 'other',
        title: r.bucket ?? 'Other',
        subtitle: `${cards} ${cards === 1 ? 'card' : 'cards'}`,
        cards, known, due: Number(r.due ?? 0), state,
      });
      previousDone = state === 'done';
    }
    return { track: module === 'WV' ? 'worldview' : module.toLowerCase(),
             scope: null, units, level: 'group' };
  }

  async function arabicPath(env: CoreEnv, userId: string) {
    const rows = await query<{
      bucket: string | null; cards: number; known: number; due: number;
    }>(
      env.DB_CORE,
      `SELECT COALESCE(card_kind, resource_type, 'Other') AS bucket,
              COUNT(*) AS cards,
              SUM(CASE WHEN card_state = 'review' THEN 1 ELSE 0 END) AS known,
              SUM(CASE WHEN suspended = 0
                        AND (next_review_at IS NULL
                             OR datetime(next_review_at) <= datetime('now'))
                       THEN 1 ELSE 0 END) AS due
         FROM core_srs_card
        WHERE user_ref = ? AND module IN ('AR','AL')
        GROUP BY bucket
        ORDER BY cards DESC`,
      [userId],
    );
    const units: Unit[] = [];
    let previousDone = true;
    for (const r of rows) {
      const cards = Number(r.cards ?? 0), known = Number(r.known ?? 0);
      const state = stateOf(cards, known, previousDone);
      units.push({
        key: r.bucket ?? 'other',
        title: (r.bucket ?? 'Other').replace(/_/g, ' '),
        subtitle: `${cards} ${cards === 1 ? 'card' : 'cards'}`,
        cards, known, due: Number(r.due ?? 0), state,
      });
      previousDone = state === 'done';
    }
    return { track: 'arabic', scope: null, units, level: 'group' };
  }
}
