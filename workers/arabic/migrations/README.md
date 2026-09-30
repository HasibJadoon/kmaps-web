# AR Migrations — km_arabic

Co-located migration files for the `km_arabic` D1 database.
**All tables use prefix `ar_*`. Linguistic truth uses `AL:ULID` typed refs — never duplicated here.**

## Apply

```bash
wrangler d1 migrations apply km_arabic --remote
wrangler d1 migrations list  km_arabic --remote
```

The ledger (`d1_migrations` in the database) is authoritative: `apply` runs every file in this
directory that the ledger does not name, in the order it lists them. A file applied by hand with
`d1 execute --file` **must also be recorded** (`INSERT INTO d1_migrations (name) VALUES ('<file>')`),
or the next `apply` runs it again. As of 0024 the ledger is complete (0001–0024 plus the two
`kmaps_cache_version*.sql` files, which `apply` treats as migrations like any other).

Migrations here are not all re-runnable: `0009_ar_rooms_and_practice.sql` **empties and rebuilds
`ar_practice_pool` from the audio segments**, throwing away every timing or translation written to
the pool since. Never let it run twice — check `migrations list` before `apply` on a database whose
ledger you are unsure of.

## Run Order (deploy after AL — AR references AL via typed refs)

| File | Key Tables |
|------|-----------|
| 0001–0008 | schema, text units, scripts, daily dialogue |
| 0009 | ar_room, ar_practice_pool (rebuilt from segments — see above) |
| 0010–0016 | pool English, scene vocab, practice labels, common words |
| 0017–0020 | scene lexemes, learner units and levels |
| 0021–0024 | media rooms, junk archived, read pool, FTS update trigger |
| 0026–0027 | the grammar path (labels, ar_scene_feature_term — filled by `scripts/map-scene-terms.py`); al-Ghalāyīnī's lesson titles |
| 0028–0034 | grammar in sentences: ar_grammar_sentence (the lessons' and books' examples — filled by kmaps-resources `scripts/grammar/mine_examples.py`), its bāb and rule context; ar_read_pool.grade and ar_word_freq (kmaps-resources `scripts/arabic-episodes/drill_words.py grade`); the practice Grammar plan per level, the sentence bands, the grammar books' registers; cache triggers on ar_practice_label and ar_grammar_sentence |
| kmaps_cache_version*.sql | the content cache-version row and its stamping triggers |
