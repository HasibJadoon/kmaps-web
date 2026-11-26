import type { Router } from '../../../shared/src/router';
import { ok, unauthorized } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import { actorRef } from '../../../shared/src/auth';
import { callService } from '../../../shared/src/service-client';
import type { QuranEnv } from '../env';

// ── Tafsīr translation practice — the owner's progress, read-only (qr_187) ───────────────────────
// The owner translates a tafsīr sentence by sentence; each try is a row (qr_tafsir_practice_attempt) and the
// words / grammar points missed live in one register (qr_tafsir_practice_weak). Writes come from
// kmaps-resources/scripts/quran/tafsir_practice.py, never from these routes.
//
//   GET /qr/tafsir-practice/summary?passage=QR:SP:40:23-27|surah=40   per passage (or per sūra, or all): sentences done, verdict counts, weak count
//   GET /qr/tafsir-practice/attempts?passage=…&source=…      the sentences in seq order (latest try of each, tries counted)
//   GET /qr/tafsir-practice/weak?status=&kind=&passage=      the register: priority, then misses − hits, then how common in the tafsīrs
//   GET /qr/tafsir-practice/core                              the tafsīr-language core list (active items) by tier, with the reader's progress, + the tier-1 summary
//   GET /qr/tafsir-practice/core/summary                      just the tier-1 summary
//
// Private: the gateway forwards the caller as X-KM-User-Id (modules.ts privateGetPaths) and every query is scoped to it.
// Not in the SWR keep list (index.ts): one reader's progress is never shared through the edge cache.
// All labels, colours and English are shaped here; the apps only render.

const VERDICTS: Record<string, { label: string; color: string; rank: number; hint: string }> = {
  right:  { label: 'Right',         color: '#5aad88', rank: 3, hint: 'Nothing to fix' },
  mostly: { label: 'Mostly right',  color: '#8fb6e8', rank: 2, hint: 'Small slips' },
  partly: { label: 'Partly right',  color: '#d4924a', rank: 1, hint: 'Some of the meaning is off' },
  wrong:  { label: 'Not yet',       color: '#c0504f', rank: 0, hint: 'The meaning is missed' },
};
const KINDS: Record<string, { label: string; labelAr: string }> = {
  word:    { label: 'Word',       labelAr: 'كلمة' },
  phrase:  { label: 'Phrase',     labelAr: 'عبارة' },
  grammar: { label: 'Grammar',    labelAr: 'نحو' },
  vowel:   { label: 'Vowel',      labelAr: 'تشكيل' },
  style:   { label: 'Style',      labelAr: 'أسلوب' },
};
const STATUSES: Record<string, { label: string; color: string }> = {
  weak:      { label: 'Weak',      color: '#c0504f' },
  improving: { label: 'Improving', color: '#d4924a' },
  known:     { label: 'Known',     color: '#5aad88' },
  drilled:   { label: 'Drilled',   color: '#8fb6e8' },
};

const POINT_KINDS: Record<string, { label: string; hint: string; icon: string; color: string }> = {
  method:    { label: 'What the scholar is doing', hint: 'His method in this sentence', icon: 'wand.and.stars', color: '#9b8bd9' },
  key_point: { label: 'What the āyah means',       hint: 'The point he makes',          icon: 'key',            color: '#e8c96a' },
  link:      { label: 'A parallel āyah',           hint: 'Where else the Qurʾān says it', icon: 'link',         color: '#8fb6e8' },
};

const parseJson = <T>(s: string | null | undefined, fallback: T): T => {
  try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
};

type Attempt = { id: string; session_id: string | null; passage_id: string | null; surah: number; ayah_from: number; ayah_to: number;
  source_slug: string; block_id: string | null; page: string | null; seq: number; text_ar: string; my_en: string;
  model_en: string | null; model_ur: string | null; model_en_literal: string | null; verdict: string; issues_json: string; tafsir_points_json: string | null; context_note: string | null; try_n: number; created_at: string };
type Weak = { id: string; kind: string; key: string; label_ar: string | null; label_en: string; root_id: string | null; root: string | null;
  contrast_ar: string | null; example_ar: string | null; miss_n: number; hit_n: number; status: string; last_miss_at: string | null;
  last_hit_at: string | null; lesson_doc_id: string | null;
  priority: number | null; corpus_n: number | null; is_rule: number | null };
type Source = { source_slug: string; book_title_ar: string | null; book_title_en: string | null;
  author_name_ar: string | null; author_name_en: string | null };

const verdictOf = (v: string) => ({ key: v, ...(VERDICTS[v] ?? VERDICTS.wrong) });

async function sources(env: QuranEnv, slugs: string[]): Promise<Map<string, Source>> {
  if (!slugs.length) return new Map();
  const rows = await query<Source>(env.DB_QR,
    `SELECT source_slug, book_title_ar, book_title_en, author_name_ar, author_name_en
       FROM qr_tafsir_book_display_source WHERE source_slug IN (${slugs.map(() => '?').join(',')})`, slugs);
  return new Map(rows.map((r) => [r.source_slug, r]));
}

const sourceOut = (slug: string, s?: Source) => ({
  slug, titleAr: s?.book_title_ar ?? null, titleEn: s?.book_title_en ?? slug,
  authorAr: s?.author_name_ar ?? null, authorEn: s?.author_name_en ?? null,
});

type Deck = { doc_id: string; slug: string; title: string; slide_count: number };

