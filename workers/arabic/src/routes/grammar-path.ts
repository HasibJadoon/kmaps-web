import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, unauthorized } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import { actorRef } from '../../../shared/src/auth';
import type { ArabicEnv } from '../env';
import { labels, byKey, skillCard } from '../lib/labels';
import { al, qr, heardOf, spanOf, round, setting, fill, termsOf, lessonPreview, type L, type TermCard } from '../lib/grammar';

// ── The grammar path: tracks, lessons, one after another ────────────────────
// The Arabic path's shape (path.ts) over the grammar lessons. A track is a discipline at a
// level (ar_practice_label 'grammar_track': Basic/Advanced Naḥw, Basic/Advanced Ṣarf, Balāgha),
// read from the chapters of a teaching book (al-Ghalāyīnī's Jāmiʿ al-durūs; the balāgha spine);
// its units are the lessons that teach registry terms (ar_lesson_term). Per unit:
//   preview — the lesson itself: its own text (AL ar_ling_gram_chunk, its bāb of the book — the ḥadd,
//             the rules) and its own worked examples, heard (ar_grammar_sentence); then its terms:
//             definition, where each sits, three shawāhid heard in the recitation, where the
//             classical books treat it (ar_lesson_reading, AL's exact/confirmed bābs)
//   drill   — the lesson's own examples first, then AL's grammar drills on its terms
//             (/al/drill/grammar/*), each set in a sentence, and the scene questions about the same
//             terms (ar_scene_feature_term); terms with no shāhid in the registry are drilled from
//             their iʿrāb instances in the Qurʾān (QR /qr/drill/irab-shawahid)
//   check   — the same, harder, across the terms of the lessons beside it, with the books' examples
//             at every level; pass it and the next opens
//   review  — the cards the drills filed (CORE SRS, module AR, grouped by track and lesson)
// Every number and label is data (ar_practice_label: grammar_track, grammar_path, grammar_drill,
// setting, kind, school); the progress is the learner's (ar_learner_unit: the lesson, the track).
//
//   GET  /ar/grammar/path?track=nahw-basic
//   GET  /ar/grammar/unit/:id            the preview
//   GET  /ar/grammar/unit/:id/drill
//   GET  /ar/grammar/unit/:id/check
//   GET  /ar/grammar/unit/:id/review
//   POST /ar/grammar/unit/:id/progress   { stage?, score? }

interface TrackMeta { discipline: string; level: string; spine: string; chapters: string[]; after?: string }
interface LessonRow { id: string; parent_id: string | null; depth: number; title_ar: string; title_en: string | null; sort_order: number;
                      volume_no: number | null; page_start: number | null; terms: number }
interface Progress { unit_id: string; band: string; stage: string; best_score: number | null }
const tracksOf = (all: L) => (all.grammar_track ?? []).map((t) => ({ label: t, meta: (t.extra ?? {}) as unknown as TrackMeta }));

/// a track's lessons in book order: each chapter, then its lessons; a unit is one that teaches a term
async function lessonsOf(env: ArabicEnv, meta: TrackMeta) {
  if (!meta.chapters?.length) return { chapters: [] as LessonRow[], units: [] as LessonRow[] };
  const ph = meta.chapters.map(() => '?').join(',');
  const rows = await query<LessonRow>(env.DB_AR,
    `SELECT l.id, l.parent_id, l.depth, l.title_ar, l.title_en, l.sort_order, l.volume_no, l.page_start,
            (SELECT COUNT(*) FROM ar_lesson_term t JOIN ar_ling_gram_term g ON g.id = t.term_id AND g.status = 'live'
              WHERE t.lesson_id = l.id) AS terms
       FROM ar_lesson l WHERE l.status = 'live' AND l.mirrors_id IS NULL AND (l.id IN (${ph}) OR l.parent_id IN (${ph}))
      ORDER BY l.sort_order, l.id`, [...meta.chapters, ...meta.chapters]);
  const chapters = meta.chapters.map((id) => rows.find((r) => r.id === id)).filter((r): r is LessonRow => !!r);
  const units = chapters.flatMap((c) => [c, ...rows.filter((r) => r.parent_id === c.id)]).filter((r) => r.terms > 0);
  return { chapters, units };
}

async function progressOf(env: ArabicEnv, me: string | null) {
  if (!me) return new Map<string, Progress>();
  const rows = await query<Progress>(env.DB_AR,
    `SELECT unit_id, band, stage, best_score FROM ar_learner_unit WHERE user_id = ? AND unit_id LIKE 'LSN:%'`, [me]);
  return new Map(rows.map((r) => [r.unit_id, r]));
}

