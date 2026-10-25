import type { Router } from '../../../shared/src/router';
import { ok, notFound, unauthorized } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';
import { actorRef } from '../../../shared/src/auth';

/// Daily Fuṣḥā — one themed dose a day: ten singular/plural pairs, a sentence
/// for each, and a short passage that puts them back together.
///
/// The content is public and the same for everyone; only the delivery — which
/// day a reader is on, and whether they finished it — is per-reader. So the
/// theme routes are anonymous and cacheable, and only /ar/daily/today and the
/// completion write require a token.
///
/// Nothing here schedules review. That is km_core's SRS, which is the single
/// scheduler across every module.

interface ThemeRow {
  id: string; slug: string; title_ar: string; title_en: string;
  domain_id: string | null; level: string; day_index: number;
  focus_note: string | null;
}
interface WordRow {
  id: string; singular_ar: string; plural_ar: string; gloss_en: string;
  plural_kind: string; gender: string; pattern_ar: string | null;
  is_diptote: number; al_root_ref: string | null;
  audio_key_sg: string | null; audio_key_pl: string | null;
}
interface SentenceRow {
  id: string; word_id: string | null; text_ar: string; gloss_en: string;
  number_used: string; grammar_note_en: string | null; audio_key: string | null;
}
interface PassageRow {
  id: string; title_ar: string; text_ar: string; gloss_en: string;
  word_count: number; audio_key: string | null; audio_secs: number | null;
}

const THEME_COLS =
  'id, slug, title_ar, title_en, domain_id, level, day_index, focus_note';

function shapeWord(w: WordRow) {
  return {
    id: w.id,
    singular: w.singular_ar,
    plural: w.plural_ar,
    gloss: w.gloss_en,
    pluralKind: w.plural_kind,       // 'taksir' | 'salim_m' | 'salim_f'
    gender: w.gender,
    pattern: w.pattern_ar,
    isDiptote: !!w.is_diptote,
    rootRef: w.al_root_ref,
    audioSingular: w.audio_key_sg,
    audioPlural: w.audio_key_pl,
  };
}

/// The whole day in one response. A dose is small and always read together —
/// splitting it across four round trips would only buy the client the chance
/// to render half a lesson.
async function assemble(env: ArabicEnv, theme: ThemeRow) {
  const [words, sentences, passage] = await Promise.all([
    query<WordRow>(
      env.DB_AR,
      `SELECT id, singular_ar, plural_ar, gloss_en, plural_kind, gender, pattern_ar,
              is_diptote, al_root_ref, audio_key_sg, audio_key_pl
         FROM ar_daily_word WHERE theme_id = ? ORDER BY sort_order`,
      [theme.id],
    ),
    query<SentenceRow>(
      env.DB_AR,
      `SELECT id, word_id, text_ar, gloss_en, number_used, grammar_note_en, audio_key
         FROM ar_daily_sentence WHERE theme_id = ? ORDER BY sort_order`,
      [theme.id],
    ),
    queryOne<PassageRow>(
      env.DB_AR,
      `SELECT id, title_ar, text_ar, gloss_en, word_count, audio_key, audio_secs
         FROM ar_daily_passage WHERE theme_id = ?`,
      [theme.id],
    ),
  ]);

  return {
    id: theme.id,
    slug: theme.slug,
    titleAr: theme.title_ar,
    titleEn: theme.title_en,
    domainId: theme.domain_id,
    level: theme.level,
    dayIndex: theme.day_index,
    focusNote: theme.focus_note,
    words: words.map(shapeWord),
    sentences: sentences.map((s) => ({
      id: s.id,
      wordId: s.word_id,
      textAr: s.text_ar,
      gloss: s.gloss_en,
      numberUsed: s.number_used,
      grammarNote: s.grammar_note_en,
      audio: s.audio_key,
    })),
    passage: passage && {
      id: passage.id,
      titleAr: passage.title_ar,
      textAr: passage.text_ar,
      gloss: passage.gloss_en,
      wordCount: passage.word_count,
      audio: passage.audio_key,
      audioSecs: passage.audio_secs,
    },
  };
}

