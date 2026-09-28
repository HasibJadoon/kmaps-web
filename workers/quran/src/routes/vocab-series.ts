import type { Router } from '../../../shared/src/router';
import { ok, badRequest, notFound, internalError } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';

/* The vocabulary series — the spine for studying a sūra's words one at a time,
 * root → lemma → word, and for shooting an episode per word.
 *
 * These are GET routes on the `qr` module, which the gateway already serves
 * without a token (modules.ts: publicGet). Nothing here reads a user, a
 * workspace or a role, and nothing here writes — so it stays that way.
 *
 * The rule that shapes every query: nothing repeats. A root is introduced
 * once, a lemma once under its root, a word once under its lemma. A sūra's
 * vocabulary is therefore what that sūra introduces, not everything it
 * contains — otherwise studying sūra by sūra means meeting اللَّه two thousand
 * times and the series never ends.
 *
 * `scope` chooses what "introduces" means:
 *   surah   first time in this sūra          (default — study one sūra alone)
 *   quran   first time in the whole Qurʾān   (a reading order across all 114)
 */

type Scope = 'surah' | 'quran';

function parseScope(url: URL): Scope {
  return url.searchParams.get('scope') === 'quran' ? 'quran' : 'surah';
}

/* Word rows carry a `pos` from the corpus tagset. Particles are excluded from
 * the series by default: they are closed-class, they have no root to build a
 * family from, and the whole premise of root → lemma → word does not apply to
 * them. `include=all` turns them back on. */
const CONTENT_ONLY = 'is_content_word = 1';

interface RootRow {
  root: string;
  lemma_count: number;
  word_count: number;
  occurrences: number;
  first_ayah: number;
  first_word_index: number;
  sample: string;
}