/// the track a lesson belongs to
async function trackOfLesson(env: ArabicEnv, all: L, id: string) {
  const lesson = await queryOne<LessonRow & { spine: string }>(env.DB_AR,
    `SELECT id, parent_id, depth, title_ar, title_en, sort_order, volume_no, page_start, spine, 0 AS terms FROM ar_lesson WHERE id = ?`, [id]);
  if (!lesson) return null;
  const t = tracksOf(all).find((x) => x.meta.chapters?.includes(lesson.id) || (lesson.parent_id && x.meta.chapters?.includes(lesson.parent_id)));
  return t ? { lesson, track: t } : null;
}

export function grammarPathRoutes(router: Router<ArabicEnv>) {
  // A track's path: its chapters, their lessons in order, each open, locked or done; and whether the track is open.
  router.get('/ar/grammar/path', async (req, env) => {
    const me = actorRef(req);
    const [all, prog] = await Promise.all([labels(env), progressOf(env, me)]);
    const tracks = tracksOf(all);
    if (!tracks.length) return notFound('grammar tracks');
    const want = new URL(req.url).searchParams.get('track');
    const t = tracks.find((x) => x.label.key === want) ?? tracks[0];
    const P = byKey(all.grammar_path);
    const pass = setting(all, 'grammar_pass_score', 80), share = setting(all, 'grammar_unlock_share', 80);
    const done = (id: string) => (prog.get(id)?.best_score ?? 0) >= pass;

    // every track's size and progress, and whether it is open (an advanced track opens when enough of its basic one is done)
    const summary = await Promise.all(tracks.map(async (x) => {
      const { units } = await lessonsOf(env, x.meta);
      return { key: x.label.key, units: units.map((u) => u.id), done: units.filter((u) => done(u.id)).length };
    }));
    const openOf = (key: string) => {
      const m = tracks.find((x) => x.label.key === key)?.meta;
      if (!m?.after) return { open: true, gate: null as Record<string, string | number> | null };
      const before = summary.find((s) => s.key === m.after);
      const need = Math.ceil(((before?.units.length ?? 0) * share) / 100);
      const afterLabel = tracks.find((x) => x.label.key === m.after)?.label.label ?? m.after;
      return { open: !before || before.done >= need, gate: { n: share, done: before?.done ?? 0, need, after: afterLabel } };
    };
    const { chapters, units } = await lessonsOf(env, t.meta);
    const { open, gate } = openOf(t.label.key);
    let previousDone = true;
    const status = new Map<string, string>();
    for (const u of units) { status.set(u.id, done(u.id) ? 'done' : open && previousDone ? 'open' : 'locked'); previousDone = done(u.id); }
    const lockedCard = P.get('track_locked');
    const res = ok({
      track: t.label.key, open, signedIn: !!me, pass,
      tracks: tracks.map((x) => {
        const s = summary.find((y) => y.key === x.label.key)!;
        return { ...skillCard(x.label), discipline: x.meta.discipline, level: x.meta.level, open: openOf(x.label.key).open,
                 progress: { done: s.done, total: s.units.length } };
      }),
      card: P.get('card') ? skillCard(P.get('card')!) : null,
      locked: !open && lockedCard ? { ...skillCard(lockedCard), tagline: fill(lockedCard.detail, gate ?? {}) } : null,
      steps: ['preview', 'drill', 'check', 'review'].map((k) => P.get(k)).filter(Boolean).map((x) => skillCard(x!)),
      lockedLabel: P.get('locked') ? skillCard(P.get('locked')!) : null,
      signin: !me && P.get('signin') ? skillCard(P.get('signin')!) : null,
      srsDeck: P.get('srs_deck') ? { title: P.get('srs_deck')!.label, description: P.get('srs_deck')!.detail } : null,
      progress: { done: units.filter((u) => done(u.id)).length, total: units.length },
      chapters: chapters.map((c) => ({
        id: c.id, title: c.title_en ?? c.title_ar, titleAr: c.title_ar,
        units: units.filter((u) => u.id === c.id || u.parent_id === c.id).map((u) => ({
          unit: u.id, title: u.title_en ?? u.title_ar, titleAr: u.title_ar, terms: u.terms, page: u.page_start ? `${u.volume_no ?? ''}:${u.page_start}` : null,
          status: status.get(u.id), stage: prog.get(u.id)?.stage ?? null, score: prog.get(u.id)?.best_score ?? null })),
      })),
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });

  // A unit's preview: its terms — what each is, where it sits, three shawāhid heard, where the books treat it.
  router.get('/ar/grammar/unit/:id', async (req, env, { id }) => {
    const me = actorRef(req);
    const all = await labels(env);
    const found = await trackOfLesson(env, all, id);
    if (!found) return notFound(`grammar unit ${id}`);
    const { lesson, track } = found;
    const P = byKey(all.grammar_path);
    const termIds = await termsOf(env, [id]);
    const readings = await query<{ source_slug: string; title_ar: string | null; volume_no: number | null; page_start: number | null; term_id: string | null }>(env.DB_AR,
      `SELECT source_slug, title_ar, volume_no, page_start, term_id FROM ar_lesson_reading WHERE lesson_id = ?
        GROUP BY source_slug, bab_id ORDER BY source_slug, volume_no, page_start`, [id]);
    const slugs = [...new Set(readings.map((r) => r.source_slug))];
    const [info, p, own] = await Promise.all([
      termIds.length || slugs.length
        ? al<{ terms: TermCard[]; books: Record<string, { title: string; author: string | null }> }>(env,
            `/al/drill/grammar/terms?ids=${encodeURIComponent(termIds.join(','))}&books=${encodeURIComponent(slugs.join(','))}`)
          .catch(() => ({ terms: [] as TermCard[], books: {} as Record<string, { title: string; author: string | null }> }))
        : Promise.resolve({ terms: [] as TermCard[], books: {} as Record<string, { title: string; author: string | null }> }),
      me ? queryOne<Progress>(env.DB_AR, `SELECT unit_id, band, stage, best_score FROM ar_learner_unit WHERE user_id = ? AND unit_id = ?`, [me, id])
        : Promise.resolve(null),
      lessonPreview(env, all, id),
    ]);
    const perTerm = setting(all, 'grammar_preview_shawahid', 3);
    // a term with fewer shawāhid than the preview shows: its iʿrāb instances in the Qurʾān make up the rest
    const short = info.terms.filter((t) => t.shawahid.length < perTerm && t.id.startsWith('GT:irab_role:')).map((t) => t.id);
    const irab = short.length ? (await qr<{ items: Array<{ termId: string; ref: string; word: string; irab: string; book: string; span: number[] }> }>(env,
      `/qr/drill/irab-shawahid?terms=${encodeURIComponent(short.join(','))}&n=${short.length * perTerm}`).catch(() => ({ items: [] }))).items : [];
    const refs = [...info.terms.flatMap((t) => t.shawahid.map((s) => s.ref)), ...irab.map((r) => r.ref)];
    const heard = await heardOf(env, refs);
    const irabLabel = P.get('irab_shahid');
    const terms = info.terms.map((t) => ({
      ...t,
      shawahid: [...t.shawahid, ...irab.filter((r) => r.termId === t.id).map((r) => ({ ar: r.word, ref: r.ref, en: null, wordIndex: null,
                                                                                         source: 'irab', cite: `${irabLabel?.label ?? ''} — ${r.book}`.replace(/^ — /, '') }))]
        .slice(0, perTerm).map((s) => {
          const a = heard[s.ref];
          const idx = s.wordIndex != null && a ? a.wordIndex.indexOf(s.wordIndex) : -1;
          return { ...s, audio: a?.audio ?? null, words: a?.words ?? null, en: s.en ?? a?.en ?? null, title: a?.title ?? s.ref,
                   span: a ? (idx >= 0 ? [idx] : spanOf(a.words, s.ar)) : [] };
        }),
    }));
    const res = ok({
      unit: id, track: track.label.key, title: lesson.title_en ?? lesson.title_ar, titleAr: lesson.title_ar,
      page: lesson.page_start ? `${lesson.volume_no ?? ''}:${lesson.page_start}` : null,
      stage: p?.stage ?? 'preview', score: p?.best_score ?? null, pass: setting(all, 'grammar_pass_score', 80),
      steps: ['preview', 'drill', 'check', 'review'].map((k) => P.get(k)).filter(Boolean).map((x) => skillCard(x!)),
      labels: Object.fromEntries(['lesson_text', 'examples', 'terms', 'shawahid', 'treated_in'].map((k) => [k, P.get(k) ? { label: P.get(k)!.label, labelAr: P.get(k)!.labelAr } : null])),
      // the lesson as its book teaches it: the text (ḥadd, rules) and its own examples, heard
      lesson: own,
      terms,
      // the classical books that treat the same ground: each book once, with its bābs
      treatedIn: slugs.map((slug) => ({
        source: slug, book: info.books?.[slug]?.title ?? slug, author: info.books?.[slug]?.author ?? null,
        babs: readings.filter((r) => r.source_slug === slug).map((r) => ({
          title: (r.title_ar ?? '').replace(/^\[|\]$/g, ''), term: r.term_id,
          at: r.volume_no ? `${r.volume_no}:${r.page_start ?? ''}` : r.page_start ? String(r.page_start) : null })),
      })),
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });

  // The drill: the unit's terms, from every source that holds something on them, and the scenes.
  // The check: the same, harder, over the terms of the lessons beside it in its chapter.
  for (const step of ['drill', 'check'] as const) {
    router.get(`/ar/grammar/unit/:id/${step}`, async (req, env, { id }) => {
      const all = await labels(env);
      const found = await trackOfLesson(env, all, id);
      if (!found) return notFound(`grammar unit ${id}`);
      const { lesson, track } = found;
      const level = track.meta.level === 'advanced' ? 'advanced' : 'basic';
      const plan = ((byKey(all.grammar_drill).get(step)?.extra ?? {}) as Record<string, Array<{ source: string; ask?: string }>>)[level] ?? [];
      let lessons = [id];
      if (step === 'check') {
        const chapter = lesson.depth === 0 ? lesson.id : lesson.parent_id;
        const near = chapter ? await query<{ id: string }>(env.DB_AR,
          `SELECT id FROM ar_lesson WHERE status = 'live' AND (parent_id = ? OR id = ?) ORDER BY abs(sort_order - ?) LIMIT 6`,
          [chapter, chapter, lesson.sort_order]) : [];
        lessons = [...new Set([id, ...near.map((x) => x.id)])];
      }
      const terms = await termsOf(env, lessons);
      if (!terms.length) return badRequest('this lesson teaches no registry term yet');
      const size = setting(all, step === 'drill' ? 'grammar_drill_size' : 'grammar_check_size', step === 'drill' ? 10 : 12);
      const items = await round(env, all, plan, terms, size, { band: track.label.key, series: lesson.title_en ?? lesson.title_ar, episode: id },
                                step === 'drill' ? [id] : lessons, step === 'drill' ? (level === 'advanced' ? [1, 2, 3] : [1, 2]) : [1, 2, 3]);
      const P = byKey(all.grammar_path);
      const card = P.get(step);
      const deck = P.get('srs_deck');
      const res = ok({ skill: card ? skillCard(card) : null, unit: id, track: track.label.key, level, terms, items,
                       srsDeck: deck ? { title: deck.label, description: deck.detail } : null });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    });
  }

  // Review: the cards this unit's drills filed, as the review deck groups them (CORE SRS holds them).
  router.get('/ar/grammar/unit/:id/review', async (_req, env, { id }) => {
    const all = await labels(env);
    const found = await trackOfLesson(env, all, id);
    if (!found) return notFound(`grammar unit ${id}`);
    const P = byKey(all.grammar_path);
    const deck = P.get('srs_deck');
    return ok({ unit: id, track: found.track.label.key, skill: P.get('review') ? skillCard(P.get('review')!) : null,
                srsDeck: deck ? { title: deck.label, description: deck.detail } : null,
                filter: { module: 'AR', group: { skill: 'grammar_path', band: found.track.label.key, episode: id,
                                                 series: found.lesson.title_en ?? found.lesson.title_ar } } });
  });

  // Progress: a step reached, a check scored.
  router.post('/ar/grammar/unit/:id/progress', async (req, env, { id }) => {
    const me = actorRef(req);
    if (!me) return unauthorized('Sign in to keep your progress');
    const body = await req.json().catch(() => null) as { stage?: string; score?: number } | null;
    if (!body) return badRequest('a body is required');
    const all = await labels(env);
    const found = await trackOfLesson(env, all, id);
    if (!found) return notFound(`grammar unit ${id}`);
    const order = ['preview', 'drill', 'check', 'review', 'done'];
    const cur = await queryOne<Progress>(env.DB_AR, `SELECT unit_id, band, stage, best_score FROM ar_learner_unit WHERE user_id = ? AND unit_id = ?`, [me, id]);
    const pass = setting(all, 'grammar_pass_score', 80);
    const best = Math.max(cur?.best_score ?? 0, typeof body.score === 'number' ? Math.round(body.score) : 0) || null;
    let stage = [cur?.stage ?? 'preview', order.includes(body.stage ?? '') ? body.stage! : 'preview'].sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];
    if ((best ?? 0) >= pass) stage = 'done';
    await execute(env.DB_AR,
      `INSERT INTO ar_learner_unit (user_id, unit_id, band, stage, scenes_json, watched_json, best_score, updated_at)
       VALUES (?, ?, ?, ?, '[]', '[]', ?, datetime('now'))
       ON CONFLICT (user_id, unit_id) DO UPDATE SET stage = excluded.stage, best_score = excluded.best_score, updated_at = excluded.updated_at`,
      [me, id, found.track.label.key, stage, best]);
    return ok({ unit: id, stage, best, done: stage === 'done', pass });
  });
}
