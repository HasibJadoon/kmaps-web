#!/usr/bin/env node
// Build the km_content template-registry seed from the authored files in
// Templates/. The shaping — turning an authored document into the sections and
// blocks a screen draws — happens HERE and lands in display_json. No view ever
// reshapes a template; it renders the blocks it is handed.
//
//   node scripts/build-template-seed.mjs \
//     --out ../kmaps-database/database/seeds/cm_template_linguistics.sql

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const TEMPLATES = resolve(REPO, 'Templates');

const argv = process.argv.slice(2);
const outFlag = argv.indexOf('--out');
const OUT = outFlag >= 0
  ? resolve(process.cwd(), argv[outFlag + 1])
  : resolve(REPO, '../kmaps-database/database/seeds/cm_template_linguistics.sql');

const read = (p) => JSON.parse(readFileSync(resolve(TEMPLATES, p), 'utf8'));
const q = (v) => v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
const json = (v) => q(JSON.stringify(v));

// ── the manuscript shape ────────────────────────────────────────────────────
// The sample is set as a page out of the book itself: right-to-left, one
// centred column, the root in oxblood, gold rules between movements. Every
// decision about what a section looks like is made here and travels in
// display_json; the app draws the blocks it is handed.

const tail = (gt) => (typeof gt === 'string' ? gt.split(':').pop() : null);
const clean = (v) => (v === undefined || v === '' ? null : v);

/// The six abwāb of the bare triliteral, in the order the books recite them.
/// Reference data; it belongs in a registry table once one exists.
const SIX_ABWAB = [
  { key: 'bab_nasara', name_ar: 'بابُ نَصَرَ', wazn: 'فَعَلَ يَفْعُلُ' },
  { key: 'bab_daraba', name_ar: 'بابُ ضَرَبَ', wazn: 'فَعَلَ يَفْعِلُ' },
  { key: 'bab_fataha', name_ar: 'بابُ فَتَحَ', wazn: 'فَعَلَ يَفْعَلُ' },
  { key: 'bab_samia',  name_ar: 'بابُ سَمِعَ', wazn: 'فَعِلَ يَفْعَلُ' },
  { key: 'bab_karuma', name_ar: 'بابُ كَرُمَ', wazn: 'فَعُلَ يَفْعُلُ' },
  { key: 'bab_hasiba', name_ar: 'بابُ حَسِبَ', wazn: 'فَعِلَ يَفْعِلُ' },
];

const MAANA_LABEL = [
  ['التكثير', 'TAKTHĪR'], ['المشاركة', 'MUSHĀRAKA'], ['المطاوعة', 'MUṬĀWAʿA'],
  ['الطلب', 'ṬALAB'], ['الصيرورة', 'ṢAYRŪRA'], ['اتّخاذ', 'ITTIKHĀDH'],
  ['التعدية', 'TAʿDIYA'],
];

/// Harakāt make two spellings of the same word look different to a matcher.
const bare = (t) => (t ?? '').replace(/[\u064B-\u0652\u0670]/g, '');

const ARABIC_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
const arabicNumber = (n) =>
  String(n).split('').map((d) => ARABIC_DIGITS[Number(d)] ?? d).join('');

/// "AL-JAWHARĪ · D. 393 AH · ج١ ص٤٠٤–٤٠٥" — the one line that places the entry.
function citeLine(s) {
  const parts = [];
  if (s.author_en) parts.push(s.author_en.toUpperCase());
  if (s.death_ah) parts.push(`D. ${s.death_ah} AH`);
  const volume = s.volume ? `ج${arabicNumber(s.volume)}` : null;
  const pages = s.page_start
    ? `ص${arabicNumber(s.page_start)}${s.page_end && s.page_end !== s.page_start ? `–${arabicNumber(s.page_end)}` : ''}`
    : null;
  if (volume || pages) parts.push([volume, pages].filter(Boolean).join(' '));
  return parts.join(' · ') || null;
}

