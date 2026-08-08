# Importing an Anki collection

Three steps, because the middle one is the one worth arguing with.

```bash
# 1. Unpack. A .colpkg is a zip; the collection is zstd-compressed SQLite.
unzip -q collection.colpkg -d anki/ && zstd -d anki/collection.anki21b -o col.sqlite

# 2. Pull the ayah text for the surahs the collection covers.
npx wrangler d1 execute km_quran --remote --json \
  --command "SELECT surah, ayah, text_bare, text_uthmani_clean FROM qr_ayah WHERE surah IN (6,7,82)" > ayat.json

# 3. Prepare — clean, reference, classify, sort, deduplicate. Writes JSON and
#    prints what it decided. Read the report before importing.
python3 prepare.py col.sqlite ayat.json cards.json

# 4. Import, in batches, with the review history.
python3 import.py tok.txt cards.json 12
```

`prepare.py` does the work the naive export skips:

- **The ayah.** Most cards quote without citing, so the reference is recovered
  by matching the quotation against the Qurʾān itself — a trigram vote over
  normalised text, since hand-typed quotations rarely match character for
  character. A card filed under "al-Anʿām" that quotes 6:164 gets `6:164`.
  A card tagged al-Anʿām that cites al-Infiṭār gets `82:10`, because the
  citation outranks the tag.
- **What it teaches.** Decided by where the quotation sits: a quotation on the
  first line is a card about the ayah (`translation`); a quotation under a
  paradigm line is a card about the word (`vocabulary`).
- **Duplicates.** Same content entered twice keeps the copy with the longer
  history — that is the one that reflects what was actually learned.

The history comes across and is replayed through FSRS at the timestamps it
happened, so a card answered thirty times over five years arrives mature
instead of new. See `POST /core/srs/import/anki`.

`reclassify.py` exists because the classifier improved after an import had
already run: re-importing skips everything (origin dedup working as intended),
so corrections go over as PATCHes, which never touch the schedule.

Media is not imported. A 305 MB collection carried 20,500 media files and only
five notes referenced any of them.