/// The lesson decks (km_content) the given doc ids name, by doc id. Optional: when CM is down a lesson opens by its doc id.
async function deckMap(env: QuranEnv, ids: Array<string | null>): Promise<Map<string, Deck>> {
  const wanted = new Set(ids.filter((x): x is string => !!x));
  const decks = new Map<string, Deck>();
  if (!wanted.size) return decks;
  const list = await callService<{ data?: Deck[] }>(env.CONTENT, '/cm/decks').then((r) => r.data ?? [])
    .catch((e) => { console.warn('[tafsir-practice] cm/decks unavailable; a lesson opens by its doc id', e); return [] as Deck[]; });
  for (const d of list) if (wanted.has(d.doc_id)) decks.set(d.doc_id, d);
  return decks;
}

function weakOut(w: Weak, decks: Map<string, Deck>) {
  const deck = w.lesson_doc_id ? decks.get(w.lesson_doc_id) : undefined;
  const k = KINDS[w.kind] ?? { label: w.kind, labelAr: '' };
  const st = STATUSES[w.status] ?? STATUSES.weak;
  const seen = w.miss_n + w.hit_n;
  return {
    id: w.id, kind: w.kind, kindLabel: k.label, kindLabelAr: k.labelAr,
    labelAr: w.label_ar ?? (w.kind === 'grammar' ? null : w.key), labelEn: w.label_en,
    root: w.root, rootId: w.root_id,
    contrastAr: w.contrast_ar, exampleAr: w.example_ar,
    missN: w.miss_n, hitN: w.hit_n,
    // "missed 2 · right 1"
    tally: `missed ${w.miss_n} · right ${w.hit_n}`,
    hitShare: seen ? Math.round((w.hit_n / seen) * 100) : 0,
    status: w.status, statusLabel: st.label, statusColor: st.color,
    lastMissAt: w.last_miss_at, lastHitAt: w.last_hit_at,
    // the lesson deck that teaches it (km_content): the apps open it in their deck player
    priority: w.priority,
    isRule: !!w.is_rule,
    badge: w.is_rule ? 'Translation rule' : null,
    corpusN: w.corpus_n,
    freqLabel: w.corpus_n ? `used ${w.corpus_n.toLocaleString('en-US')}× in the tafsīrs` : null,
    lessonDocId: w.lesson_doc_id,
    lessonSlug: w.lesson_doc_id ? (deck?.slug ?? w.lesson_doc_id) : null,   // the deck route takes a slug or a doc id
    lessonTitle: deck?.title ?? null,
    lessonLabel: w.lesson_doc_id ? (deck?.slide_count ? `Learn it · ${deck.slide_count} slides` : 'Learn it') : null,
  };
}

