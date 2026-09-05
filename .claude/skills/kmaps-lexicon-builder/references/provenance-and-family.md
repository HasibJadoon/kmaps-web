# Provenance, defects, register binding, and the ṣarf family spec

Read this before writing passages or the family block.

## 1. Verbatim-vs-paraphrase law

| Source class | Rule for the Arabic |
|---|---|
| **Public-domain classical** — al-ʿAyn, Maqāyīs, Ṣiḥāḥ, Mufradāt, Lisān, Qāmūs, Miṣbāḥ, Tāj, Asās, Lane | **Verbatim, word for word.** Never summarize, compress, normalize, or "improve". Keep the author's āyāt in ﴿ ﴾ and his references exactly as printed (even when the edition's ref is wrong — see defects). |
| **Modern, in-copyright** — Sinai *Key Terms*, Al-Jallad, any living author | **Paraphrase only.** Do not reproduce more than a short phrase. Capture the argument in your own words; still record page/section provenance. |

If you catch yourself rewording public-domain Arabic, stop and restore the original. The whole point of book scope is that the reader meets *this author's* actual words.

### Additive glosses
English and Urdu are **interlinear study aids placed beneath** the Arabic — never a replacement. `text_plain` is always the Arabic; EN/UR live in `data_json`.

### Translation standard (EN and UR)
Faithful **and** fluent **and** complete. Each gloss must carry the *identical meaning* of its passage, **clause for clause**, with **every āya and every example rendered** — not a summary, not a word-for-word calque. Render the āyāt in translation too (a bracketed sūra:āya ref is fine even where the author gives only the sūra name). Urdu in natural, fluent scholarly register; English likewise.

## 2. Defect ledger

Every imperfection gets a `D<n>` id and a home. **Classify by where the defect lives:**

- **Edition / source defect** (the printed edition itself is wrong): leave `raw_text` **faithful to the edition** (it is the archival record), and correct **only in the display block**, with an `editor_note` block documenting `printed` vs `corrected` and how you verified. Examples:
  - *Edition typo* — an impossible āya ref. **D41**: Mufradāt prints ﴿تقطّع بينكم﴾ as [الأنعام/١٩٤] though al-Anʿām has 165 āyāt; corrected to [٩٤]; tafsir.app prints the same typo → it is the edition's, not ours.
  - *Author mis-attribution the editor corrects* — keep the author's text verbatim and add the correction as a `footnote`. **Ṣiḥāḥ fn4**: al-Jawharī says "قال جرير"; Ibn Barrī corrects the verse to al-Farazdaq. (fn5: the يصهلن vs يشنفن variant.)
- **Ingest defect** (our pull is wrong/partial, the edition is fine): fix it to match the source, note it.
  - *Dittography already removed* — **D39**: the tafsir.app dump repeats "جلست بين القوم…" twice at بين=وسط; our raw has it once (correct).
  - *Missing footnote apparatus* — our ingests routinely drop the author's footnotes (poet attributions, qirāʾāt readers, hadith takhrīj). Re-add them from tafsir.app/Shamela as `footnote` blocks.
  - *Root-bleed / head orphan* — **D34/D35** (al-ʿAyn head orphan; نوب bleeding into بين), **D40** (Ṣiḥāḥ فصل التاء bleed).

Worked ledger for بين so far: D34 al-ʿAyn head orphan · D35 al-ʿAyn نوب root-bleed · D36 نيب/نوب sub-split · D37 Maqāyīs source lacuna (resolved via Lisān) · D38 Maqāyīs footnote-num · D39 Ṣiḥāḥ dittography (confirmed removed) · D40 Ṣiḥāḥ فصل التاء bleed · D41 Mufradāt Anʿām 194→94 edition typo.

`editor_note` `data_json`:
```json
{"defect":"D41","field":"ayah_ref","printed":"6:194","corrected":"6:94",
 "reason":"al-Anʿām has 165 āyāt; reference impossible",
 "verified_against":"tafsir.app (Dāwūdī ed.) prints the same typo",
 "status":"edition_error_corrected"}
```
`origin='kmaps_correction'`.

