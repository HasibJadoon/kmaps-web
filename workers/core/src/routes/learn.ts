// ─── /core/learn/* — the path ─────────────────────────────────────────────────
//
//   GET /core/learn/tracks             — the menu: what you can work through
//   GET /core/learn/path?track=…       — one track, unit by unit, with progress
//
// A path, not a list. The difference is that a path tells you where you are:
// what is behind you, what is next, and what is not open yet. A deck of 265
// cards tells you none of that, which is why the SRS home can be complete and
// still feel like nowhere.
//
// Four tracks, because they are the four shapes the corpus actually has:
//
//   surah      one sūrah, passage by passage
//   corpus     sūrah to sūrah, the whole Qurʾān as one path
//   worldview  by concept
//   arabic     by grammar and vocabulary
//
// PROGRESS IS DERIVED, NEVER STORED. Every number here is counted out of
// `core_srs_card` at read time — how many cards the unit holds, how many have
// reached review state, how many are due. A stored "percent complete" is a
// number that goes stale the moment a card is reviewed, and then has to be
// repaired by a job nobody remembers to run.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query } from '../../../shared/src/db';
import type { CoreEnv } from '../env';

/** Where a unit stands for this learner. */
type UnitState = 'locked' | 'open' | 'started' | 'done';

interface Unit {
  key: string;
  title: string;
  subtitle: string | null;
  /** How many cards this unit holds, for this learner. */
  cards: number;
  /** Cards that have graduated to review — the honest measure of "learned". */
  known: number;
  due: number;
  state: UnitState;
}

/** A unit is done when everything in it has graduated; started when anything
 *  has; open when it holds cards nobody has touched. Locked is for units that
 *  hold nothing yet AND sit behind one that is not done — a path should show
 *  what is coming without pretending it is ready. */
function stateOf(cards: number, known: number, previousDone: boolean): UnitState {
  if (cards === 0) return previousDone ? 'open' : 'locked';
  if (known >= cards) return 'done';
  if (known > 0) return 'started';
  return 'open';
}

/** Counts per scope key, in one query rather than one per unit. */
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

/** Fold per-ref counts into a unit by prefix — "44:1", "44:2" … into "44". */
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

/** The passages of a sūrah, from the domain that owns them. CORE never binds
 *  km_quran directly — it asks the Qurʾān worker, the same rule the sensor
 *  engine follows. A failure costs the passage titles, not the path: the track
 *  falls back to āyah-numbered units so the screen still works offline of it. */
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
  // ── The menu ───────────────────────────────────────────────────────────────

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

    // Which sūrahs this learner actually holds, so the surah track opens on
    // something real rather than on a list of 114 empty rings.
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

    // Three domains, and everything else is a level inside one of them. The
    // Qurʾān is not two tracks ("the corpus" and "one sūrah") — it is one, and
    // a sūrah is a level down it.
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

  // ── One track ──────────────────────────────────────────────────────────────

  router.get('/core/learn/path', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const track = url.searchParams.get('track') ?? 'corpus';

    // One track, three depths. Which level you get is decided by how much of
    // the scope you named — the same way you would say it out loud: "the
    // Qurʾān", "sūrah 44", "44:1–9".
    const surah = Number(url.searchParams.get('surah') ?? '0');
    const from = Number(url.searchParams.get('from') ?? '0');
    const to = Number(url.searchParams.get('to') ?? '0');

    switch (track) {
      case 'quran':
      case 'corpus':                                   // the old name, still answered
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

  // ── The four shapes ────────────────────────────────────────────────────────

  /** One sūrah, passage by passage. Passage boundaries come from the Qurʾān
   *  worker; when it cannot be reached the units become āyah groups so the path
   *  still draws. */
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
      // No passage list: fall back to the āyāt this learner actually holds,
      // in order. Honest about being a coarser path rather than empty.
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

  /** One passage, step by step — the level below a passage.
   *
   *  The steps are the study bands the reader already knows from the passage
   *  screen. Which cards belong to which step is a mapping of card kinds onto
   *  those bands, written out here rather than stored: the kinds were authored
   *  by several different builders over months, and a stored mapping would be a
   *  second place to correct every time a new kind appears. `other` catches
   *  what has not been mapped, so a card is never silently dropped from a
   *  learner's own path. */
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

    // Fixed order, and every step shown whether or not it holds anything — the
    // path is the shape of studying a passage, and a missing band is a real
    // state worth seeing rather than an absence to hide.
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
      if (key === 'other' && cards === 0) continue;   // not a band, just a catch
      const state = stateOf(cards, known, previousDone);
      units.push({
        key: `${surah}:${from}-${to}:${key}`,
        title,
        subtitle: cards === 0 ? 'nothing here yet' : `${cards} ${cards === 1 ? 'card' : 'cards'}`,
        cards, known, due: Number(r?.due ?? 0), state,
      });
      previousDone = state === 'done';
    }
    return { track: 'quran', scope: `${surah}:${from}-${to}`, units, level: 'step' };
  }

  /** Sūrah to sūrah. */
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
    const units: Unit[] = [];
    let previousDone = true;
    for (const surah of [...bySurah.keys()].sort((a, b) => a - b)) {
      const c = bySurah.get(surah)!;
      const state = stateOf(c.cards, c.known, previousDone);
      units.push({
        key: String(surah), title: `Sūrah ${surah}`,
        subtitle: `${c.cards} ${c.cards === 1 ? 'card' : 'cards'}`,
        ...c, state,
      });
      previousDone = state === 'done';
    }
    return { track: 'quran', scope: null, units, level: 'surah' };
  }

  /** A module grouped by whatever it files cards under — the concept domain for
   *  worldviews, the card kind for Arabic. */
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

  /** Arabic spans two modules — AR is the language, AL is the linguistics of
   *  it — and a learner does not experience those as separate subjects. */
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