export function tafsirPracticeRoutes(router: Router<QuranEnv>) {
  router.get('/qr/tafsir-practice/summary', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const sp = new URL(req.url).searchParams;
    const passage = sp.get('passage'), surah = Number(sp.get('surah'));
    const args: unknown[] = [user];
    let where = 'user_ref = ?';
    if (passage) { where += ' AND passage_id = ?'; args.push(passage); }
    if (Number.isInteger(surah) && surah > 0) { where += ' AND surah = ?'; args.push(surah); }
    // the latest try of each sentence is the one that counts
    const rows = await query<Attempt>(env.DB_QR,
      `SELECT a.* FROM qr_tafsir_practice_attempt a
        WHERE ${where.replace(/\b(user_ref|passage_id)\b/g, 'a.$1')}
          AND a.try_n = (SELECT MAX(b.try_n) FROM qr_tafsir_practice_attempt b
                          WHERE b.user_ref = a.user_ref AND b.passage_id IS a.passage_id
                            AND b.source_slug = a.source_slug AND b.seq = a.seq)
        ORDER BY a.passage_id, a.source_slug, a.seq`, args);
    const weakRows = await query<{ passage_id: string | null; n: number }>(env.DB_QR,
      `SELECT t.passage_id, COUNT(DISTINCT w.id) AS n
         FROM qr_tafsir_practice_weak w
         JOIN qr_tafsir_practice_attempt t ON t.id = w.first_attempt
        WHERE w.user_ref = ? AND w.status IN ('weak','improving')${passage ? ' AND t.passage_id = ?' : ''}
        GROUP BY t.passage_id`, passage ? [user, passage] : [user]);
    const weakBy = new Map(weakRows.map((r) => [r.passage_id ?? '', r.n]));
    const srcs = await sources(env, [...new Set(rows.map((r) => r.source_slug))]);

    const groups = new Map<string, Attempt[]>();
    for (const r of rows) {
      const key = `${r.passage_id ?? ''}|${r.source_slug}`;
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    const passages = [...groups.entries()].map(([key, list]) => {
      const f = list[0];
      const counts = Object.fromEntries(Object.keys(VERDICTS).map((v) => [v, list.filter((a) => a.verdict === v).length]));
      const best = list.filter((a) => a.verdict === 'right' || a.verdict === 'mostly').length;
      return {
        passageId: f.passage_id, surah: f.surah, ayahFrom: f.ayah_from, ayahTo: f.ayah_to,
        range: f.ayah_from === f.ayah_to ? `${f.surah}:${f.ayah_from}` : `${f.surah}:${f.ayah_from}–${f.ayah_to}`,
        source: sourceOut(f.source_slug, srcs.get(f.source_slug)),
        sentences: list.length, counts,
        verdicts: Object.keys(VERDICTS).map((v) => ({ ...verdictOf(v), n: counts[v] })),
        goodShare: list.length ? Math.round((best / list.length) * 100) : 0,
        weakOpen: weakBy.get(f.passage_id ?? '') ?? 0,
        lastAt: list.map((a) => a.created_at).sort().at(-1) ?? null,
        line: `${list.length} sentence${list.length === 1 ? '' : 's'} done · ${weakBy.get(f.passage_id ?? '') ?? 0} weak point${(weakBy.get(f.passage_id ?? '') ?? 0) === 1 ? '' : 's'}`,
        key,
      };
    });
    // a learner who has not practised this sūra yet still gets a starting passage: the first study passage whose
    // tafsīr sentences are cut, with nothing done — so the screen opens on it instead of on nothing
    if (!passages.length && !passage && Number.isInteger(surah) && surah > 0) {
      const start = await query<{ passage_id: string; source_slug: string; ayah_from: number; ayah_to: number }>(env.DB_QR,
        `SELECT s.passage_id, s.source_slug, p.ayah_from, p.ayah_to
           FROM qr_tafsir_sentence s JOIN qr_surah_study_passage p ON p.id = s.passage_id
          WHERE s.surah = ? AND s.status <> 'superseded'
          GROUP BY s.passage_id, s.source_slug ORDER BY p.ayah_from, s.source_slug LIMIT 1`, [surah]);
      const f = start[0];
      if (f) {
        const src = await sources(env, [f.source_slug]);
        const counts = Object.fromEntries(Object.keys(VERDICTS).map((v) => [v, 0]));
        passages.push({
          passageId: f.passage_id, surah, ayahFrom: f.ayah_from, ayahTo: f.ayah_to,
          range: f.ayah_from === f.ayah_to ? `${surah}:${f.ayah_from}` : `${surah}:${f.ayah_from}–${f.ayah_to}`,
          source: sourceOut(f.source_slug, src.get(f.source_slug)),
          sentences: 0, counts, verdicts: Object.keys(VERDICTS).map((v) => ({ ...verdictOf(v), n: 0 })),
          goodShare: 0, weakOpen: 0, lastAt: null, line: 'Not started yet', key: `${f.passage_id}|${f.source_slug}`,
        } as (typeof passages)[number]);
      }
    }
    return ok({ passages });
  });

  router.get('/qr/tafsir-practice/attempts', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const sp = new URL(req.url).searchParams;
    const passage = sp.get('passage'), source = sp.get('source');
    const args: unknown[] = [user];
    let where = 'a.user_ref = ?';
    if (passage) { where += ' AND a.passage_id = ?'; args.push(passage); }
    if (source) { where += ' AND a.source_slug = ?'; args.push(source); }
    const rows = await query<Attempt>(env.DB_QR,
      `SELECT a.* FROM qr_tafsir_practice_attempt a
        WHERE ${where}
          AND a.try_n = (SELECT MAX(b.try_n) FROM qr_tafsir_practice_attempt b
                          WHERE b.user_ref = a.user_ref AND b.passage_id IS a.passage_id
                            AND b.source_slug = a.source_slug AND b.seq = a.seq)
        ORDER BY a.source_slug, a.seq`, args);
    const ids = new Set<string>();
    const issuesOf = rows.map((r) => parseJson<Array<{ weak_id?: string; kind?: string; point?: string; note?: string | null }>>(r.issues_json, []));
    for (const l of issuesOf) for (const i of l) if (i.weak_id) ids.add(i.weak_id);
    const weak = ids.size
      ? await query<Weak>(env.DB_QR, `SELECT * FROM qr_tafsir_practice_weak WHERE user_ref = ? AND id IN (${[...ids].map(() => '?').join(',')})`, [user, ...ids])
      : [];
    const weakBy = new Map(weak.map((w) => [w.id, w]));
    const srcs = await sources(env, [...new Set(rows.map((r) => r.source_slug))]);
    return ok({
      attempts: rows.map((r, n) => ({
        id: r.id, seq: r.seq, page: r.page, tryN: r.try_n, sessionId: r.session_id, createdAt: r.created_at,
        source: sourceOut(r.source_slug, srcs.get(r.source_slug)),
        textAr: r.text_ar, myEn: r.my_en, modelEn: r.model_en, modelUr: r.model_ur, modelEnLiteral: r.model_en_literal,
        verdict: verdictOf(r.verdict),
        contextNote: r.context_note,
        tafsirPoints: parseJson<Array<{ kind?: string; point?: string; ayah_ref?: string | null }>>(r.tafsir_points_json, [])
          .filter((t) => t.point)
          .map((t) => {
            const k = POINT_KINDS[t.kind ?? ''] ?? { label: 'Point', hint: '', icon: 'circle', color: '#c9a84c' };
            return { kind: t.kind ?? 'key_point', kindLabel: k.label, icon: k.icon, color: k.color, point: t.point as string, ayahRef: t.ayah_ref ?? null };
          }),
        issues: issuesOf[n].map((i) => {
          const w = i.weak_id ? weakBy.get(i.weak_id) : undefined;
          const k = KINDS[i.kind ?? w?.kind ?? ''] ?? { label: i.kind ?? 'Point', labelAr: '' };
          return { weakId: i.weak_id ?? null, kind: i.kind ?? w?.kind ?? null, kindLabel: k.label, kindLabelAr: k.labelAr,
                   point: i.point ?? '', note: i.note ?? null, labelAr: w?.label_ar ?? null, contrastAr: w?.contrast_ar ?? null };
        }),
      })),
    });
  });

  router.get('/qr/tafsir-practice/weak', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const sp = new URL(req.url).searchParams;
    const status = sp.get('status'), kind = sp.get('kind'), passage = sp.get('passage');
    const args: unknown[] = [user];
    let where = 'w.user_ref = ?';
    if (status && STATUSES[status]) { where += ' AND w.status = ?'; args.push(status); }
    if (kind && KINDS[kind]) { where += ' AND w.kind = ?'; args.push(kind); }
    if (passage) { where += ' AND EXISTS (SELECT 1 FROM qr_tafsir_practice_attempt t WHERE t.user_ref = w.user_ref AND t.passage_id = ? AND t.issues_json LIKE \'%\' || w.id || \'%\')'; args.push(passage); }
    const rows = await query<Weak>(env.DB_QR,
      `SELECT w.* FROM qr_tafsir_practice_weak w WHERE ${where}
        ORDER BY COALESCE(w.priority, 9) ASC, (w.miss_n - w.hit_n) DESC, COALESCE(w.corpus_n, 0) DESC, w.updated_at DESC`, args);
    const decks = await deckMap(env, rows.map((w) => w.lesson_doc_id));
    const all = await query<{ status: string; kind: string; n: number }>(env.DB_QR,
      `SELECT status, kind, COUNT(*) AS n FROM qr_tafsir_practice_weak WHERE user_ref = ? GROUP BY status, kind`, [user]);
    const by = (field: 'status' | 'kind') => {
      const m = new Map<string, number>();
      for (const r of all) m.set(r[field], (m.get(r[field]) ?? 0) + r.n);
      return m;
    };
    const st = by('status'), kd = by('kind');
    return ok({
      weak: rows.map((w) => weakOut(w, decks)),
      statuses: Object.entries(STATUSES).map(([key, v]) => ({ key, label: v.label, color: v.color, n: st.get(key) ?? 0 })),
      kinds: Object.entries(KINDS).map(([key, v]) => ({ key, label: v.label, labelAr: v.labelAr, n: kd.get(key) ?? 0 })).filter((k) => k.n > 0),
    });
  });
}

