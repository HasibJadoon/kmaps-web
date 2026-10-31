import { query, queryOne } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { labels, byKey, type Label } from '../lib/labels';
import { softFail } from '../../../shared/src/soft-fail';

// ── Study steps built from the sources, for a passage no one has authored ─────
// A passage the atlas cut from the books (qr_surah_passage_proposal), or a curated
// passage whose authored layer has a hole, still gets its passage_structure and
// scholarship steps — built here, from rows, each line naming the book it is from:
//
//   passage_structure   how the four tafsīrs that set passage boundaries (al-Rāzī,
//                       al-Zamakhsharī, al-Ālūsī, Ibn ʿĀshūr: qr_study_label
//                       'passage_book', tier 1) divide the range, the opening's
//                       basis and its cue in the mufassir's words, Ibn ʿĀshūr's
//                       turns, Maududi's introduction where it names these āyāt,
//                       and the āyāt in the translations 'passage_translation' lists.
//   scholarship         each tafsīr's own discussion of the range, opening verbatim,
//                       one reading per mufassir by death year; an English tafsīr
//                       (qr_tafsir_en) where one covers the range.
//
// Every section and reading is marked source: 'derived'. Nothing here is a
// synthesis: no line is written that a row does not hold.

export interface StudyPassage {
  id: string;
  surah_id: number;
  passage_no: number;
  ayah_from: number;
  ayah_to: number;
  title: string | null;
  basis?: unknown;
}

type Rec = Record<string, unknown>;

const envOf = (db: D1Database) => ({ DB_QR: db }) as unknown as QuranEnv;

/// "1 2 3-4 5" → [[1,1],[2,2],[3,4],[5,5]]
function groupsOf(division: string | null | undefined): Array<[number, number]> {
  if (!division) return [];
  const out: Array<[number, number]> = [];
  for (const tok of division.trim().split(/\s+/)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(tok);
    if (!m) continue;
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    if (a > 0 && b >= a) out.push([a, b]);
  }
  return out;
}

const span = (a: number, b: number) => (a === b ? `${a}` : `${a}–${b}`);
const ayahWord = (a: number, b: number) => (a === b ? `āyah ${a}` : `āyāt ${a}–${b}`);

/// The opening of a text up to n characters, cut at a word, marked when cut.
function opening(text: string | null | undefined, n: number): { text: string; full: boolean } {
  const t = (text ?? '').trim();
  if (t.length <= n) return { text: t, full: true };
  const cut = t.lastIndexOf(' ', n);
  return { text: `${t.slice(0, cut > n * 0.6 ? cut : n).trim()} …`, full: false };
}

interface BookName { slug: string; title: string | null; titleAr: string | null; author: string | null; authorAr: string | null; died: number | null }

/// Each book's names from its own display registry (tafsīr, then iʿrāb).
async function books(db: D1Database, slugs: string[]): Promise<Map<string, BookName>> {
  const out = new Map<string, BookName>();
  if (!slugs.length) return out;
  const rows = await query<{ slug: string; title: string | null; title_ar: string | null; author: string | null;
                             author_ar: string | null; died: number | null }>(db,
    `SELECT source_slug AS slug, book_title_en AS title, book_title_ar AS title_ar,
            author_name_en AS author, author_name_ar AS author_ar, death_year_hijri AS died
       FROM qr_tafsir_book_display_source WHERE source_slug IN (SELECT value FROM json_each(?))
     UNION ALL
     SELECT source_slug, book_title_en, book_title_ar, author_name_en, author_name_ar, NULL
       FROM qr_irab_book_display_source WHERE source_slug IN (SELECT value FROM json_each(?))`,
    [JSON.stringify(slugs), JSON.stringify(slugs)]).catch(softFail([]));
  for (const r of rows) {
    if (!out.has(r.slug)) {
      out.set(r.slug, { slug: r.slug, title: r.title, titleAr: r.title_ar, author: r.author, authorAr: r.author_ar, died: r.died });
    }
  }
  return out;
}

const bookLine = (b: BookName | undefined, slug: string) =>
  b ? [b.author, b.title].filter(Boolean).join(' · ') || slug : slug;

