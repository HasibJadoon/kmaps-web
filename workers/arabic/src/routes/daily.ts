import type { Router } from '../../../shared/src/router';
import { ok, notFound, unauthorized } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';
import { actorRef } from '../auth';

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
  /// The published themes, in drip order. Content only — no reader state, so
  /// this is the list a browsing user sees before signing in.
  router.get('/ar/daily/themes', async (_req, env) => {
    const rows = await query<ThemeRow>(
      env.DB_AR,
      `SELECT ${THEME_COLS} FROM ar_daily_theme WHERE is_published = 1 ORDER BY day_index`,
    );
    return ok({
      themes: rows.map((t) => ({
        id: t.id, slug: t.slug, titleAr: t.title_ar, titleEn: t.title_en,
        domainId: t.domain_id, level: t.level, dayIndex: t.day_index,
        focusNote: t.focus_note,
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

  /// Mark today's dose finished.
  router.post('/ar/daily/themes/:slug/done', async (req, env, { slug }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Sign in to keep your streak');
    const theme = await queryOne<{ id: string }>(
      env.DB_AR, `SELECT id FROM ar_daily_theme WHERE slug = ?`, [slug],
    );
    if (!theme) return notFound(`daily theme ${slug}`);

    await execute(
      env.DB_AR,
      `UPDATE ar_daily_delivery SET state = 'done', completed_at = datetime('now')
        WHERE user_ref = ? AND theme_id = ?`,
      [user, theme.id],
    );
    return ok({ slug, state: 'done' });
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
