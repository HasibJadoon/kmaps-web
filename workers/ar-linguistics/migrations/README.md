# AL Migrations — km_arabic_linguistic

Co-located migration files for the `km_arabic_linguistic` D1 database.
**All tables use the single prefix `ar_ling_*`. There is no `al_*` prefix anywhere.**

## Apply

```bash
wrangler d1 migrations apply km_arabic_linguistic --remote
wrangler d1 migrations list  km_arabic_linguistic --remote
```

## Run Order (deploy this DB first — no dependencies)

| File | Layer | Key Tables |
|------|-------|------------|
| 001_al_schema.sql | 1–10 | ar_ling_roots → ar_ling_lemmas → ar_ling_morphology → ar_ling_nahw_concepts → ar_ling_balagha_concepts → ar_ling_lexicon_entries → ar_ling_senses → ar_ling_expressions → ar_ling_sources → ar_ling_bridges |

Source: `database/migrations/km-arabic-linguistic/001_al_schema.sql`

## The ledger is not complete

`d1_migrations` in this database names only part of what is live (0001–0061 and the files
applied by hand since), so `migrations apply` would re-run files that are already applied. Apply a
new file with `wrangler d1 execute km_arabic_linguistic --remote --file migrations/<file>` and then
record it: `INSERT OR IGNORE INTO d1_migrations (name) VALUES ('<file>')`.

| File | What |
|------|------|
| 0109_gt_discipline_codes.sql | the term registry and its categories on one code per discipline (NH, SF, BL, DL) |
| 0110_adima_dirasat_rows.sql | ʿUḍayma's Dirāsāt as rows — ar_ling_adima_entry, ar_ling_adima_note (filled by `scripts/parse-adima.py`) |
| 0111_gt_aliases_as_taught.sql | the names the lessons call terms by, as aliases (the scene → term mapping reads them) |
