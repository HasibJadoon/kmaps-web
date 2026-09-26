# Episode scripts — `ar_text_unit.script_json`

An episode of a series (e.g. *قصص الحيوان في القرآن*) is held in `km_arabic` as raw
auto-captions in `ar_text_unit.text_ar`. A **script** is the reconstruction made from them,
stored beside it in `ar_text_unit.script_json` and served by `GET /ar/text/units/:id/script`
(the reader's slide sheet).

One file per episode. `<name>.py` holds the script as data and prints its `UPDATE`;
`<name>.sql` (the first, Namla) is plain SQL.

```bash
python3 scripts/episodes/apply.py dhib_ep1        # from workers/arabic
```

## How a script is made

- **From the Arabic alone.** Captions are repaired by grammar, the scene, dialect, and the
  Qur'an the dialogue echoes. The archive's machine English (`meta_json.translation_en`) is
  unreliable and is **not** used — for the Arabic or the translation.
- **Every repair is shown** in the line's `note`: what the captions heard, what it was read as.
  A gap is marked, never filled; an uncertain reading says so.
- **Āyāt** are given in full from the muṣḥaf, as their own line with
  `note: "آية قرآنية — سورة … | Qur'an s:a"` (the route turns that into `kind: ayah` + `ref`).
- **Speakers** are named only where the dialogue makes them plain; otherwise `null`, with a
  note ("perhaps …", "one of Joseph's brothers").
- **Slide data** lives in the script, not the app: each scene's `icon` (SF Symbol), `era`
  (`present` frame story / `past` tale), `summary_en`; and a `cast` with an icon per speaker.
- The **English** is a fresh translation of the reconstructed Arabic, written as script.

These files used to live in `kmaps-database` (`database/data/ar_scripts`, `database/seeds`),
which is no longer the home for km_arabic data.