## 3. Register binding

Grammatical labels reference the master register **`ar_ling_gram_terms`** by key — not free text. Bind these:

- **tense** — `tense.perfect` (الماضي), `tense.imperfect` (المضارع), `tense.imperative` (الأمر)
- **derivation** — `derivation_type.masdar` (المصدر)
- **transitivity** — `transitivity.intransitive` = لازم · `transitivity.transitive` = متعدٍّ · `transitivity.transitive_by_harf` = متعدٍّ بحرف · `transitivity.ditransitive`
  - (note: متعدٍّ بحرفين is **not** yet in the register — flag if needed, don't invent a key.)
- **الأبواب (Form I bāb)** — the six أبواب are FK-able rows (`ar_ling_form_families`, kind `form_i_bab`): نَصَرَ, ضَرَبَ, فَتَحَ, عَلِمَ, كَرُمَ, حَسِبَ. Name the bāb the author implies (e.g. بين Form I is بَاب ضَرَبَ: بَانَ يَبِينُ).
- **form numbers** — roman `I…X` for the derived verbs; these map to `ar_ling_form_families` kind `derived_verb`.

The family block stores these as short keys/labels; a later view resolves them from the register. Deferred: the canonical `ar_ling_lemma_sarf` table (rejected for now) and QAC word-occurrence properties/moods.

## 4. `sarf_family` JSON spec (book scope)

One block per source, showing **that author's** identification of the family. Shape:

```json
{
  "scope": "book",
  "signature": "<the author's defining move, if any>",
  "core": { "ar": "<his core sense line>", "en": "<short en>", "poles": ["…","…"] },
  "forms": [
    { "roman":"I", "bab":"ضرب", "madi":"بَانَ", "mudari":"يَبِينُ",
      "masadir":["بَيْن","بَيْنونة"], "ism_fail":"…", "pole":"separation",
      "trans":["lazim","transitive_by_harf"], "ayah":"al-Anʿām 6:94", "gloss_ar":"…" }
  ],
  "authors_statement": { "ar":"…", "en":"…" },
  "transitivity_note": { "ar":"…", "en":"…" },
  "register": "labels bound to ar_ling_gram_terms",
  "note": "family as <author> presents it; book scope; synthesis deferred"
}
```

Field notes:
- `pole` — the author's own organizing axis. **al-Rāghib (Mufradāt):** poles `separation` (انفصال) / `disclosure` (ظهور), single core الخَلالة. **al-Jawharī (Ṣiḥāḥ):** `signature` = the **aḍdād** (bayn is a contronym: فراق + وصل), poles الفراق / الوصل / الوضوح.
- `trans` values are register keys: `lazim`, `transitive`, `transitive_by_harf`, `ditransitive`.
- Include a `masadir` array (the author's مصادر) and `ism_fail` where he names it (e.g. IV أَبَانَ → مُبِين).
- `authors_statement` — any line where the author binds the family himself (al-Rāghib: «بان واستبان وتبيّن نحو عجل واستعجل وتعجّل»).
- `transitivity_note` — any explicit ṣarf remark (al-Jawharī: «استبان وتبيّن وتبيّنته تتعدّى هذه الثلاثة ولا تتعدّى»).
- `origin='derived_display'` on the block (it is a study aid, not the author's running prose). Keep every label faithful to what the author actually names — do not add forms he does not mention.

The بين family across the lexica (for reference; each source shows only what *it* names):
I بَاب ضَرَبَ — separation (بَانَ/يَبِينُ; بَيْن·بَيْنونة·بُيون) & clarity (بَيان·تِبيان) · II بَيَّنَ (تَبيين) · III بَايَنَ · IV أَبَانَ/يُبِينُ (إبانة → مُبِين) · V تَبَيَّنَ · VI تَبَايَنَ · X اسْتَبَانَ.
