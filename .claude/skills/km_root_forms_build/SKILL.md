---
name: km_root_forms_build
description: >-
  Take any Arabic root's sarf_family (morphology/ṣarf paradigm) blocks in km_arabic_linguistic
  to full v2 schema depth across the standard 11-source roster, and identify what's missing to
  get there. Covers both the SCHEMA MIGRATION path (existing v1 blocks → deduplicated, registry-
  bound v2) and the NEW DEPTH path (building a source that doesn't exist yet for this root, per
  the kmaps-lexicon-builder verbatim workflow, verified against tafsir.app). Use whenever the
  user names a root (بين, برك, كتب, نزل, ...) and asks to migrate, deepen, "do the same as
  بين/برك", build "all 11", or march the content-word roots of a Quran passage (e.g. the
  ad-Dukhān 44:1-9 passage-march list). Trigger on: "next root", "v2 migration", "all sources
  and forms done", "need all 11", "verse by verse".
---

# K-Maps Root Forms Build — the v2 sarf_family checklist

This is the **morphology/ṣarf-family layer only** — one `sarf_family` JSON block per source per
root in `ar_ling_lexicon_block` (`block_type='sarf_family'`). It sits *inside* the larger
`kmaps-lexicon-builder` pipeline (which also covers passages, footnotes, defect notes) but is
scoped narrower: just the forms[]/derivations[] paradigm panel. Read
`references/v2-schema.md` before writing any block — it is the single source of truth for the
`SarfForm`/`SarfBlock` shape, supersedes the v1 shape in `kmaps-lexicon-builder`'s
`provenance-and-family.md`, and that file should be kept in sync with this one (edit both when a
new field is added).

## The two paths — diagnose which one applies first

Query what already exists before doing anything:
```sql
SELECT b.id, b.source_slug, s.author_death_ah, s.title_ar
FROM ar_ling_lexicon_block b LEFT JOIN ar_ling_source s ON s.slug=b.source_slug
WHERE b.block_type='sarf_family' AND b.root_norm='<root>' ORDER BY s.author_death_ah;
```
- **Path A — Migration.** A block exists but uses the v1 shape (bare `signature`+`core`+
  `authors_statement`, bundled `"roman":[...]` arrays, bare `masdar`/`ism_fail` without `_term`
  keys, no `pole_family`). Go to §Migration below.
- **Path B — New depth.** The root has fewer than the full source roster (§Source roster) built
  at all. Go to §New-source build below. This is the slower, source-verification path — it is
  the full `kmaps-lexicon-builder` workflow (fetch → verify → segment → write), not a quick pass.

**Never assume Path A when Path B is what's needed.** A root at 1-2 sources is not "midway
migrated" — it is *thin*, and no amount of schema polish substitutes for actually mining more
dictionaries.

## Source roster (chronological, the standard 11)

| # | source_slug | author_death_ah | title_ar |
|---|---|---|---|
| 1 | khalil_kitab_ayn | 170 | كتاب العين |
| 2 | ibn_durayd_jamharat_lugha | 321 | جمهرة اللغة |
| 3 | jawhari_sihah | 393 | الصحاح |
| 4 | maqayis_lugha | 395 | معجم مقاييس اللغة |
| 5 | raghib_mufradat | 502 | المفردات في غريب القرآن |
| 6 | ibn_manzur_lisan_arab | 711 | لسان العرب |
| 7 | fayyumi_misbah_munir | 770 | المصباح المنير |
| 8 | qamus_muhit | 817 | القاموس المحيط |
| 9 | zabidi_taj_arus | 1205 | تاج العروس |
| 10 | lane_lexicon | (modern) | Lane's Lexicon |
| 11 | sinai_key_terms | (modern) | Sinai, Qurʾānic key terms (paraphrase-only; thin by design) |

Sort chronologically by `author_death_ah`, undated (modern) sources last, in this fixed order
(10 before 11) when two are both undated.

## §Migration (Path A) — per block

1. Fetch the block's `data_json`, note every form the source gives (don't drop any).
2. Determine `root_type` (`GT:root_type:*` — sound/hollow/hamzated/doubled/assimilated/
   defective/lafif) once for the whole block from the root's actual letters, not copy-pasted
   from another root.
3. Consolidate `signature`+`core`+`authors_statement` into `block_meta.{core, distinctive_note,
   authors_own_words}` — say each thing once (§v2-schema.md rule 6).