export function vocabSeriesRoutes(router: Router<QuranEnv>): void {

  /* ---------------------------------------------------------------- surah */

  /* The roots a sūra introduces, in the order they are first met — which is
   * the order they should be taught and shot in. */
  router.get('/qr/vocab/surah/:surah', async (req, env, { surah: surahParam }) => {
    const surah = parseIntParam(surahParam);
    if (surah === null || surah < 1 || surah > 114) {
      return badRequest('surah must be 1–114');
    }
    const url = new URL(req.url);
    const scope = parseScope(url);
    const includeAll = url.searchParams.get('include') === 'all';

    try {
      /* A root's first appearance anywhere, used to decide whether this sūra
       * is the one that introduces it. Computed in the same statement rather
       * than a second round trip, because D1 charges per statement. */
      const novelty = scope === 'quran'
        ? `AND w.root IN (
             SELECT root FROM qr_word_occurrence
             WHERE root IS NOT NULL
             GROUP BY root
             HAVING MIN(surah * 100000 + ayah * 1000 + word_index)
                    >= ${surah} * 100000
                AND MIN(surah) = ${surah}
           )`
        : '';

      const rows = await query<RootRow>(env.DB_QR, `
        SELECT
          w.root                                   AS root,
          COUNT(DISTINCT w.lemma)                  AS lemma_count,
          COUNT(DISTINCT w.word_text_bare)         AS word_count,
          COUNT(*)                                 AS occurrences,
          MIN(w.ayah)                              AS first_ayah,
          MIN(w.ayah * 1000 + w.word_index)        AS first_word_index,
          MIN(w.word_text)                         AS sample
        FROM qr_word_occurrence w
        WHERE w.surah = ?
          AND w.root IS NOT NULL AND w.root <> ''
          ${includeAll ? '' : `AND w.${CONTENT_ONLY}`}
          ${novelty}
        GROUP BY w.root
        ORDER BY first_word_index
      `, [surah]);

      return ok({
        surah,
        scope,
        root_count: rows.length,
        roots: rows.map((r) => ({
          root: r.root,
          lemmas: r.lemma_count,
          words: r.word_count,
          occurrences: r.occurrences,
          first_ayah: r.first_ayah,
          sample: r.sample,
        })),
      });
    } catch (e) {
      return internalError(`vocab surah failed: ${String(e)}`);
    }
  });

  /* ----------------------------------------------------------------- root */

  /* One root, its lemma family, and every distinct word form under each
   * lemma. This is one episode: the root's sense, then the family it grows,
   * then the forms actually used. */
  router.get('/qr/vocab/root/:root', async (req, env, { root: rootParam }) => {
    const root = decodeURIComponent(rootParam ?? '').trim();
    if (!root) return badRequest('root is required');

    const url = new URL(req.url);
    const surahFilter = parseIntParam(url.searchParams.get('surah') ?? '');
    const scoped = surahFilter !== null && surahFilter >= 1 && surahFilter <= 114;

    try {
      const words = await query<{
        lemma: string | null;
        word_text: string;
        word_text_bare: string;
        pos: string | null;
        gt_derivation_type: string | null;
        gt_form_family: string | null;
        surah: number;
        ayah: number;
        word_index: number;
        freq: number;
      }>(env.DB_QR, `
        SELECT
          w.lemma, w.pos, w.gt_derivation_type, w.gt_form_family,
          MIN(w.word_text)                  AS word_text,
          w.word_text_bare                  AS word_text_bare,
          MIN(w.surah)                      AS surah,
          MIN(w.ayah)                       AS ayah,
          MIN(w.word_index)                 AS word_index,
          COUNT(*)                          AS freq
        FROM qr_word_occurrence w
        WHERE w.root = ?
          ${scoped ? 'AND w.surah = ?' : ''}
        GROUP BY w.lemma, w.word_text_bare
        ORDER BY w.lemma, freq DESC
      `, scoped ? [root, surahFilter] : [root]);

      if (words.length === 0) return notFound(`no words for root ${root}`);

      /* Group in the worker rather than asking D1 twice. Each word form
       * appears once under its lemma, each lemma once under the root. */
      const families = new Map<string, {
        lemma: string;
        derivation: string | null;
        form_family: string | null;
        occurrences: number;
        words: Array<{ text: string; bare: string; pos: string | null; freq: number;
                       first: { surah: number; ayah: number } }>;
      }>();

      for (const w of words) {
        const key = w.lemma ?? '—';
        let fam = families.get(key);
        if (!fam) {
          fam = {
            lemma: key,
            derivation: w.gt_derivation_type,
            form_family: w.gt_form_family,
            occurrences: 0,
            words: [],
          };
          families.set(key, fam);
        }
        fam.occurrences += w.freq;
        fam.words.push({
          text: w.word_text,
          bare: w.word_text_bare,
          pos: w.pos,
          freq: w.freq,
          first: { surah: w.surah, ayah: w.ayah },
        });
      }

      const family = [...families.values()].sort((a, b) => b.occurrences - a.occurrences);

      return ok({
        root,
        surah: scoped ? surahFilter : null,
        lemma_count: family.length,
        word_count: words.length,
        occurrences: family.reduce((n, f) => n + f.occurrences, 0),
        family,
      });
    } catch (e) {
      return internalError(`vocab root failed: ${String(e)}`);
    }
  });

  /* ---------------------------------------------------------------- lemma */

  /* One lemma and the forms under it, with where each is first met. */
  router.get('/qr/vocab/lemma/:lemma', async (_req, env, { lemma: lemmaParam }) => {
    const lemma = decodeURIComponent(lemmaParam ?? '').trim();
    if (!lemma) return badRequest('lemma is required');

    try {
      const rows = await query<{
        word_text: string; word_text_bare: string; root: string | null;
        pos: string | null; gt_case: string | null; gt_number: string | null;
        gt_gender: string | null; gt_person: string | null; gt_voice: string | null;
        gt_tense: string | null; gt_mood: string | null;
        surah: number; ayah: number; word_index: number; freq: number;
      }>(env.DB_QR, `
        SELECT
          MIN(w.word_text) AS word_text, w.word_text_bare, w.root, w.pos,
          w.gt_case, w.gt_number, w.gt_gender, w.gt_person,
          w.gt_voice, w.gt_tense, w.gt_mood,
          MIN(w.surah) AS surah, MIN(w.ayah) AS ayah, MIN(w.word_index) AS word_index,
          COUNT(*) AS freq
        FROM qr_word_occurrence w
        WHERE w.lemma = ?
        GROUP BY w.word_text_bare
        ORDER BY freq DESC
      `, [lemma]);

      if (rows.length === 0) return notFound(`no words for lemma ${lemma}`);

      return ok({
        lemma,
        root: rows[0].root,
        word_count: rows.length,
        occurrences: rows.reduce((n, r) => n + r.freq, 0),
        words: rows.map((r) => ({
          text: r.word_text,
          bare: r.word_text_bare,
          pos: r.pos,
          freq: r.freq,
          first: { surah: r.surah, ayah: r.ayah },
          features: {
            case: r.gt_case, number: r.gt_number, gender: r.gt_gender,
            person: r.gt_person, voice: r.gt_voice, tense: r.gt_tense, mood: r.gt_mood,
          },
        })),
      });
    } catch (e) {
      return internalError(`vocab lemma failed: ${String(e)}`);
    }
  });

  /* --------------------------------------------------------------- motifs */

  /* A sūra's motifs and tafsīr themes — the layer above vocabulary, where
   * recurring words add up to something the sūra is doing.
   *
   * Authored coverage is thin (see the `coverage` field in the reply, which
   * says so rather than returning an empty list that reads like an error), so
   * a client should treat this as optional furniture, not a required scene. */

  /* ---------------------------------------------------------------- index */

  /* What the series covers, so a client can build a picker without walking
   * all 114 sūras one request at a time. */
  router.get('/qr/vocab/index', async (_req, env) => {
    try {
      const rows = await query<{ surah: number; roots: number; lemmas: number; words: number }>(
        env.DB_QR, `
        SELECT surah,
               COUNT(DISTINCT root)  AS roots,
               COUNT(DISTINCT lemma) AS lemmas,
               COUNT(DISTINCT word_text_bare) AS words
        FROM qr_word_occurrence
        WHERE root IS NOT NULL AND root <> '' AND ${CONTENT_ONLY}
        GROUP BY surah ORDER BY surah
      `);
      return ok({
        surah_count: rows.length,
        total: {
          roots: await scalar(env.DB_QR,
            `SELECT COUNT(DISTINCT root) n FROM qr_word_occurrence WHERE root IS NOT NULL AND root <> ''`),
          lemmas: await scalar(env.DB_QR,
            `SELECT COUNT(DISTINCT lemma) n FROM qr_word_occurrence WHERE lemma IS NOT NULL`),
        },
        surahs: rows,
      });
    } catch (e) {
      return internalError(`vocab index failed: ${String(e)}`);
    }
  });
}

async function scalar(db: D1Database, sql: string): Promise<number> {
  const rows = await query<{ n: number }>(db, sql);
  return rows[0]?.n ?? 0;
}