// ── The tafsīr-language core list: what is worth mastering, by how often the tafsīrs use it ──────────
// qr_tafsir_lang_core (shared) + the reader's qr_tafsir_lang_core_progress. Only ACTIVE items are listed: a candidate is
// quizzed, never shown as "to learn" (owner rule) — right deletes it, a miss makes it active.

type Core = { id: string; kind: string; key: string; label_ar: string | null; label_en: string; how_en: string | null;
  corpus_n: number | null; books_n: number | null; tier: number; lesson_doc_id: string | null; example_ar: string | null };
type Prog = { core_id: string; seen_n: number; hit_n: number; miss_n: number; status: string; last_seen_at: string | null };

const TIERS: Record<number, { label: string; hint: string; color: string }> = {
  1: { label: 'Must master', hint: 'Used constantly — the tafsīrs lean on these on almost every page', color: '#e8c96a' },
  2: { label: 'Important',   hint: 'Common — worth knowing before you read widely',                       color: '#8fb6e8' },
  3: { label: 'Later',       hint: 'Useful, but they can wait',                                           color: '#9b8bd9' },
};
const CORE_KINDS: Record<string, { label: string; labelAr: string }> = {
  formula: { label: 'Formula',          labelAr: 'صيغة' },
  word:    { label: 'Word',             labelAr: 'كلمة' },
  phrase:  { label: 'Phrase',           labelAr: 'عبارة' },
  term:    { label: 'Term',             labelAr: 'مصطلح' },
  rule:    { label: 'Translation rule', labelAr: 'قاعدة' },
};
const MASTERY: Record<string, { label: string; color: string }> = {
  new:      { label: 'Not seen yet', color: '#8a8a8a' },
  learning: { label: 'Learning',     color: '#d4924a' },
  weak:     { label: 'Weak',         color: '#c0504f' },
  known:    { label: 'Known',        color: '#5aad88' },
};

async function coreRows(env: QuranEnv, user: string) {
  const [items, prog] = await Promise.all([
    query<Core>(env.DB_QR, `SELECT id, kind, key, label_ar, label_en, how_en, corpus_n, books_n, tier, lesson_doc_id, example_ar
                              FROM qr_tafsir_lang_core WHERE state = 'active'
                             ORDER BY tier ASC, COALESCE(corpus_n, 0) DESC`),
    query<Prog>(env.DB_QR, `SELECT core_id, seen_n, hit_n, miss_n, status, last_seen_at FROM qr_tafsir_lang_core_progress WHERE user_ref = ?`, [user]),
  ]);
  return { items, progBy: new Map(prog.map((p) => [p.core_id, p])) };
}

function coreSummary(items: Core[], progBy: Map<string, Prog>) {
  const t1 = items.filter((c) => c.tier === 1);
  const count = (st: string) => t1.filter((c) => (progBy.get(c.id)?.status ?? 'new') === st).length;
  const known = count('known'), learning = count('learning'), weak = count('weak'), unseen = count('new');
  return {
    tier: 1, label: TIERS[1].label, total: t1.length, known, learning, weak, unseen,
    knownShare: t1.length ? Math.round((known / t1.length) * 100) : 0,
    line: `${known} of ${t1.length} known · ${learning} learning · ${weak} weak`,
    parts: [
      { key: 'known', label: MASTERY.known.label, color: MASTERY.known.color, n: known },
      { key: 'learning', label: MASTERY.learning.label, color: MASTERY.learning.color, n: learning },
      { key: 'weak', label: MASTERY.weak.label, color: MASTERY.weak.color, n: weak },
      { key: 'new', label: MASTERY.new.label, color: MASTERY.new.color, n: unseen },
    ],
  };
}