/// The latin tag that sits at the far end of a family's header rule.
function familyTag(entry, isMazeed) {
  if (!isMazeed) {
    if (entry.scope === 'frame_only') return 'ONE FRAME ONLY';
    return [tail(entry.transitivity), tail(entry.route)]
      .filter(Boolean)
      .map((t) => t.replace(/_/g, '-').toUpperCase())
      .join(' · ');
  }
  const valencies = new Set(
    (entry.frames ?? []).map((f) => f.transitivity ?? entry.transitivity).filter(Boolean));
  let sense;
  if (valencies.size > 1) sense = 'TWO VALENCIES';
  else if ((entry.transitivity ?? '').endsWith('intransitive')) sense = 'LĀZIM';
  else {
    const hit = MAANA_LABEL.find(([ar]) => bare(entry.maana_ar).includes(bare(ar)));
    sense = hit ? hit[1] : null;
  }
  return [entry.form, sense].filter(Boolean).join(' · ');
}

function frameRow(f) {
  return {
    type: 'frame',
    verb_ar: clean(f.frame_ar),
    meaning_ar: clean(f.meaning_ar),
    joined_ar: clean(f.joined_ar),
    vow: f.aorist_alt ? clean(f.aorist) : null,
    aside_ar: clean((f.synonyms_ar ?? []).join(' · ')),
    authority_ar: clean(f.authority_ar),
    ref: clean(f.qref),
    gloss_en: clean(f.meaning_en),
    block_no: f.block ?? null,
  };
}

function family(entry, isMazeed) {
  return {
    type: 'family',
    title_ar: isMazeed ? entry.wazn : entry.name_ar,
    pattern_ar: isMazeed ? clean(entry.masdar_pattern ?? entry.masdar_attested) : clean(entry.wazn),
    tag: clean(familyTag(entry, isMazeed)),
    core_ar: clean(entry.core?.ar),
    core_en: clean(entry.core?.en),
    frames: (entry.frames ?? []).map(frameRow),
  };
}

