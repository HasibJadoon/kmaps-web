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

type SurahRow = { surah: number; n_occur: number; is_intro: number };
const rows = async (d1: FakeD1, cardId: string): Promise<SurahRow[]> => {
  const { results } = await d1
    .prepare(`SELECT surah, n_occur, is_intro FROM core_srs_card_surah
               WHERE card_id = ? ORDER BY surah`)
    .bind(cardId)
    .all<SurahRow>();
  return results;
};

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

describe('one timestamp format reaches the column', () => {
  test('a new card is scheduled in ISO, not SQLite\'s datetime()', async () => {

    const d1 = fakeD1((db) => {
      db.exec(`CREATE TABLE core_srs_card (
        id TEXT, deck_id TEXT, user_ref TEXT, module TEXT, resource_type TEXT,
        resource_ref TEXT, card_template TEXT, front_text TEXT, back_text TEXT,
        extra_json TEXT, tags TEXT, card_kind TEXT, concept_domain TEXT,
        note_type_id TEXT, fields_json TEXT, root_norm TEXT, intro_surah INTEGER, intro_ayah INTEGER,
        next_review_at TEXT, work_ref TEXT, leech INTEGER DEFAULT 0,
        suspended INTEGER DEFAULT 0, stability REAL, difficulty REAL,
        card_state TEXT DEFAULT 'new', learning_step INTEGER DEFAULT 0,
        reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0,
        elapsed_days INTEGER DEFAULT 0, scheduled_days INTEGER DEFAULT 0,
        last_review_at TEXT, created_at TEXT, updated_at TEXT,
        UNIQUE (deck_id, resource_ref, card_template));`);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = new SrsRepo(d1 as any);
    const { card } = await r.insertCard({
      deck_id: 'D1', user_ref: 'U1', module: 'AL',
      resource_type: 'root', resource_ref: 'AL:root:abc',
    });
    assert.match(card.next_review_at ?? '', /^\d{4}-\d{2}-\d{2}T.*Z$/,
      `expected an ISO stamp, got ${card.next_review_at}`);
    assert.ok(!Number.isNaN(new Date(card.next_review_at ?? '').getTime()),
      'a client must be able to parse it');
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