export function tafsirCoreRoutes(router: Router<QuranEnv>) {
  router.get('/qr/tafsir-practice/core', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const { items, progBy } = await coreRows(env, user);
    const decks = await deckMap(env, items.map((c) => c.lesson_doc_id));
    const top = Math.max(1, ...items.map((c) => c.corpus_n ?? 0));
    const out = items.map((c) => {
      const p = progBy.get(c.id);
      const m = MASTERY[p?.status ?? 'new'] ?? MASTERY.new;
      const k = CORE_KINDS[c.kind] ?? { label: c.kind, labelAr: '' };
      const deck = c.lesson_doc_id ? decks.get(c.lesson_doc_id) : undefined;
      const n = c.corpus_n ?? 0;
      return {
        id: c.id, tier: c.tier, kind: c.kind, kindLabel: k.label, kindLabelAr: k.labelAr, isRule: c.kind === 'rule',
        badge: c.kind === 'rule' ? 'Translation rule' : null,
        labelAr: c.label_ar, labelEn: c.label_en, howEn: c.how_en, exampleAr: c.example_ar,
        corpusN: n, booksN: c.books_n,
        freqLabel: n ? `used ${n.toLocaleString('en-US')}× in ${c.books_n ?? 'the'} tafsīr${c.books_n === 1 ? '' : 's'}` : null,
        booksLabel: c.books_n ? `${c.books_n} book${c.books_n === 1 ? '' : 's'}` : null,
        // a log scale: the commonest item is a full bar, a rare one still shows
        freqShare: n ? Math.max(0.04, Math.log10(n + 1) / Math.log10(top + 1)) : 0,
        progress: {
          status: p?.status ?? 'new', statusLabel: m.label, statusColor: m.color,
          seen: p?.seen_n ?? 0, hit: p?.hit_n ?? 0, miss: p?.miss_n ?? 0,
          tally: p ? `right ${p.hit_n} · missed ${p.miss_n}` : 'not met in your practice yet',
          lastSeenAt: p?.last_seen_at ?? null,
        },
        lessonDocId: c.lesson_doc_id,
        lessonSlug: c.lesson_doc_id ? (deck?.slug ?? c.lesson_doc_id) : null,
        lessonLabel: c.lesson_doc_id ? (deck?.slide_count ? `Learn it · ${deck.slide_count} slides` : 'Learn it') : null,
      };
    });
    return ok({
      summary: coreSummary(items, progBy),
      tiers: [1, 2, 3].map((t) => ({ tier: t, ...TIERS[t], items: out.filter((o) => o.tier === t) })).filter((t) => t.items.length),
    });
  });

  router.get('/qr/tafsir-practice/core/summary', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const { items, progBy } = await coreRows(env, user);
    return ok({ summary: coreSummary(items, progBy) });
  });
}

// ── Reading: the passage and its five tafsīrs, with what the reader has practised marked in place ───────────
// The passage text (qr_ayah) and the tafsīr blocks (qr_tafsir_book_display_block) the practice sentences are cut from, so the
// sentence that was translated can be found where it sits in the book. The five books the reader works with, in the order they
// read them; any other tafsīr in the table is left out here.
//
//   GET /qr/tafsir-practice/reading?passage=QR:SP:40:23-27                 the passage: its āyāt, the five books (blocks, sentences practised), the drills slot
//   GET /qr/tafsir-practice/reading/book?passage=…&source=ibn_ashur        one book's text over the passage, practised sentences marked

const READING_BOOKS = ['ibn_ashur', 'razi', 'zamakhshari', 'alusi', 'tabari'];
// text blocks only: the chips, voice markers and the like carry no reading
const READING_TYPES = ['tafsir_card', 'paragraph_section', 'isnad', 'poetry_quote'];

type PassageRow = { id: string; surah: number; ayah_from: number; ayah_to: number; title_en: string | null; title_ar: string | null };
type BlockRow = { id: string; source_slug: string; ayah_no: number | null; ayah_to: number | null; block_type: string; display_order: number;
  title_ar: string | null; text_ar: string | null; source_page: string | null };
type SrcAttempt = { block_id: string | null; seq: number; text_ar: string; verdict: string; try_n: number; source_slug: string };

/// A sentence's place in a block's text, tolerant of spaces, quotes, brackets and other marks between the words: only the Arabic
/// letters and vowels are compared, and the match is mapped back to the block's own text.
function findSentence(text: string, sentence: string): { at: number; end: number } | null {
  const keep = /[\u0621-\u063A\u0641-\u064A\u064B-\u0655\u0670\u0671]/;
  const mark = /[\u064B-\u0655\u0670]/;
  // decomposed with the vowel marks in canonical order, a letter and its marks at a time (so آ and ا+ٓ, shadda+fatḥa and fatḥa+shadda compare equal)
  const flatten = (str: string) => {
    const chars: string[] = []; const at: number[] = [];
    for (let i = 0; i < str.length;) {
      let j = i + 1;
      while (j < str.length && mark.test(str[j])) j++;
      for (const c of str.slice(i, j).normalize('NFD')) if (keep.test(c)) { chars.push(c); at.push(i); }
      i = j;
    }
    return { flat: chars.join(''), at };
  };
  const { flat, at: idx } = flatten(text);
  const needle = flatten(sentence).flat;
  if (needle.length < 8) return null;
  const hit = flat.indexOf(needle);
  if (hit < 0) return null;
  const last = idx[hit + needle.length - 1];
  let end = last + 1;
  while (end < text.length && mark.test(text[end])) end++;
  return { at: idx[hit], end };
}

