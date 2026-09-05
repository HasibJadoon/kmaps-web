---
name: kmaps-lexicon-builder
description: >-
  Build a book-scoped, trilingual (Arabic verbatim / English / Urdu) lexicon entry for one
  Arabic root from one classical dictionary, verified against the source and persisted to
  Cloudflare D1 as clean, passage-by-passage blocks with a per-source morphology (ṣarf) family
  panel and footnote apparatus, for K-Maps / km_arabic_linguistic. Use whenever the user wants
  to build, clean, verify, "do properly", or rebuild a root's entry for a source such as
  al-ʿAyn, Maqāyīs, al-Ṣiḥāḥ, al-Mufradāt, Lisān, al-Qāmūs, al-Miṣbāḥ, Tāj, or Lane. Trigger
  on: "build this root", "same for another source", "check and build properly", "trilingual
  passage by passage", "verify against tafsir.app / Shamela", "family / ṣarf panel", "blocks
  for D1", "book scope", naming a root (بين, كتب, برك, نذر) with a dictionary, or marching the
  roots of a Quran study passage (e.g. al-Dukhān 44). Do NOT paraphrase public-domain classical
  text — reproduce it verbatim; glosses are additive only.
---

# K-Maps Lexicon Builder

Take **one root × one dictionary** and produce a clean, verified, trilingual, book-scoped entry
in D1. The reader (a father teaching a son) should be able to read *that author's* treatment of
the root — the author's own senses, relationships, and depth — one source at a time. Cross-source
synthesis is deferred; this skill is strictly **book scope**.

Read the reference files as you need them:
- `references/d1-and-blocks.md` — databases, table schemas, the block model, ID/path conventions, and copy-paste SQL templates (delete-and-reinsert, insert). **Read before touching D1.**
- `references/provenance-and-family.md` — verbatim-vs-paraphrase law, defect ledger, register binding, and the ṣarf family-panel JSON spec. **Read before writing passages or the family block.**
- `references/render.md` — the illuminated-manuscript HTML render pipeline (fonts, wkhtmltoimage flags, aesthetic tokens). Read only if the user wants a rendered page.

## The golden rules (violating these defeats the purpose)

1. **Verbatim for public domain.** Classical lexica (al-ʿAyn, Maqāyīs, Ṣiḥāḥ, Mufradāt, Lisān, Qāmūs, Miṣbāḥ, Tāj, Lane) are far out of copyright — reproduce the Arabic **word for word**. Never summarize, paraphrase, or "improve" it. Paraphrase is allowed *only* for modern in-copyright sources (e.g. Sinai, Al-Jallad). If you catch yourself compressing the Arabic, stop and restore the original.
2. **Glosses are additive.** English and Urdu are interlinear study aids placed *beneath* the Arabic. They never replace or stand in for the original.
3. **Faithful, fluent, complete translation.** EN/UR must carry the *identical meaning* of the passage, clause for clause, every āya and every example rendered — fluent in the target language, not a summary and not a word-for-word calque.
4. **Book scope, source's own voice.** The family/ṣarf panel shows *this author's* identification of the root family — the forms he names and how he relates them — not a merged canonical paradigm.
5. **Provenance is paramount.** Document every defect (OCR error, dittography, edition typo, mis-attribution) explicitly as a defect note; never silently "fix" the source. Store source links.
6. **Register-bound labels.** Grammatical terms (ماضٍ، مضارع، مصدر، متعدٍّ، لازم، بحرف، الأبواب) reference the master register `ar_ling_gram_terms` by key — not free text.
7. **Deferred layers.** Word-occurrence properties and moods belong to the QAC/occurrence layer, and cross-source synthesis to the Roots/Root-layers/Lemmas layer — **not here**.

## Workflow

### 1 — Resolve the root and the source entry
Confirm the root (e.g. بين) and the dictionary. Pull the source entry from
`ar_ling_lexicon_root_entries` in **km_arabic_linguistic**: its `id`, `source_slug`,
`page_start`, `volume_no`, `source_url`, `source_path`, `status`, and full `raw_text`.
(See `references/d1-and-blocks.md` for IDs and the query.)