export function dailyRoutes(router: Router<ArabicEnv>) {
  /// The learner domains that have a published day behind them, with how many.
  /// The list comes from ar_curriculum_domain, never from the app — a domain
  /// with no content yet is not offered, and one that gains content appears
  /// without a release.
  router.get('/ar/daily/domains', async (_req, env) => {
    const rows = await query<{
      id: string; slug: string; title: string; title_ar: string | null;
      description: string | null; theme_count: number; word_count: number;
    }>(
      env.DB_AR,
      `SELECT d.id, d.slug, d.title, d.title_ar, d.description,
              COUNT(DISTINCT t.id) AS theme_count, COUNT(w.id) AS word_count
         FROM ar_curriculum_domain d
         JOIN ar_daily_theme t ON t.domain_id = d.id AND t.is_published = 1
         LEFT JOIN ar_daily_word w ON w.theme_id = t.id
        GROUP BY d.id ORDER BY d.sort_order, d.title`,
    );
    return ok({
      domains: rows.map((d) => ({
        id: d.id, slug: d.slug, titleEn: d.title, titleAr: d.title_ar,
        description: d.description, themeCount: d.theme_count, wordCount: d.word_count,
      })),
    });
  });

  /// One domain, whole: its vocabulary as a grid across every published set
  /// it holds, then every sentence, then every passage. The domain is the
  /// unit a learner practises — "the market" — not the day it was drip-fed
  /// on; a set (ar_daily_theme) is only how the content was authored.
  router.get('/ar/daily/domains/:slug', async (_req, env, { slug }) => {
    const dom = await queryOne<{
      id: string; slug: string; title: string; title_ar: string | null; description: string | null;
    }>(env.DB_AR,
      `SELECT id, slug, title, title_ar, description FROM ar_curriculum_domain WHERE slug = ?`, [slug]);
    if (!dom) return notFound(`domain ${slug}`);

    const setJoin = `JOIN ar_daily_theme t ON t.id = x.theme_id AND t.domain_id = ? AND t.is_published = 1`;
    const [dialogues, turns, words, sentences, passages, readings] = await Promise.all([
      query<{
        id: string; theme_id: string; title_ar: string; title_en: string | null;
        setting_ar: string | null; image_key: string | null;
      }>(env.DB_AR,
        `SELECT x.id, x.theme_id, x.title_ar, x.title_en, x.setting_ar, x.image_key
           FROM ar_daily_dialogue x ${setJoin} ORDER BY t.day_index, x.sort_order`, [dom.id]),
      query<{
        id: string; dialogue_id: string; speaker_ar: string; text_ar: string;
        gloss_en: string; word_id: string | null; audio_key: string | null;
      }>(env.DB_AR,
        `SELECT n.id, n.dialogue_id, n.speaker_ar, n.text_ar, n.gloss_en, n.word_id, n.audio_key
           FROM ar_daily_dialogue_turn n
           JOIN ar_daily_dialogue x ON x.id = n.dialogue_id ${setJoin}
          ORDER BY t.day_index, x.sort_order, n.sort_order`, [dom.id]),
      query<WordRow & { theme_id: string }>(env.DB_AR,
        `SELECT x.id, x.theme_id, x.singular_ar, x.plural_ar, x.gloss_en, x.plural_kind, x.gender,
                x.pattern_ar, x.is_diptote, x.al_root_ref, x.audio_key_sg, x.audio_key_pl
           FROM ar_daily_word x ${setJoin} ORDER BY t.day_index, x.sort_order`, [dom.id]),
      query<SentenceRow & { theme_id: string }>(env.DB_AR,
        `SELECT x.id, x.theme_id, x.word_id, x.text_ar, x.gloss_en, x.number_used, x.grammar_note_en, x.audio_key
           FROM ar_daily_sentence x ${setJoin} ORDER BY t.day_index, x.sort_order`, [dom.id]),
      query<PassageRow & { theme_id: string; set_title_ar: string; focus_note: string | null }>(env.DB_AR,
        `SELECT x.id, x.theme_id, x.title_ar, x.text_ar, x.gloss_en, x.word_count, x.audio_key, x.audio_secs,
                t.title_ar AS set_title_ar, t.focus_note
           FROM ar_daily_passage x ${setJoin} ORDER BY t.day_index`, [dom.id]),
      // the category's reading lessons: each opens its read-along note (note_ref) in the reader
      query<{ slug: string; kind: string; title_en: string; title_ar: string; subtitle_en: string | null;
              note_ref: string; cover_key: string | null; lines: number; level: string }>(env.DB_AR,
        `SELECT slug, kind, title_en, title_ar, subtitle_en, note_ref, cover_key, lines, level
           FROM ar_daily_reading WHERE domain_id = ? AND is_published = 1 ORDER BY sort_order, created_at`, [dom.id]),
    ]);

    return ok({
      domain: { id: dom.id, slug: dom.slug, titleEn: dom.title, titleAr: dom.title_ar, description: dom.description },
      // Turns nested under their dialogue: a conversation is read whole, and
      // the client should not have to reassemble one from two flat lists.
      dialogues: dialogues.map((d) => ({
        id: d.id, setId: d.theme_id, titleAr: d.title_ar, titleEn: d.title_en,
        settingAr: d.setting_ar, image: d.image_key,
        turns: turns.filter((n) => n.dialogue_id === d.id).map((n) => ({
          id: n.id, speakerAr: n.speaker_ar, textAr: n.text_ar, gloss: n.gloss_en,
          wordId: n.word_id, audio: n.audio_key,
        })),
      })),
      words: words.map((w) => ({ ...shapeWord(w), setId: w.theme_id })),
      sentences: sentences.map((s) => ({
        id: s.id, setId: s.theme_id, wordId: s.word_id, textAr: s.text_ar, gloss: s.gloss_en,
        numberUsed: s.number_used, grammarNote: s.grammar_note_en, audio: s.audio_key,
      })),
      readings: readings.map((r) => ({
        slug: r.slug, kind: r.kind, titleEn: r.title_en, titleAr: r.title_ar, subtitle: r.subtitle_en,
        noteRef: r.note_ref, cover: r.cover_key ? `/api/ar/audio/${r.cover_key}` : null, lines: r.lines, level: r.level,
      })),
      passages: passages.map((p) => ({
        id: p.id, setId: p.theme_id, titleAr: p.title_ar, textAr: p.text_ar, gloss: p.gloss_en,
        wordCount: p.word_count, audio: p.audio_key, audioSecs: p.audio_secs,
        setTitleAr: p.set_title_ar, focusNote: p.focus_note,
      })),
    });
  });

  /// A reading lesson, whole, unsigned: the same for everyone (owner, 2026-10-25: "fetched without user"). Shaped as a
  /// note so the documents' read-along reader opens it as it is.
  router.get('/ar/daily/readings/:slug', async (_req, env, { slug }) => {
    const r = await queryOne<{ slug: string; title_en: string; title_ar: string; body_md: string | null; created_at: string }>(env.DB_AR,
      `SELECT slug, title_en, title_ar, body_md, created_at FROM ar_daily_reading WHERE slug = ? AND is_published = 1`, [slug]);
    if (!r || !r.body_md) return notFound(`reading ${slug}`);
    return ok({ note: { id: `ARDR:${r.slug}`, note_type: 'note', title: `${r.title_en} · ${r.title_ar}`, body: r.body_md,
                        visibility: 'public', domain: 'arabic', is_pinned: 0, tags_json: '["reading"]',
                        created_at: r.created_at, updated_at: r.created_at } });
  });

  /// The published themes, in drip order. Content only — no reader state, so
  /// this is the list a browsing user sees before signing in.
  ///
  /// `?domain=<slug>` narrows to one domain; `?q=` matches the theme or its
  /// domain by title in either language. Both are optional and combine.
  router.get('/ar/daily/themes', async (req, env) => {
    const url = new URL(req.url);
    const domain = (url.searchParams.get('domain') ?? '').trim();
    const q = (url.searchParams.get('q') ?? '').trim();

    const conds = ['t.is_published = 1'];
    const params: unknown[] = [];
    if (domain) { conds.push('d.slug = ?'); params.push(domain); }
    if (q) {
      conds.push('(t.title_ar LIKE ? OR t.title_en LIKE ? OR d.title LIKE ? OR d.title_ar LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    const rows = await query<ThemeRow & {
      domain_slug: string | null; domain_title_ar: string | null; domain_title_en: string | null;
    }>(
      env.DB_AR,
      `SELECT ${THEME_COLS.split(', ').map((c) => `t.${c}`).join(', ')},
              d.slug AS domain_slug, d.title_ar AS domain_title_ar, d.title AS domain_title_en
         FROM ar_daily_theme t LEFT JOIN ar_curriculum_domain d ON d.id = t.domain_id
        WHERE ${conds.join(' AND ')} ORDER BY t.day_index`,
      params,
    );
    return ok({
      themes: rows.map((t) => ({
        id: t.id, slug: t.slug, titleAr: t.title_ar, titleEn: t.title_en,
        domainId: t.domain_id, domainSlug: t.domain_slug,
        domainTitleAr: t.domain_title_ar, domainTitleEn: t.domain_title_en,
        level: t.level, dayIndex: t.day_index, focusNote: t.focus_note,
      })),
    });
  });

  /// One theme in full, by slug. Anonymous: the content is the same for
  /// everyone, and an unsigned reader should still be able to read a day.
  router.get('/ar/daily/themes/:slug', async (_req, env, { slug }) => {
    const theme = await queryOne<ThemeRow>(
      env.DB_AR,
      `SELECT ${THEME_COLS} FROM ar_daily_theme WHERE slug = ? AND is_published = 1`,
      [slug],
    );
    if (!theme) return notFound(`daily theme ${slug}`);
    return ok(await assemble(env, theme));
  });

  /// Today's dose for this reader.
  ///
  /// The row in ar_daily_delivery is the record of what was actually served,
  /// so a reader who opens the app twice in a day gets the same theme rather
  /// than being advanced by the act of looking. A reader with nothing due is
  /// given the next unseen theme and that delivery is recorded — the drip
  /// starts by being read, not by a cron job guessing when someone woke up.
  router.get('/ar/daily/today', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Sign in for your daily Arabic');
    const today = new Date().toISOString().slice(0, 10);

    let theme = await queryOne<ThemeRow>(
      env.DB_AR,
      `SELECT ${THEME_COLS.split(', ').map((c) => `t.${c}`).join(', ')}
         FROM ar_daily_delivery d JOIN ar_daily_theme t ON t.id = d.theme_id
        WHERE d.user_ref = ? AND d.due_on = ? AND d.state <> 'skipped'
        ORDER BY t.day_index LIMIT 1`,
      [user, today],
    );

    if (!theme) {
      theme = await queryOne<ThemeRow>(
        env.DB_AR,
        `SELECT ${THEME_COLS.split(', ').map((c) => `t.${c}`).join(', ')}
           FROM ar_daily_theme t
          WHERE t.is_published = 1
            AND t.id NOT IN (SELECT theme_id FROM ar_daily_delivery WHERE user_ref = ?)
          ORDER BY t.day_index LIMIT 1`,
        [user],
      );
      // Every published theme has been delivered: the reader is ahead of the
      // content, which is a real state and not an error.
      if (!theme) return ok({ theme: null, exhausted: true });

      await execute(
        env.DB_AR,
        `INSERT INTO ar_daily_delivery (id, user_ref, theme_id, due_on, delivered_at, state)
         VALUES (?, ?, ?, ?, datetime('now'), 'delivered')
         ON CONFLICT (user_ref, theme_id) DO NOTHING`,
        [`ARDD:${user}:${theme.id}`, user, theme.id, today],
      );
    }

    const dose = await assemble(env, theme);
    return ok({ theme: dose, exhausted: false });
  });

  /// The reader's history — what has landed, and what they finished.
  router.get('/ar/daily/progress', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Sign in to see your progress');
    const rows = await query<{
      slug: string; title_ar: string; day_index: number;
      due_on: string; state: string; completed_at: string | null;
    }>(
      env.DB_AR,
      `SELECT t.slug, t.title_ar, t.day_index, d.due_on, d.state, d.completed_at
         FROM ar_daily_delivery d JOIN ar_daily_theme t ON t.id = d.theme_id
        WHERE d.user_ref = ? ORDER BY d.due_on DESC, t.day_index DESC`,
      [user],
    );
    return ok({
      deliveries: rows.map((r) => ({
        slug: r.slug, titleAr: r.title_ar, dayIndex: r.day_index,
        dueOn: r.due_on, state: r.state, completedAt: r.completed_at,
      })),
      completed: rows.filter((r) => r.state === 'done').length,
    });
  });
}