async function passageOf(env: QuranEnv, id: string): Promise<PassageRow | null> {
  const m = /^QR:SP:(\d+):(\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  const row = await query<PassageRow>(env.DB_QR,
    `SELECT id, surah, ayah_from, ayah_to, title_en, title_ar FROM qr_surah_study_passage WHERE id = ? LIMIT 1`, [id]).catch(() => [] as PassageRow[]);
  return row[0] ?? { id, surah: Number(m[1]), ayah_from: Number(m[2]), ayah_to: Number(m[3]), title_en: null, title_ar: null };
}

export function tafsirReadingRoutes(router: Router<QuranEnv>) {
  router.get('/qr/tafsir-practice/reading', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const p = await passageOf(env, new URL(req.url).searchParams.get('passage') ?? '');
    // no passage named: the same shape, empty, so a client reads it as "nothing here yet", never as a failure
    if (!p) return ok({ passage: null, ayat: [], books: [], drills: { state: 'later', title: 'Drills', titleAr: 'تدريبات', note: '' } });
    const slots = READING_BOOKS.map(() => '?').join(',');
    const [ayat, counts, done, srcs] = await Promise.all([
      query<{ ayah: number; text: string }>(env.DB_QR,
        `SELECT ayah, COALESCE(text_uthmani, text_uthmani_clean, text) AS text FROM qr_ayah WHERE surah = ? AND ayah BETWEEN ? AND ? ORDER BY ayah`,
        [p.surah, p.ayah_from, p.ayah_to]),
      query<{ source_slug: string; n: number }>(env.DB_QR,
        `SELECT source_slug, COUNT(*) AS n FROM qr_tafsir_book_display_block
          WHERE surah_no = ? AND ayah_no <= ? AND COALESCE(ayah_to, ayah_no) >= ? AND source_slug IN (${slots})
            AND block_type IN (${READING_TYPES.map(() => '?').join(',')}) GROUP BY source_slug`,
        [p.surah, p.ayah_to, p.ayah_from, ...READING_BOOKS, ...READING_TYPES]),
      query<{ source_slug: string; n: number }>(env.DB_QR,
        `SELECT source_slug, COUNT(DISTINCT seq) AS n FROM qr_tafsir_practice_attempt WHERE user_ref = ? AND passage_id = ? GROUP BY source_slug`, [user, p.id]),
      sources(env, READING_BOOKS),
    ]);
    const nOf = (rows: Array<{ source_slug: string; n: number }>, s: string) => rows.find((r) => r.source_slug === s)?.n ?? 0;
    return ok({
      passage: {
        id: p.id, surah: p.surah, ayahFrom: p.ayah_from, ayahTo: p.ayah_to,
        range: p.ayah_from === p.ayah_to ? `${p.surah}:${p.ayah_from}` : `${p.surah}:${p.ayah_from}–${p.ayah_to}`,
        titleEn: p.title_en, titleAr: p.title_ar,
      },
      ayat: ayat.map((a) => ({ ayah: a.ayah, textAr: a.text })),
      books: READING_BOOKS.map((slug, i) => {
        const b = nOf(counts, slug), d = nOf(done, slug);
        return {
          ...sourceOut(slug, srcs.get(slug)), order: i + 1, blocks: b, practised: d,
          line: b ? `${b} passage${b === 1 ? '' : 's'}${d ? ` · ${d} sentence${d === 1 ? '' : 's'} practised` : ''}` : 'Nothing on these āyāt',
        };
      }),
      // each passage will get a full drill set from DrillKit once its data is built up — the slot is here so the design holds it
      drills: { state: 'later', title: 'Drills', titleAr: 'تدريبات',
                note: 'Every passage will get its full set of drills here, built from the Drill Kit once the data for it is complete.' },
    });
  });

  router.get('/qr/tafsir-practice/reading/book', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const sp = new URL(req.url).searchParams;
    const source = sp.get('source') ?? '';
    const p = await passageOf(env, sp.get('passage') ?? '');
    if (!p || !READING_BOOKS.includes(source)) return ok({ blocks: [] });
    const [rows, tries, srcs] = await Promise.all([
      query<BlockRow>(env.DB_QR,
        `SELECT id, source_slug, ayah_no, ayah_to, block_type, display_order, title_ar, text_ar, source_page
           FROM qr_tafsir_book_display_block
          WHERE source_slug = ? AND surah_no = ? AND ayah_no <= ? AND COALESCE(ayah_to, ayah_no) >= ?
            AND block_type IN (${READING_TYPES.map(() => '?').join(',')}) AND text_ar IS NOT NULL AND text_ar <> ''
          ORDER BY ayah_no, display_order`, [source, p.surah, p.ayah_to, p.ayah_from, ...READING_TYPES]),
      query<SrcAttempt>(env.DB_QR,
        `SELECT a.block_id, a.seq, a.text_ar, a.verdict, a.try_n, a.source_slug FROM qr_tafsir_practice_attempt a
          WHERE a.user_ref = ? AND a.passage_id = ? AND a.source_slug = ?
            AND a.try_n = (SELECT MAX(b.try_n) FROM qr_tafsir_practice_attempt b WHERE b.user_ref = a.user_ref AND b.passage_id IS a.passage_id
                            AND b.source_slug = a.source_slug AND b.seq = a.seq)
          ORDER BY a.seq`, [user, p.id, source]),
      sources(env, [source]),
    ]);
    const blocks = rows.map((r) => {
      const text = r.text_ar ?? '';
      // the practised sentences, found where they sit in this block's text, cut into marked and plain runs
      const found = tries.flatMap((t) => { const f = t.text_ar ? findSentence(text, t.text_ar) : null; return f ? [{ t, ...f }] : []; })
        .sort((a, b) => a.at - b.at);
      const segments: Array<{ text: string; practised: null | { seq: number; verdict: string; label: string; color: string } }> = [];
      let cur = 0;
      for (const f of found) {
        if (f.at < cur) continue;
        if (f.at > cur) segments.push({ text: text.slice(cur, f.at), practised: null });
        const v = verdictOf(f.t.verdict);
        segments.push({ text: text.slice(f.at, f.end), practised: { seq: f.t.seq, verdict: v.key, label: v.label, color: v.color } });
        cur = f.end;
      }
      if (cur < text.length) segments.push({ text: text.slice(cur), practised: null });
      return {
        id: r.id, type: r.block_type, titleAr: r.title_ar, page: r.source_page,
        ayah: r.ayah_no === null ? null : (r.ayah_to && r.ayah_to !== r.ayah_no ? `${p.surah}:${r.ayah_no}–${r.ayah_to}` : `${p.surah}:${r.ayah_no}`),
        segments, practisedN: segments.filter((s) => s.practised).length,
      };
    });
    return ok({ source: sourceOut(source, srcs.get(source)), blocks });
  });
}