/// The derived section, shaped as qr_passage_section rows are projected.
function section(p: StudyPassage, L: Map<string, Label>, key: string, data: Rec) {
  const l = L.get(key);
  const extra = (l?.extra ?? {}) as Rec;
  return {
    id: `derived:${p.surah_id}:${p.ayah_from}-${p.ayah_to}:${key}`,
    key,
    title: l?.detail ?? l?.label ?? key,
    badge: l?.label ?? key,
    tone: typeof extra['tone'] === 'string' ? (extra['tone'] as string) : 'secondary',
    renderer: typeof extra['renderer'] === 'string' ? (extra['renderer'] as string) : 'key_value',
    source: 'derived',
    data,
  };
}

interface Proposal { ayah_from: number; ayah_to: number; basis_json: string | null }

/// The proposal whose opening is this passage's opening — the derived passage's own
/// basis when the resolver carried it, else the proposal that opens at the same āyah.
async function openingBasis(db: D1Database, p: StudyPassage): Promise<Rec | null> {
  const own = p.basis && typeof p.basis === 'object' ? (p.basis as Rec) : null;
  if (own && own['opening']) return own['opening'] as Rec;
  const row = await queryOne<Proposal>(db,
    `SELECT ayah_from, ayah_to, basis_json FROM qr_surah_passage_proposal WHERE surah = ? AND ayah_from = ? LIMIT 1`,
    [p.surah_id, p.ayah_from]).catch(softFail(null));
  if (!row?.basis_json) return null;
  try { return (JSON.parse(row.basis_json) as Rec)['opening'] as Rec ?? null; } catch { return null; }
}