function shapeSample(d) {
  const s = d.scope ?? {};
  const h = d.header ?? {};
  const sarf = d.sarf ?? {};
  const sections = [];

  // ── الصَّرْف ──────────────────────────────────────────────────────────────
  const sarfBlocks = [];
  const w = sarf.headword_line;
  if (w) {
    sarfBlocks.push({
      type: 'headline',
      segments: [
        w.bab_key && SIX_ABWAB.find((b) => b.key === w.bab_key)
          ? { text: SIX_ABWAB.find((b) => b.key === w.bab_key).name_ar, tone: 'bab' } : null,
        { text: '—', tone: 'dash' },
        w.past ? { text: w.past, tone: 'ink' } : null,
        w.aorist ? { text: w.aorist, tone: 'aorist' } : null,
        (w.masadir ?? []).length ? { text: w.masadir.join('، '), tone: 'masdar' } : null,
        [w.active_participle ? `فهو ${w.active_participle}` : null,
         w.passive_participle ? `والمفعولُ ${w.passive_participle}` : null]
          .filter(Boolean).length
          ? { text: [w.active_participle ? `فهو ${w.active_participle}` : null,
                     w.passive_participle ? `والمفعولُ ${w.passive_participle}` : null]
                     .filter(Boolean).join('، '), tone: 'part' }
          : null,
      ].filter(Boolean),
      note_ar: clean(w.note_ar),
    });
  }

  const r = sarf.root_shape;
  if (r) {
    sarfBlocks.push({
      type: 'shape',
      ar: clean(r.bab_constraint_ar),
      lead_ar: clean(r.type_ar),
      cite: clean(r.bab_constraint_src),
    });
  }

  const attested = new Map((sarf.mujarrad ?? []).map((b) => [b.bab_key, b]));
  sarfBlocks.push({
    type: 'babgrid',
    cells: SIX_ABWAB.map((b) => {
      const hit = attested.get(b.key);
      return {
        name_ar: b.name_ar, wazn: b.wazn,
        state: !hit ? 'off' : hit.scope === 'frame_only' ? 'alt' : 'on',
      };
    }),
  });

  for (const b of sarf.mujarrad ?? []) sarfBlocks.push(family(b, false));
  sections.push({ key: 'sarf', title_ar: 'الصَّرْف', title_en: 'MORPHOLOGY', blocks: sarfBlocks });

  if ((sarf.mazeed ?? []).length) {
    sections.push({
      key: 'mazeed', title_ar: 'الثلاثيُّ المَزيد', title_en: 'AUGMENTED',
      blocks: sarf.mazeed.map((f) => family(f, true)),
    });
  }

  if ((sarf.derived_nouns ?? []).length) {
    sections.push({
      key: 'derived', title_ar: 'المُشتَقّات', title_en: 'DERIVED',
      blocks: [{
        type: 'chips',
        chips: sarf.derived_nouns.map((n) => ({
          ar: n.ar,
          sub: clean([
            (n.plural ?? []).length ? `ج ${n.plural.join(' و')}` : null,
            clean(n.gloss_ar),
          ].filter(Boolean).join(' · ')),
        })),
      }],
    });
  }

  const internal = (sarf.internal_notes ?? []).map((n) => ({
    type: 'note',
    label_ar: { conflict: 'تعارُض', equivalence: 'تسوية', valency: 'تعدٍّ',
                orth: 'لغتان', variant: 'رواية', critique: 'نَقْد' }[n.kind] ?? n.kind,
    ar: clean(n.ar), en: clean(n.en),
  }));
  const c = sarf.coverage;
  if (c) {
    internal.push({
      type: 'coverage',
      label_ar: 'ما ضَبَطَهُ وما لم يَضبِط',
      ar: clean([
        (c.aorist_attested_for ?? []).length
          ? `ضَبَطَ المضارعَ في: ${c.aorist_attested_for.join(' · ')}` : null,
        (c.masdar_attested_for ?? []).length
          ? `ونَصَّ على المصدرِ في: ${c.masdar_attested_for.join(' · ')}` : null,
        (c.inferred ?? []).length
          ? `وما عداهُ (${c.inferred.join(' · ')}) مأخوذٌ من الوزنِ لا من نصِّه.` : null,
      ].filter(Boolean).join('، ')),
      en: clean(c.note_en),
    });
  }
  if (internal.length) {
    sections.push({
      key: 'internal', title_ar: 'ملاحظاتٌ داخلَ الكتاب', title_en: 'INTERNAL',
      blocks: internal,
    });
  }

  if ((d.range ?? []).length) {
    sections.push({
      key: 'range', title_ar: 'مَدى المعنى', title_en: 'RANGE',
      note: d.range_order ? `order · ${d.range_order}` : null,
      blocks: d.range.map((x, i) => ({
        type: 'entry', index: arabicNumber(i + 1),
        title_ar: clean(x.title_ar), detail_ar: clean(x.detail_ar),
        detail_en: clean(x.detail_en), block_no: x.block ?? null,
      })),
    });
  }

  if ((d.shawahid ?? []).length) {
    sections.push({
      key: 'shawahid', title_ar: 'الشواهد', title_en: 'WITNESSES',
      blocks: d.shawahid.map((x) => ({
        type: 'witness', kind: x.kind ?? 'prose',
        text_ar: x.text_ar, highlight_ar: clean(x.highlight_ar),
        attribution_ar: clean(x.attribution_ar), gloss_en: clean(x.gloss_en),
        ref: clean(x.qref), block_no: x.block ?? null,
      })),
    });
  }

  const m = d.meaning;
  return {
    kind: 'manuscript',
    hero: {
      book_ar: clean(s.book_ar),
      cite: citeLine(s),
      root_ar: clean(s.root_ar),
      author_ar: clean(s.author_ar),
      quote_ar: clean(h.opening_quote_ar),
      thesis: h.thesis ?? null,
      stats: h.stats ?? [],
      body: h.body ?? null,
      core: m?.core ?? null,
    },
    sections,
  };
}

// The template tab keeps the plainer field-tree blocks.
const prose = (o) => ({ type: 'prose', ...o });
const field = (o) => ({ type: 'field', ...o });

// ── the template shaper: the unfilled contract, as a field tree ─────────────
const SECTION_TITLES = {
  scope:       ['Scope',      'النِّطاق'],
  header:      ['Header',     'الصَّدْر'],
  sarf:        ['Ṣarf',       'الصَّرْف'],
  meaning:     ['Meaning',    'المعنى'],
  range:       ['Range',      'المدى'],
  range_order: ['Range order', null],
  shawahid:    ['Witnesses',  'الشواهد'],
};

function typeLabel(v) {
  if (Array.isArray(v)) return 'array';
  if (v === null) return 'null';
  if (typeof v === 'object') return 'object';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'string' && v.includes('|')) return 'enum';
  return 'string';
}

