---
name: kmaps-passage-builder
description: >-
  Cut a sūra into study passages in K-Maps / km_quran, with every boundary sourced to the
  mufassirūn rather than to rukūʿ marks. Reads qr_tafsir_book_display_block (41,056 blocks across
  eight works, āyah-keyed and FTS-indexed) and qr_irab_book_entry, and derives boundaries from where
  al-Rāzī (مفاتيح الغيب), al-Ālūsī (روح المعاني), Ibn ʿĀshūr (التحرير والتنوير) and al-Zamakhsharī
  (الكشاف) group āyāt together. Writes qr_surah_study_passage. Use whenever the user wants to build,
  cut, fix or re-cut the passages of a sūra — e.g. "build passages for surah 30", "this sūra has no
  passages", "the passages cut mid-argument", "passage structure for X", "divide the surah". A sūra
  with no passages cannot be opened in the reader at all. Never invent a boundary or a citation.
---

# K-Maps Passage Builder

Cut one sūra into passages, and record **who says the cut belongs there**.

A passage is not a formatting decision. It is a claim that a movement of the sūra begins here and
ends there, and that claim has a literature. The reader — a father teaching a son — should be able
to ask why a passage starts where it does and get an answer with a name attached.

**A sūra with no passages cannot be opened in the app.** That is the usual reason to run this.

## The golden rules

1. **The boundary comes from the mufassirūn, not from rukūʿ.** Rukūʿ marks are a recitation
   convenience and they cut arguments in half — surah 40's passages follow them and several do. Use
   them only as a last resort, and say so in `meta_json` when you do.

2. **A multi-āyah block IS the boundary evidence.** In `qr_tafsir_book_display_block`, a row where
   `ayah_to > ayah_no` is a commentator treating those āyāt as one unit. That is not a formatting
   artefact; it is the claim, already made, in the corpus. This is the primary signal — find it
   before reading a word of prose:

   ```sql
   SELECT source_slug, ayah_no, ayah_to FROM qr_tafsir_book_display_block
    WHERE surah_no = ? AND ayah_to > ayah_no
      AND source_slug IN ('razi','alusi','ibn_ashur','zamakhshari')
    ORDER BY ayah_no, source_slug;
   ```

3. **The four are the spine.** al-Rāzī, al-Ālūsī, Ibn ʿĀshūr, al-Zamakhsharī — because those four
   argue about *structure*: where the naẓm turns, what is istiʾnāf and what is taʿlīl, why this āyah
   follows that one. Ibn ʿĀshūr states passage boundaries outright more often than the others. The
   remaining four in the corpus (al-Ṭabarī, Ibn Kathīr, Ibn ʿAṭiyya, Abū Ḥayyān) are corroboration.

4. **Record who, in `meta_json.boundary_evidence`.** Every passage names the works that grouped
   those āyāt. A boundary nobody can argue with is a boundary nobody can check. Mark the strong
   agreements explicitly — where three of the four group identically, say so.

5. **Where they disagree, prefer the wider grouping and record the dissent.** Do not average and do
   not pick silently. Surah 30 passage 1 is 1–5 on al-Zamakhsharī's reading; Ibn ʿĀshūr would cut at
   2–3 and 4–5, and the row says so.

6. **Cover the sūra with no gap and no overlap.** `ayah_from` of each passage is the previous
   `ayah_to + 1`, the first is 1, the last is the sūra's final āyah. Verify it; the table's UNIQUE
   constraints will not catch a gap.

7. **Title and theme come from the tafsīr, not from the translation.** A title summarising an
   English rendering describes the translation. Title from what the commentators say the movement
   *is*.

## The shape of a row

```
id                   QR:SP:{surah}:{from}-{to}
public_unit_id       U:C:QURAN:{surah}:{from}-{to}
public_surah_unit_id U:C:QURAN:{surah}
label                Passage {n}
title_en / title_ar / subtitle
theme                a snake_case handle, not a sentence
summary_md           what the movement does, two sentences
start_ref / end_ref  {surah}:{from} / {surah}:{to}
meta_json            {"source":"tafsir-boundaries","order_index":n,
                      "boundary_evidence":"ibn_ashur 14-16 AND razi 14-16 AND zamakhshari 14-16"}
status               live
```

`status` defaults to `'draft'` and the reader shows nothing until it is `'live'`.

## Order of work

1. **Census the tafsīr first.** How many blocks, from which works, covering which āyāt. A sūra with
   thin coverage produces thin boundaries and you should say so rather than cutting confidently.
2. **Pull the multi-āyah groupings.** This is the evidence table.
3. **Read the agreements.** Where two or three works group identically, that boundary is settled.
   Where only one does, it is a proposal.
4. **Fill the gaps between settled boundaries** using the sense of the passage and the prose of the
   commentaries — and mark those passages as the weaker ones in `boundary_evidence`.
5. **Write, then verify contiguity** before declaring done.

## Worked example — surah 30

Migration `026_surah30_passages.sql`. 264 tafsīr blocks, 45 of them multi-āyah, cut into 12
passages covering 1–60 with no gap. Three boundaries had three works agreeing exactly (14–16,
30–32, 51–53). Read it before cutting a new sūra.

It also demonstrates why this matters beyond the reader: surah 30 held the best worldview content in
the corpus — the 30:2–6 contrast, 11 Qurʾānic positions against 10 secular — and **none of it could
be opened**, because the sūra had no passages. Building them made 21 positions reachable in one step.

## What NOT to do

- Do not cut on ayah count, or on "about ten āyāt each". The movements are not evenly sized: surah
  30's passages run from 2 āyāt to 10.
- Do not invent a `boundary_evidence` string. If the works did not group it, the field says which
  single work proposed it, or that it is a gap-fill.
- Do not set `status='live'` on a passage whose boundary you could not source, without saying so.