/// passage_structure's source-built lenses for a passage.
export async function derivedStructureSections(db: D1Database, p: StudyPassage) {
  const env = envOf(db);
  const [L, layers, opened, tr] = await Promise.all([
    labels(env),
    query<{ layer: string; payload_json: string }>(db,
      `SELECT layer, payload_json FROM qr_surah_layer WHERE surah = ? AND layer IN ('structure', 'themes')`,
      [p.surah_id]).catch(softFail([])),
    openingBasis(db, p),
    query<{ ayah: number; code: string; name: string; text: string }>(db,
      `SELECT t.ayah, ts.source_code AS code, ts.translator_name AS name, t.translation_text AS text
         FROM qr_translation t JOIN qr_translation_source ts ON ts.id = t.source_id
        WHERE t.surah = ? AND t.ayah BETWEEN ? AND ?
          AND ts.source_code IN (SELECT key FROM qr_study_label WHERE scope = 'passage_translation')`,
      [p.surah_id, p.ayah_from, p.ayah_to]).catch(softFail([])),
  ]);
  const lens = byKey(L.passage_lens);
  const tiers = byKey(L.passage_book_tier);
  const bookOrder = L.passage_book ?? [];
  const markers = byKey(L.cue_marker);
  const rules = byKey(L.passage_basis);
  const payload = (layer: string): Rec => {
    const row = layers.find((x) => x.layer === layer);
    try { return row ? (JSON.parse(row.payload_json) as Rec) : {}; } catch { return {}; }
  };
  const structure = payload('structure');
  const themes = payload('themes');
  const markerLabel = (m: unknown) => {
    const k = typeof m === 'string' ? m : '';
    return markers.get(k)?.label ?? k;
  };

  const opening = opened ?? {};
  const named = [
    ...bookOrder.map((b) => b.key),
    ...((opening['agree'] as string[] | undefined) ?? []),
    ...((opening['corroborate'] as string[] | undefined) ?? []),
    ...(((opening['dissent'] as string[] | undefined) ?? []).map((x) => x.split(' ')[0])),
    ...(((opening['cue'] as Rec | undefined)?.['source'] as string | undefined) ? [(opening['cue'] as Rec)['source'] as string] : []),
    'ibn_ashur',
  ];
  const B = await books(db, [...new Set(named)]);
  const out: Rec[] = [];

  // 1. How each book divides the range — the four boundary books first, then the rest.
  const division = Array.isArray(structure['division']) ? (structure['division'] as Rec[]) : [];
  const bySlug = new Map(division.map((d) => [String(d['source']), String(d['division'] ?? '')]));
  const levels: Rec[] = [];
  for (const b of bookOrder) {
    const groups = groupsOf(bySlug.get(b.key)).filter(([a, z]) => z >= p.ayah_from && a <= p.ayah_to);
    if (!groups.length) continue;
    const tier = tiers.get(String(b.min ?? ''))?.label ?? null;
    const first = groups[0], last = groups[groups.length - 1];
    const notes: string[] = [];
    if (first[0] < p.ayah_from) notes.push(`Its group runs in from āyah ${first[0]}, across the opening.`);
    if (last[1] > p.ayah_to) notes.push(`Its last group runs on to āyah ${last[1]}, past the close.`);
    if (!notes.length) {
      notes.push(groups.length === 1 ? 'Treats the passage as one group.' : `${groups.length} groups inside the passage.`);
    }
    const name = B.get(b.key);
    levels.push({
      type: b.min === 1 ? 'meta' : 'human',
      label: [tier, bookLine(name, b.key)].filter(Boolean).join(' · '),
      primary: groups.map(([a, z]) => span(Math.max(a, p.ayah_from), Math.min(z, p.ayah_to))).join(' · '),
      sub: notes.join(' '),
      arabic: name?.titleAr ?? undefined,
      source: b.key,
      tier: b.min ?? null,
    });
  }
  if (levels.length) out.push(section(p, lens, 'division', { levels, source: 'qr_surah_layer.structure' }));

  // 2. Where the passage opens, on whose authority, and the cue in his words.
  if (opened) {
    const rule = rules.get(String(opening['rule'] ?? ''));
    const names = (xs: unknown) => (Array.isArray(xs) ? xs : [])
      .map((x) => String(x))
      .map((x) => {
        const [slug, groups] = x.split(' ');
        const b = B.get(slug);
        return `${b?.author ?? slug}${groups ? ` (groups ${groups.replace('-', '–')})` : ''}`;
      });
    const agree = names(opening['agree']), corr = names(opening['corroborate']), dis = names(opening['dissent']);
    const sentence = (t: string | null | undefined) => (t ? (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`) : null);
    const lines = [
      sentence(rule?.detail),
      agree.length ? `Opening here: ${agree.join(', ')}.` : null,
      corr.length ? `Corroborated by ${corr.join(', ')}.` : null,
      dis.length ? `Running across it: ${dis.join(', ')}.` : null,
    ].filter(Boolean);
    const rows: Rec[] = [{
      letter: String(opening['ayah'] ?? p.ayah_from),
      h: `Opens at āyah ${opening['ayah'] ?? p.ayah_from}${rule ? `: ${rule.label}` : ''}`,
      ...(lines.length ? { p: lines.join(' ') } : {}),
    }];
    const cue = opening['cue'] as Rec | undefined;
    if (cue && typeof cue['text'] === 'string') {
      const b = B.get(String(cue['source']));
      rows.push({
        type: 'direction',
        label: `${b?.author ?? cue['source']} · ${markerLabel(cue['marker'])}`,
        arabic: cue['text'],
        eng: b?.title ?? undefined,
        source: cue['source'],
      });
    }
    out.push(section(p, lens, 'opening', { rows, rule: opening['rule'] ?? null, source: 'qr_surah_passage_proposal.basis_json' }));
  }

  // 3. Where Ibn ʿĀshūr says the discourse turns, inside the range.
  const turns = (Array.isArray(themes['turns']) ? (themes['turns'] as Rec[]) : [])
    .map((t) => ({ t, ayah: Number(String(t['ref'] ?? '').split(':')[1]) }))
    .filter(({ ayah }) => ayah >= p.ayah_from && ayah <= p.ayah_to)
    // the opening's own cue is already the opening lens
    .filter(({ t }) => t['text'] !== ((opening['cue'] as Rec | undefined)?.['text'] ?? null));
  if (turns.length) {
    out.push(section(p, lens, 'turns', {
      rows: turns.map(({ t, ayah }) => {
        const b = B.get(String(t['source'] ?? 'ibn_ashur'));
        return {
          type: 'direction',
          label: `Āyah ${ayah} · ${markerLabel(t['marker'])}`,
          arabic: t['text'],
          eng: bookLine(b, String(t['source'] ?? '')),
          source: t['source'] ?? null,
        };
      }),
      source: 'qr_surah_layer.themes',
    }));
  }

  // 4. Maududi's introduction, where a sentence of it names these āyāt.
  const maududi = Array.isArray(themes['maududi']) ? (themes['maududi'] as Rec[]) : [];
  const mRows: Rec[] = [];
  const verseRef = /\b(?:vv?|verses?|ayat|ayahs?)\.?\s*(\d+)(?:\s*[-–]\s*(\d+))?/gi;
  for (const m of maududi) {
    const text = typeof m['text'] === 'string' ? m['text'] : '';
    // a sentence ends at a stop followed by a capital — "vv. 6-11" does not end one
    for (const sentence of text.split(/(?<=[.!?])\s+(?=["“A-Z])/)) {
      let hit = false;
      for (const r of sentence.matchAll(verseRef)) {
        const a = Number(r[1]), z = r[2] ? Number(r[2]) : a;
        if (z >= p.ayah_from && a <= p.ayah_to) hit = true;
      }
      if (hit) mRows.push({ label: String(m['heading'] ?? ''), p: sentence.trim() });
    }
  }
  if (mRows.length) out.push(section(p, lens, 'maududi', { rows: mRows, source: 'qr_surah_layer.themes.maududi' }));

  // 5. The āyāt in the translations qr_study_label names, in its order.
  if (tr.length) {
    const rank = new Map((L.passage_translation ?? []).map((l, i) => [l.key, i]));
    const rows = [...tr]
      .sort((a, b) => a.ayah - b.ayah || (rank.get(a.code) ?? 99) - (rank.get(b.code) ?? 99))
      .map((t) => ({ letter: String(t.ayah), h: (L.passage_translation ?? []).find((l) => l.key === t.code)?.label ?? t.name, p: t.text, source: t.code }));
    out.push(section(p, lens, 'translations', { rows, source: 'qr_translation' }));
  }
  return out;
}

/// scholarship, built from the tafsīr entries covering the range.
export async function derivedScholarship(db: D1Database, p: StudyPassage) {
  const env = envOf(db);
  const [L, entries, english] = await Promise.all([
    labels(env),
    query<{ id: string; ayah_from: number; ayah_to: number; text: string | null; len: number;
            slug: string; title_ar: string | null; title_en: string | null; author_ar: string | null;
            author_en: string | null; died: number | null }>(db,
      `SELECT t.id, t.ayah_from, t.ayah_to, substr(t.content_ar, 1, 900) AS text, length(t.content_ar) AS len,
              d.source_slug AS slug, d.book_title_ar AS title_ar, d.book_title_en AS title_en,
              d.author_name_ar AS author_ar, d.author_name_en AS author_en,
              COALESCE(d.death_year_hijri, sp.death_year_hijri) AS died
         FROM qr_tafsir_entry t
         JOIN qr_tafsir_book_display_source d ON d.work_id = t.work_id AND d.is_visible = 1
         LEFT JOIN qr_scholar_profile sp ON sp.id = t.scholar_id
        WHERE t.surah = ? AND t.ayah_from <= ? AND t.ayah_to >= ?
          AND t.content_ar IS NOT NULL AND TRIM(t.content_ar) <> ''
        ORDER BY t.ayah_from, t.ayah_to`,
      [p.surah_id, p.ayah_to, p.ayah_from]).catch(softFail([])),
    query<{ code: string; name: string; ayah_from: number; ayah_to: number; text: string; len: number }>(db,
      `SELECT source_code AS code, source_name AS name, ayah_from, ayah_to,
              substr(text_plain, 1, 1400) AS text, length(text_plain) AS len
         FROM qr_tafsir_en
        WHERE surah = ? AND ayah_from <= ? AND ayah_to >= ?
        ORDER BY ayah_from`,
      [p.surah_id, p.ayah_to, p.ayah_from]).catch(softFail([])),
  ]);
  if (!entries.length && !english.length) return null;

  // Each excerpt as long as the range allows: the whole step stays near 120k characters.
  const per = Math.max(260, Math.min(900, Math.floor(110_000 / Math.max(1, entries.length + english.length))));
  const enMap = byKey(L.tafsir_en);
  const base = `derived:${p.surah_id}:${p.ayah_from}-${p.ayah_to}`;

  interface Reading { slug: string; authorEn: string | null; authorAr: string | null; died: number | null;
                      bookEn: string | null; bookAr: string | null; sections: Rec[]; summaryEn: string | null;
                      openingAr: string | null; englishOnly: boolean }
  const readings = new Map<string, Reading>();
  const readingOf = (slug: string, init: Omit<Reading, 'sections' | 'summaryEn' | 'openingAr'>) => {
    let r = readings.get(slug);
    if (!r) { r = { ...init, sections: [], summaryEn: null, openingAr: null }; readings.set(slug, r); }
    return r;
  };

  for (const e of entries) {
    const r = readingOf(e.slug, { slug: e.slug, authorEn: e.author_en, authorAr: e.author_ar, died: e.died,
                                  bookEn: e.title_en, bookAr: e.title_ar, englishOnly: false });
    const o = opening(e.text, per);
    if (!r.openingAr) r.openingAr = opening(e.text, 320).text;
    r.sections.push({
      id: `${base}:${e.slug}:${e.ayah_from}-${e.ayah_to}`,
      ord: r.sections.length + 1,
      headingEn: `${e.title_en ?? e.slug} on ${ayahWord(e.ayah_from, e.ayah_to)}`,
      headingAr: e.title_ar,
      ayah: `${p.surah_id}:${span(e.ayah_from, e.ayah_to)}`,
      kind: 'tafsir',
      verdict: 'source',
      bodyEn: null,
      bodyAr: o.text,
      quoteAr: null,
      full: o.full && e.len <= per,
      source: 'qr_tafsir_entry',
      ref: e.id,
    });
  }

  for (const t of english) {
    const l = enMap.get(t.code);
    const slug = typeof l?.extra?.['slug'] === 'string' ? (l.extra['slug'] as string) : t.code;
    const r = readingOf(slug, { slug, authorEn: l?.detail ?? t.name, authorAr: l?.labelAr ?? null, died: null,
                                bookEn: l?.label ?? t.name, bookAr: null, englishOnly: true });
    const o = opening(t.text, Math.max(per, 700));
    if (!r.summaryEn) r.summaryEn = o.text;
    r.sections.push({
      id: `${base}:${t.code}:${t.ayah_from}-${t.ayah_to}`,
      ord: r.sections.length + 1,
      headingEn: `${l?.label ?? t.name}, in English, on ${ayahWord(t.ayah_from, t.ayah_to)}`,
      headingAr: null,
      ayah: `${p.surah_id}:${span(t.ayah_from, t.ayah_to)}`,
      kind: 'tafsir_en',
      verdict: 'source',
      bodyEn: o.text,
      bodyAr: null,
      quoteAr: null,
      full: o.full && t.len <= Math.max(per, 700),
      source: 'qr_tafsir_en',
      ref: `${t.code}:${p.surah_id}:${t.ayah_from}`,
    });
  }

  const list = [...readings.values()].sort((a, b) =>
    Number(a.englishOnly) - Number(b.englishOnly)
    || (a.died ?? 99999) - (b.died ?? 99999)
    || a.slug.localeCompare(b.slug));

  return {
    step: 'scholarship',
    source: 'derived',
    passage_id: p.id,
    surah: p.surah_id,
    ayah_from: p.ayah_from,
    ayah_to: p.ayah_to,
    readings: list.map((r) => ({
      id: `${base}:${r.slug}`,
      slug: r.slug,
      authorEn: r.authorEn,
      authorAr: r.authorAr,
      died: r.died,
      bookEn: r.bookEn,
      bookAr: r.bookAr,
      stance: null,
      thesisEn: null,
      thesisAr: null,
      summaryEn: r.summaryEn,
      summaryAr: null,
      openingAr: r.openingAr,
      sectionCount: r.sections.length,
      keyNotes: null,
      derivedLineEn: null,
      axes: [],
      source: 'derived',
      sections: r.sections,
    })),
  };
}