### 2 — Verify against the authoritative source
Fetch the same book+root from **tafsir.app** (`https://tafsir.app/<book-slug>/<root>`) or
**Shamela**, and compare our `raw_text` against it clause by clause. Check for:
- **Completeness** — is any sentence, verse, or example truncated? Are the author's **footnotes** present? (Our ingests frequently drop the footnote apparatus — poet attributions, qirāʾāt readers, hadith takhrīj.)
- **Defects** — OCR slips, **dittography** (a duplicated sentence in the edition), **edition typos** (e.g. an impossible āya reference), and **mis-attributions the author's own editor corrects** (e.g. Ibn Barrī reassigning a verse).
Assign each a defect id (`D<n>`) and note whether it lives in the *source/edition* (leave raw faithful, correct only in display with a note) or in *our ingest* (may be corrected). Report the verdict to the user before rebuilding.

### 3 — Segment into passages
Break the verbatim entry into coherent **sense-units**, preserving the author's own order and
structure. One passage per distinct point/derivative/nominal sense. A rich entry (Ṣiḥāḥ) may
need ~12 passages; a tighter one (Mufradāt) ~8. Name each passage by its content
(`the origin and the two senses`, `al-bayyina`, `the milking bāʾin`, …).

### 4 — Write each passage: verbatim Arabic + exact EN + exact UR
For every passage:
- `text_plain` = the author's **verbatim** Arabic (Qurʾānic āyāt in ﴿ ﴾, refs as the author gives them).
- `data_json.en` = the full faithful English of *that same passage*.
- `data_json.ur` = the full faithful Urdu of *that same passage*.
Keep EN free of straight apostrophes/quotes so it survives single-quoted SQL and stays valid JSON (see the SQL note in `references/d1-and-blocks.md`). Transliteration uses ʿ ʾ and macrons, never ASCII quotes.

### 5 — Build the source's family (ṣarf) panel
One `sarf_family` block holding *this author's* identification of the root family: his core, his
poles (e.g. al-Rāghib: انفصال/ظهور; al-Jawharī's signature: the **aḍdād** فراق/وصل), and each
form (بَاب) with ماضٍ · مضارع · مصادر · متعدٍّ/لازم, plus any statement the author makes binding
the family together, and any transitivity note he gives. Register-bound. Spec in
`references/provenance-and-family.md`.

### 6 — Apparatus: footnotes and defect notes
Add the author's **footnotes** as `footnote` blocks (verbatim Arabic + an `en` gloss in
`data_json`), and each defect as an `editor_note` block documenting printed-vs-corrected and how
it was verified.

### 7 — Persist to D1 (delete-and-reinsert)
Blocks are **rebuildable projections** — safe to delete and rebuild; the `raw_text` is the
archival source of record. Clear aux tables first (`_block_links`, `_block_annotations`,
`_block_tags`, `_quran_refs`), then children, then parents. Insert the clean set:
`root_header` → `sarf_family` → the passage blocks → `footnote`s → `editor_note`s. Then stamp the
entry: `parser_version = kmaps_<src>_verbatim_<N>p_trilingual`, `status = clean`. Exact SQL in
`references/d1-and-blocks.md`. Multi-statement batches work in the D1 tool; validate each JSON
against the table's `json_valid` check by inserting header+family first.

### 8 — (Optional) Render the manuscript page
If the user wants to *see* it, build the illuminated single-column page (map → verbatim reading →
apparatus) per `references/render.md`, render with `wkhtmltoimage`, sanity-check it is non-blank,
and present it.

## Verification checklist before you call it done
- [ ] Every Arabic passage is byte-for-byte the author's text (PD) — no compression.
- [ ] EN and UR each render the *whole* passage, faithfully and fluently.
- [ ] The family panel reflects **this** author's identification (not a synthesis).
- [ ] All footnotes captured; every defect has a note with printed-vs-corrected + how verified.
- [ ] Labels bound to `ar_ling_gram_terms`.
- [ ] Old fragmented blocks deleted; new block set is header + family + passages + footnotes + notes.
- [ ] Entry stamped (`parser_version`, `status='clean'`); source link stored.

## Marching through a Quran study passage
When the user is building a whole study passage (e.g. al-Dukhān 44 passage 1 = āyāt 1–9, 24
content-word roots), pull the worklist from **km_quran** `qr_morph_display_words`
(content-word roots in āya order) and run this skill per root, source by source, in the author
order al-ʿAyn → Maqāyīs → Ṣiḥāḥ → Mufradāt → (Lisān/Qāmūs/Miṣbāḥ/Tāj/Lane) → Sinai (modern,
paraphrase). See `references/d1-and-blocks.md` for the worklist query.