// ── The sūra Intro section: Slides · Docs · Drills, each with its own link ─────────────────────────────────────────
// Shaped here so the apps only draw the rows. Slides are the session decks filed in km_content (published 2026-11-26).
const INTRO_WORK = (surah: number) => `QR:TAFSIR:ibn_ashur:${surah}`;
const INTRO_PASSAGE = (surah: number) => `QR:SP:${surah}:intro`;

type IntroCard = { gid: string; sentence_ids?: string[] };

/// The session slide decks (km_content) filed for the sūra's intro: slug `tafsir-ibn-ashur-<surah>-intro-…`, newest first.
async function introSlides(env: QuranEnv, surah: number) {
  const prefix = `tafsir-ibn-ashur-${surah}-intro-`;
  const list = await callService<{ data?: Deck[] }>(env.CONTENT, '/cm/decks').then((r) => r.data ?? [])
    .catch((e) => { console.warn('[tafsir-practice] cm/decks unavailable; no intro slides', e); return [] as Deck[]; });
  return list.filter((d) => d.slug?.startsWith(prefix)).sort((a, b) => b.slug.localeCompare(a.slug))
    .map((d) => ({ kind: 'deck', docId: d.doc_id, slug: d.slug, title: d.title,
                   line: d.slide_count ? `${d.slide_count} slides` : 'Slides' }));
}

/// The live authored drills of the sūra's intro, from core (needs the caller's own token). Null when core is unreachable.
async function introDrills(req: Request, env: QuranEnv, surah: number): Promise<IntroCard[] | null> {
  const auth = req.headers.get('Authorization');
  if (!env.CORE || !auth) return null;
  const res = await env.CORE.fetch(new Request(
    `https://domain.internal/core/cyb/drills?domain=QR&work=${encodeURIComponent(INTRO_WORK(surah))}&limit=500`,
    { headers: { Authorization: auth } }))
    .catch((e) => { console.warn('[tafsir-practice] core drills unavailable', e); return null; });
  if (!res?.ok) return null;
  // core answers in the standard envelope ({ ok, data: { drills } })
  const body = (await res.json().catch(() => null)) as { data?: { drills?: IntroCard[] }; drills?: IntroCard[] } | null;
  const marker = `:${surah}:intro:`;
  // core cannot filter on ayah 0; the intro's drills are the ones that quote the intro's own sentences
  return (body?.data?.drills ?? body?.drills ?? []).filter((d) => (d.sentence_ids ?? []).some((s) => s.includes(marker)));
}

type AudioRow = { id: string; object_key: string; duration_sec: number | null };
type SegRow = { audio_id: string; seq: number; start_sec: number; end_sec: number; text_ar: string | null; meta_json: string | null };

/// The intro read aloud: Arabic (Arham, one clip per group, words timed) then the English file, sentence by sentence.
async function introListen(env: QuranEnv, surah: number) {
  const ar = `QRTA:ibn_ashur:arham-${surah}-g%`, en = `QRTA:ibn_ashur:en-${surah}-intro`;
  const audios = await query<AudioRow>(env.DB_QR,
    `SELECT id, object_key, duration_sec FROM qr_tafsir_audio WHERE status = 'live' AND (id LIKE ? OR id = ?)`, [ar, en]);
  if (!audios.length) return null;
  const segs = await query<SegRow>(env.DB_QR,
    `SELECT audio_id, seq, start_sec, end_sec, text_ar, meta_json FROM qr_tafsir_audio_segment
      WHERE audio_id IN (${audios.map(() => '?').join(',')}) ORDER BY audio_id, seq`, audios.map((a) => a.id));
  const num = (id: string) => Number(id.match(/-g(\d+)$/)?.[1] ?? 0);
  const clip = (a: AudioRow) => ({
    audioId: a.id, url: `/api/ar/audio/${encodeURI(a.object_key)}`, durationSec: a.duration_sec,
    segments: segs.filter((x) => x.audio_id === a.id).map((x) => {
      const m = (() => { try { return JSON.parse(x.meta_json ?? '{}') as { w?: number[][]; sentence_id?: string; text_en?: string }; } catch { return {}; } })();
      return { seq: x.seq, start: x.start_sec, end: x.end_sec, sentenceId: m.sentence_id ?? null,
               textAr: x.text_ar, textEn: m.text_en ?? null, words: m.w ?? null };
    }),
  });
  const arabic = audios.filter((a) => a.id !== en).sort((a, b) => num(a.id) - num(b.id)).map(clip);
  const english = audios.find((a) => a.id === en);
  return { arabic, english: english ? clip(english) : null };
}

