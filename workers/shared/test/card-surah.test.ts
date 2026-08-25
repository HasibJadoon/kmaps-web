// ─── the sūra links a card could never get ───────────────────────────────────
//
// `core_srs_card_surah` was read in two places and written in none. That is the
// whole bug: an āyah card names its sūra in `resource_ref`, a root card's ref is
// `AL:root:<uid>` and names none, so a root card with no row here is invisible
// to every sūra-scoped query. Ghāfir has 66 root cards and returned zero.
//
// These run the repository's real statement against the real column layout.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1, type FakeD1 } from './d1-sqlite';
import { SrsRepo } from '../../core/src/repositories/srs.repo';

function seed(db: Database.Database): void {
  db.exec(`
    CREATE TABLE core_srs_card_surah (
      card_id TEXT NOT NULL,
      surah INTEGER NOT NULL,
      n_occur INTEGER NOT NULL DEFAULT 0,
      is_intro INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (card_id, surah)
    );
  `);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const repo = () => {
  const d1 = fakeD1(seed);
  return { repo: new SrsRepo(d1 as any), d1 };
};
/** Read back through the same D1 interface the repository writes through. */
type SurahRow = { surah: number; n_occur: number; is_intro: number };
const rows = async (d1: FakeD1, cardId: string): Promise<SurahRow[]> => {
  const { results } = await d1
    .prepare(`SELECT surah, n_occur, is_intro FROM core_srs_card_surah
               WHERE card_id = ? ORDER BY surah`)
    .bind(cardId)
    .all<SurahRow>();
  return results;
};

// كتب as km_quran actually reports it, shortened.
const SPREAD = [
  { surah: 2, n_occur: 48 },
  { surah: 3, n_occur: 36 },
  { surah: 40, n_occur: 4 },
  { surah: 44, n_occur: 1 },
];

describe('a root card finally gets its sūras', () => {
  test('every sūra of the spread is written', async () => {
    const { repo: r, d1 } = repo();
    const n = await r.linkSurahs('CARD1', SPREAD);
    assert.equal(n, 4);
    assert.deepEqual((await rows(d1, 'CARD1')).map((x) => x.surah), [2, 3, 40, 44]);
    assert.equal((await rows(d1, 'CARD1'))[0].n_occur, 48);
  });

  test('recording it twice replaces rather than duplicating', async () => {
    const { repo: r, d1 } = repo();
    await r.linkSurahs('CARD1', SPREAD);
    await r.linkSurahs('CARD1', [{ surah: 2, n_occur: 50 }]);
    const after = await rows(d1, 'CARD1');
    assert.equal(after.length, 1, 'the stale sūras are gone');
    assert.equal(after[0].n_occur, 50, 'the corrected count won');
  });

  test('one card\'s spread does not disturb another\'s', async () => {
    const { repo: r, d1 } = repo();
    await r.linkSurahs('CARD1', SPREAD);
    await r.linkSurahs('CARD2', [{ surah: 7, n_occur: 3 }]);
    assert.equal((await rows(d1, 'CARD1')).length, 4);
    assert.equal((await rows(d1, 'CARD2')).length, 1);
  });
});

describe('where it was met is not where it occurs first', () => {
  test('the intro marks the sūra the learner was given, not the lowest', async () => {
    // كتب occurs in 61 sūras beginning with al-Baqara. A learner who met it in
    // Ghāfir met it in Ghāfir; marking sūra 2 would invent a memory.
    const { repo: r, d1 } = repo();
    await r.linkSurahs('CARD1', SPREAD, 40);
    const intro = (await rows(d1, 'CARD1')).filter((x) => x.is_intro === 1);
    assert.equal(intro.length, 1);
    assert.equal(intro[0].surah, 40);
  });

  test('no intro is claimed when the caller does not know', async () => {
    const { repo: r, d1 } = repo();
    await r.linkSurahs('CARD1', SPREAD);
    assert.equal((await rows(d1, 'CARD1')).filter((x) => x.is_intro === 1).length, 0,
      'an unmarked spread is honest; a guessed intro is not');
  });

  test('an intro outside the spread marks nothing rather than adding a row', async () => {
    const { repo: r, d1 } = repo();
    await r.linkSurahs('CARD1', SPREAD, 99);
    assert.equal((await rows(d1, 'CARD1')).length, 4, 'no sūra invented');
    assert.equal((await rows(d1, 'CARD1')).filter((x) => x.is_intro === 1).length, 0);
  });
});

describe('bad input does not become bad rows', () => {
  test('an empty spread writes nothing and says so', async () => {
    const { repo: r, d1 } = repo();
    assert.equal(await r.linkSurahs('CARD1', []), 0);
    assert.equal((await rows(d1, 'CARD1')).length, 0);
  });

  test('a sūra number that is not one is dropped', async () => {
    const { repo: r, d1 } = repo();
    await r.linkSurahs('CARD1', [
      { surah: 0, n_occur: 5 },
      { surah: -1, n_occur: 5 },
      { surah: Number.NaN, n_occur: 5 },
      { surah: 12, n_occur: 5 },
    ]);
    assert.deepEqual((await rows(d1, 'CARD1')).map((x) => x.surah), [12]);
  });

  test('a negative count is floored at zero rather than stored', async () => {
    const { repo: r, d1 } = repo();
    await r.linkSurahs('CARD1', [{ surah: 12, n_occur: -3 }]);
    assert.equal((await rows(d1, 'CARD1'))[0].n_occur, 0);
  });
});