4. Split every bundled `"roman":[...]` array into individual `form_id`-tagged rows; move the
   shared claim into `levelling_groups[]` and cross-link via `levels_with[]` (rule 2). If the
   author only draws an *analogy* (not an equivalence claim), keep it in `authors_own_words` or a
   `trans_note`, and do **not** force `levels_with` — that key means "the author says these are
   the same," not "these are related."
5. For every form: assign `bab` **or** `form_tier` (never both, never neither — Form I gets
   `bab`, Forms II-XII get `form_tier`), full `GT:` codes for `tense`/`derivation_type`/
   `transitivity`, `trans` always an array (`[]` not `null`), `ism_fail_term`/`ism_maf_term` keys
   always present even when `null`.
6. If a form bundles genuinely distinct senses, shorten `gloss` to a label and move the substance
   into `senses[]` (rule 3) — never let both repeat the same content.
7. If a form is a passive-only citation (no independent active madi), use `voice:"passive"` +
   `passive_form`/`passive_masdar` rather than fabricating an active madi.
8. Assign `pole_family` per form/derivation — reuse an existing `PF:*` key from
   `references/pole-families.md` if the sense matches; mint a new one (and add it to that file)
   only if it genuinely doesn't fit an existing family. Root-specific families (e.g.
   `PF:ktb_joining_writing`, `PF:baraka_fixity_kneeling`) are fine and expected — don't force a
   برك sense into a بين pole_family just because both happen to be hollow/sound roots.
9. Validate: `SELECT json_valid(data_json) FROM ar_ling_lexicon_block WHERE id='<id>'` must
   return 1 before moving to the next source.

## §New-source build (Path B)

This is `kmaps-lexicon-builder`'s full workflow (see that skill's `SKILL.md` steps 1-7), narrowed
to producing the `sarf_family` block specifically. Two things learned this session that update
that skill:

**tafsir.app coverage is partial.** Confirmed hosted there (with a working URL pattern
`https://tafsir.app/<slug>/<root-in-arabic-or-percent-encoded>`, e.g.
`tafsir.app/qamoos/أرض`): الصحاح, لسان العرب, القاموس المحيط, مقاييس اللغة, المفردات (الراغب).
**Not hosted there:** كتاب العين, جمهرة اللغة, تاج العروس, Lane's Lexicon — these need Shamela or
another verified digitization; do not guess a tafsir.app slug for them and do not fetch a URL you
haven't first found via search or an on-page link (the web_fetch tool rejects URLs you haven't
actually seen). Confirm each book's real slug via `web_search` before trying to `web_fetch` it —
the homepage's book links render as JS-driven `#` anchors, not visible `href`s, so a search
engine result (which indexes the resolved URL) is the reliable way to find the real slug.

**Verify before writing, every time** — this is `kmaps-lexicon-builder` golden rule 5, restated
because it's easy to skip under time pressure: do not write a "verbatim" passage or family panel
from memory/recall alone. Either fetch the real page and quote it, or clearly flag the content as
unverified and get confirmation before persisting it as `status='clean'`.

## Reusable across roots — what to check every time

- [ ] `root_type` correct for *this* root's actual letters (don't inherit from a previous root)
- [ ] Every form has exactly one of `bab`/`form_tier` populated
- [ ] `trans` is always `[]` or an array of `GT:transitivity:*`, never `null`
- [ ] `ism_fail_term`/`ism_maf_term` keys present on every form (value `null` when unused)
- [ ] No form's `gloss` repeats what its own `senses[]` already says
- [ ] `pole_family` assigned wherever `pole` is set; new `PF:*` keys added to
      `references/pole-families.md`, not left implicit
- [ ] `levels_with` only where the author claims equivalence, not mere resemblance
- [ ] `json_valid(data_json) = 1` on every touched block before moving on

## Verse-order convenience (ad-Dukhān 44:1-9 passage-march)

For this specific benchmark passage, the content-word roots in first-appearance order are:
2 كتب، بين · 3 نزل، ليل، برك، نذر · 4 فرق، امر · 5 امر(again)، رسل · 6 رحم، رب، سمع، علم ·
7 رب(again)، سمو، ارض، بين(again) · 8 اله، حيي، موت، رب(again)، ابو، اول. When the user says
"next root, verse by verse," walk this list in order, skipping roots already at full depth.
