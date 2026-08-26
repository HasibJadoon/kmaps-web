-- 0110 — Make room for ʿAḍīma's Qurʾānic studies, and for enumerated citations.
--
-- The 25 ingested grammar books (21,319 chunks, 20.7M chars) already carry the
-- classical ṣarf and naḥw. What none of them carries is an exhaustive list of where
-- each term actually occurs in the muṣḥaf. عضيمة · دراسات لأسلوب القرآن الكريم does
-- exactly that: 571 entries, each naming one term and then enumerating every Qurʾānic
-- instance of it with the verse text and a reference.
--
-- The entries land in ar_ling_gram_chunk like any other book, so they inherit FTS, the
-- bāb link and every existing reader. What is new is the citation carrier: the
-- enumerated instances, one row each, which is the bridge from a classical term to a
-- real word in the muṣḥaf and therefore the thing that makes tier `sourced` reachable
-- in qr_word_term.
--
-- ORIENTATION. ʿAḍīma's bracket order is not uniform in this transcription:
--   {فأذن مؤذن بينهم أن لعنة الله على الظالمين} [7: 44]  -> al-Aʿrāf 7:44   surah:ayah
--   {الذين يجعلون مع الله إلها آخر}            [96:15]  -> al-Ḥijr 15:96   ayah:surah
-- Both readings are in range for most pairs, so the order cannot be assumed. Each row
-- keeps the raw pair (num_a, num_b) alongside the resolved surah/ayah, and records how
-- it was resolved. A row whose orientation could not be settled against the muṣḥaf text
-- stays state='unresolved' and must not be read as a citation.

CREATE TABLE IF NOT EXISTS ar_ling_gram_chunk_citation (
  id             TEXT PRIMARY KEY,
  chunk_id       TEXT NOT NULL,
  source_slug    TEXT NOT NULL,
  seq            INTEGER NOT NULL,
  num_a          INTEGER NOT NULL,      -- as printed, left of the colon
  num_b          INTEGER NOT NULL,      -- as printed, right of the colon
  surah          INTEGER,               -- resolved
  ayah           INTEGER,               -- resolved
  ayah_text_ar   TEXT,                  -- the {...} the citation was attached to
  orientation    TEXT CHECK (orientation IN ('surah_ayah','ayah_surah')),
  resolved_by    TEXT CHECK (resolved_by IN ('text_match','entry_majority','unique_valid')),
  state          TEXT NOT NULL DEFAULT 'unresolved'
                 CHECK (state IN ('unresolved','resolved','ambiguous','rejected')),
  qr_ayah_ref    TEXT,                  -- typed cross-domain ref: QR:<ayah id>
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gram_cite_chunk  ON ar_ling_gram_chunk_citation (chunk_id, seq);
CREATE INDEX IF NOT EXISTS idx_gram_cite_ayah   ON ar_ling_gram_chunk_citation (surah, ayah) WHERE state='resolved';
CREATE INDEX IF NOT EXISTS idx_gram_cite_source ON ar_ling_gram_chunk_citation (source_slug, state);

-- Which term each entry is about. An entry is one term's treatment, so this is the
-- join that turns "every instance ʿAḍīma lists" into "every instance of THIS term".
CREATE TABLE IF NOT EXISTS ar_ling_gram_chunk_term (
  chunk_id     TEXT NOT NULL,
  term_id      TEXT NOT NULL,
  match_kind   TEXT NOT NULL CHECK (match_kind IN ('exact','prefix','contains','manual')),
  state        TEXT NOT NULL DEFAULT 'auto' CHECK (state IN ('auto','confirmed','rejected')),
  note         TEXT,
  PRIMARY KEY (chunk_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_gram_chunk_term_term ON ar_ling_gram_chunk_term (term_id, state);