export function tafsirPathRoutes(router: Router<QuranEnv>) {
  // Tafsīr as its own path inside the Qurʾān area: every sūra a tafsīr book is cut and practised for, with the
  // reader's own progress in it. The apps draw this list and open each sūra's practice screen from it.
  router.get('/qr/tafsir-practice/path', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const cut = await query<{ source_slug: string; surah: number; name_en: string | null; name_ar: string | null; meaning: string | null;
                              sentences: number; passages: number }>(env.DB_QR,
      `SELECT s.source_slug, s.surah, u.name_translit AS name_en, u.name_ar_vowelled AS name_ar, u.name_meaning_en AS meaning,
              COUNT(*) AS sentences, COUNT(DISTINCT s.passage_id) AS passages
         FROM qr_tafsir_sentence s JOIN qr_surah u ON u.id = s.surah
        WHERE s.status <> 'superseded' AND s.passage_id IS NOT NULL
        GROUP BY s.source_slug, s.surah ORDER BY s.surah, s.source_slug`);
    const tried = await query<{ source_slug: string; surah: number; n: number }>(env.DB_QR,
      `SELECT source_slug, surah, COUNT(DISTINCT seq || ':' || COALESCE(passage_id, '')) AS n
         FROM qr_tafsir_practice_attempt WHERE user_ref = ? GROUP BY source_slug, surah`, [user]);
    const srcs = await sources(env, [...new Set(cut.map((c) => c.source_slug))]);
    // each sūra's drills (the intro's, from the bank), so the path can open them directly
    const drillsBy = new Map<number, number | null>();
    for (const sn of [...new Set(cut.map((c) => c.surah))]) drillsBy.set(sn, (await introDrills(req, env, sn))?.length ?? null);
    return ok({
      title: 'Tafsīr', titleAr: 'التفسير',
      line: 'Read a mufassir sentence by sentence, put it into English, and drill what you missed.',
      items: cut.map((c) => {
        const n = tried.find((t) => t.source_slug === c.source_slug && t.surah === c.surah)?.n ?? 0;
        const src = sourceOut(c.source_slug, srcs.get(c.source_slug));
        return { surah: c.surah, nameEn: c.name_en, nameAr: c.name_ar, meaning: c.meaning, source: src,
                 sentences: c.sentences, passages: c.passages, tried: n,
                 line: `${c.passages} passages · ${c.sentences} sentences · ${n} translated`,
                 drills: drillsBy.get(c.surah) ?? null,
                 drillLine: drillsBy.get(c.surah) ? `Drills · ${drillsBy.get(c.surah)} on the intro` : null };
      }),
    });
  });
}

export function tafsirIntroRoutes(router: Router<QuranEnv>) {
  router.get('/qr/tafsir-practice/intro', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const surah = Number(new URL(req.url).searchParams.get('surah')) || 40;
    const passage = INTRO_PASSAGE(surah);
    const [sentences, weak, drills, listen, slides] = await Promise.all([
      query<{ n: number }>(env.DB_QR, `SELECT COUNT(*) AS n FROM qr_tafsir_sentence WHERE passage_id = ?`, [passage]),
      query<Weak>(env.DB_QR, `SELECT * FROM qr_tafsir_practice_weak WHERE user_ref = ? AND lesson_doc_id IS NOT NULL
                                ORDER BY COALESCE(priority, 9), updated_at DESC`, [user]),
      introDrills(req, env, surah),
      introListen(env, surah).catch((e) => { console.warn('[tafsir-practice] intro audio unavailable', e); return null; }),
      introSlides(env, surah),
    ]);
    const decks = await deckMap(env, weak.map((w) => w.lesson_doc_id));
    const seen = new Set<string>();
    const docs = weak.filter((w) => w.lesson_doc_id && !seen.has(w.lesson_doc_id) && seen.add(w.lesson_doc_id)).map((w) => {
      const d = decks.get(w.lesson_doc_id as string);
      return { kind: 'deck', docId: w.lesson_doc_id, slug: d?.slug ?? w.lesson_doc_id, title: d?.title ?? w.label_en ?? w.key,
               line: d?.slide_count ? `${d.slide_count} slides · for ${w.label_en ?? w.key}` : `for ${w.label_en ?? w.key}` };
    });
    const nSent = sentences[0]?.n ?? 0;
    return ok({
      passageId: passage, workRef: INTRO_WORK(surah), surah,
      rows: [
        { key: 'slides', title: 'Slides', titleAr: 'شرائح',
          state: slides.length ? 'ready' : 'unpublished', count: slides.length,
          line: slides.length ? `${slides.length} session deck${slides.length === 1 ? '' : 's'} · ${slides[0].line}` : 'No session slides yet.' },
        { key: 'listen', title: 'Listen', titleAr: 'استماع',
          state: listen ? 'ready' : 'empty', count: listen?.arabic.length ?? 0,
          line: listen ? 'The introduction read aloud — Arabic with the words lighting up, then the English.' : 'No recording yet.' },
        { key: 'docs', title: 'Docs', titleAr: 'مستندات',
          state: docs.length || nSent ? 'ready' : 'empty', count: docs.length + (nSent ? 1 : 0),
          line: `${nSent ? `The intro, ${nSent} sentences` : 'No sentences yet'}${docs.length ? ` · ${docs.length} lesson deck${docs.length === 1 ? '' : 's'}` : ''}` },
        { key: 'drills', title: 'Drills', titleAr: 'تدريبات',
          state: drills === null ? 'unavailable' : drills.length ? 'ready' : 'empty', count: drills?.length ?? 0,
          line: drills === null ? 'Drills could not be loaded just now.' : `${drills.length} drills on the intro` },
      ],
      docs, slides, sentenceCount: nSent, listen,
    });
  });

  // the intro's drills, as core's own cards — the apps play them in their drill player
  router.get('/qr/tafsir-practice/intro/drills', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const surah = Number(new URL(req.url).searchParams.get('surah')) || 40;
    return ok({ drills: (await introDrills(req, env, surah)) ?? [] });
  });
}