function walk(obj, path, required, out, depth) {
  if (depth > 3) return;
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    const here = path ? `${path}.${k}` : k;
    const noteText = obj[`_${k}`];
    const example = typeof v === 'string' && v !== '…' ? v
      : Array.isArray(v) && typeof v[0] === 'string' && v[0] !== '…' ? v.join(' | ')
      : null;
    out.push(field({
      path: here,
      type_label: typeLabel(v),
      required: required.includes(k),
      note: typeof noteText === 'string' ? noteText : null,
      example,
    }));
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      walk(v, here, v._required ?? [], out, depth + 1);
    } else if (Array.isArray(v) && v[0] && typeof v[0] === 'object') {
      walk(v[0], `${here}[]`, v[0]._required ?? [], out, depth + 1);
    }
  }
}

function shapeTemplate(t) {
  const sections = [];
  for (const [k, v] of Object.entries(t)) {
    if (k.startsWith('_')) continue;
    const [en, ar] = SECTION_TITLES[k] ?? [k, null];
    const blocks = [];
    const sectionNote = typeof v === 'object' && v && !Array.isArray(v) ? v._note : null;
    if (typeof sectionNote === 'string') blocks.push(prose({ en: sectionNote }));
    if (v && typeof v === 'object') {
      walk(Array.isArray(v) ? (v[0] ?? {}) : v, k + (Array.isArray(v) ? '[]' : ''),
           (Array.isArray(v) ? v[0]?._required : v._required) ?? [], blocks, 1);
    } else {
      blocks.push(field({ path: k, type_label: typeLabel(v), required: false, note: t[`_${k}`] ?? null, example: typeof v === 'string' && v !== '…' ? v : null }));
    }
    sections.push({ key: k, title_en: en, title_ar: ar, blocks });
  }
  return {
    hero: {
      eyebrow: t._template ?? null,
      title_en: 'Lexicon source entry',
      title_ar: 'مدخلُ معجمٍ بحسبِ الكتاب',
      subtitle: t._about ?? null,
      meta: [
        { label: 'TEMPLATE', value: t._template ?? null },
        { label: 'VERSION', value: t._version != null ? `v${t._version}` : null },
      ].filter((m) => m.value),
      stats: [],
    },
    sections,
  };
}

// ── emit ────────────────────────────────────────────────────────────────────
const tpl = read('Linguistics/lexicon-source-entry.template.json');
const smp = read('Linguistics/samples/kataba.jawhari_sihah.json');

const TEMPLATE_KEY = 'tpl_ling_lexicon_source_entry';
const SAMPLE_ID = 'tsm_ling_lexicon_kataba_sihah';

const sql = `-- GENERATED by kmaps-web/scripts/build-template-seed.mjs — do not edit by hand.
-- Source: kmaps-web/Templates/Linguistics/
-- Apply against km_content (DB_CM) after migration 002_cm_template.sql.

DELETE FROM cm_template_sample WHERE template_key = ${q(TEMPLATE_KEY)};
DELETE FROM cm_template        WHERE template_key = ${q(TEMPLATE_KEY)};
DELETE FROM cm_template_category WHERE category_key = 'linguistics';

INSERT INTO cm_template_category
  (category_key, label_en, label_ar, glyph, blurb, sort_order)
VALUES
  ('linguistics', 'Linguistics', 'اللِّسانيّات', '◈',
   'How a root is written up from one classical book', 10);

INSERT INTO cm_template
  (template_key, category_key, title_en, title_ar, subtitle, summary, glyph,
   version, status, spec_json, display_json, sort_order)
VALUES
  (${q(TEMPLATE_KEY)}, 'linguistics',
   'Lexicon source entry', 'مدخلُ معجمٍ بحسبِ الكتاب',
   'One root, one dictionary, verbatim',
   ${q(tpl._about ?? null)},
   '▤', ${tpl._version ?? 1}, 'active',
   ${json(tpl)},
   ${json(shapeTemplate(tpl))},
   10);

INSERT INTO cm_template_sample
  (sample_id, template_key, title_en, title_ar, subtitle, source_slug,
   payload_json, display_json, sort_order)
VALUES
  (${q(SAMPLE_ID)}, ${q(TEMPLATE_KEY)},
   ${q('k-t-b in al-Ṣiḥāḥ')}, ${q(smp.scope.root_ar)},
   ${q(smp.scope.book_ar)}, ${q(smp.scope.source_slug)},
   ${json(smp)},
   ${json(shapeSample(smp))},
   10);
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, sql, 'utf8');
console.error(`wrote ${OUT} (${sql.length} bytes)`);
