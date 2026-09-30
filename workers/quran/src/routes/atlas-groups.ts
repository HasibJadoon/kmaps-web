import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { labels, byKey, card, type Label } from '../lib/labels';

// ── The surahs in every grouping the data holds ──────────────────────────────────────────────
// qr_nazm_group / qr_nazm_group_member hold the groups; the schemes that gather them are labels
// (qr_study_label scope 'group', qr_060): Iṣlāḥī's seven, the four transmitted divisions, the named
// sets, the opening letters, Farrin's central group, Makkī / Madanī, and the order of revelation
// (Ibn ʿĀshūr's count, qr_surah_revelation_rank). A surah can sit in several groups of one scheme
// (the opening letters overlap), and each group lists it; a surah a scheme leaves out is listed
// once under 'outside'.
//
//   GET /qr/atlas/surahs?group=<scheme>   the scheme's groups with their surahs, basis and source
//   GET /qr/atlas/group/:id               one group (slug or QR:NZ:… id): summary, members with their
//                                         role, opening and epithet and a one-line theme from the
//                                         themes layer (cited), shared openings, characteristic
//                                         roots, and its ring where one is recorded
//
// Rings (a group's or a surah's parts paired around a centre) are read from what is recorded —
// qr_nazm_reading/_link (a group), qr_surah_symmetry_pattern (a surah), the naẓm layer's ring
// positions and the chiasm sections of qr_passage_section (a surah's passages, a passage) — and
// served as a mirrored sequence (A … centre … A′) with each side's source. Nothing is paired that
// the data does not pair. surahRings() feeds the structure layer; allRings() the drills.

type GroupRow = {
  id: string; slug: string; name_ar: string | null; name_en: string; name_translit: string | null; surah_from: number; surah_to: number;
  member_count: number; contiguous: number; group_basis: string; revelation_type: string | null; epithet_ar: string | null;
  epithet_attrib: string | null; summary_md: string; note_md: string | null; source_slug: string | null; evidence_ref: string | null;
  confidence: string;
};
type MemberRow = {
  group_id: string; surah: number; member_index: number; member_role: string | null; opening_ayah: number | null; opening_form: string | null;
  opening_text_ar: string | null; epithet_pair_ar: string | null; epithet_case: string | null; is_anomaly: number; anomaly_note: string | null;
  note_md: string | null;
};
type SurahRow = { id: number; name_ar: string; name_en: string; translit: string | null; ayahs: number; revelation: string };

export type Scheme = { key: string; label: Label; slugs: string[] | null; sourceSlug: string | null; order: 'mushaf' | 'revelation';
                       overlap: boolean; ring: string | null };

const GROUP_COLS = `id, slug, name_ar, name_en, name_translit, surah_from, surah_to, member_count, contiguous, group_basis, revelation_type,
                    epithet_ar, epithet_attrib, summary_md, note_md, source_slug, evidence_ref, confidence`;
const MEMBER_COLS = `group_id, surah, member_index, member_role, opening_ayah, opening_form, opening_text_ar, epithet_pair_ar, epithet_case,
                     is_anomaly, anomaly_note, note_md`;

/// Every scheme the labels name, with the groups it gathers.
export function schemesOf(L: Record<string, Label[]>): Scheme[] {
  return (L.group ?? []).map((l) => ({
    key: l.key, label: l,
    slugs: Array.isArray(l.extra?.groups) ? (l.extra!.groups as string[]) : null,
    sourceSlug: (l.extra?.source_slug as string | undefined) ?? null,
    order: l.extra?.order === 'revelation' ? 'revelation' : 'mushaf',
    overlap: !!l.extra?.overlap,
    ring: (l.extra?.ring as string | undefined) ?? null,
  }));
}

/// A scheme's groups, in the order the scheme lists them (else by where they start).
export async function groupsOf(env: QuranEnv, sc: Scheme): Promise<GroupRow[]> {
  if (sc.slugs?.length) {
    const rows = await query<GroupRow>(env.DB_QR, `SELECT ${GROUP_COLS} FROM qr_nazm_group WHERE slug IN (${sc.slugs.map(() => '?').join(',')})`, sc.slugs);
    return sc.slugs.map((s) => rows.find((r) => r.slug === s)).filter((r): r is GroupRow => !!r);
  }
  return query<GroupRow>(env.DB_QR, `SELECT ${GROUP_COLS} FROM qr_nazm_group WHERE source_slug = ? ORDER BY surah_from`, [sc.sourceSlug ?? '']);
}

/// Arabic letters only — for comparing openings and epithets across spellings.
export const fold = (w: string | null | undefined) => (w ?? '')
  .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^ء-ي ]/g, '').replace(/\s+/g, ' ').trim();

/// The first sentence of a passage (at least five words, at most `max`), for a one-line theme.
export function firstSentence(t: string | null | undefined, max = 40): string | null {
  if (!t) return null;
  const parts = t.replace(/\s+/g, ' ').split(/(?<=[.!?؟])\s+/);
  const s = parts.find((p) => p.split(' ').length >= 5) ?? parts[0];
  const w = s.trim().split(' ');
  return w.length > max ? `${w.slice(0, max).join(' ')} …` : s.trim();
}

const clipWords = (t: string, n: number) => { const w = t.split(/\s+/); return w.length > n ? `${w.slice(0, n).join(' ')} …` : t; };

/// A surah's opening as the muṣḥaf has it: āyah 1, and āyah 2 after it where āyah 1 is letters alone.
export async function openingsOf(env: QuranEnv, surahs: number[]): Promise<Map<number, { ayah: number; text: string; first: string }>> {
  if (!surahs.length) return new Map();
  const rows = await query<{ surah: number; ayah: number; text: string }>(env.DB_QR,
    `SELECT surah, ayah, text_uthmani AS text FROM qr_ayah WHERE ayah IN (1, 2) AND surah IN (SELECT value FROM json_each(?)) ORDER BY surah, ayah`, [JSON.stringify(surahs)]);
  const by = new Map<number, string[]>();
  for (const r of rows) by.set(r.surah, [...(by.get(r.surah) ?? []), r.text]);
  const out = new Map<number, { ayah: number; text: string; first: string }>();
  for (const [s, [a1, a2]] of by) {
    const short = (a1 ?? '').trim().split(/\s+/).length <= 2 && a2;
    out.set(s, { ayah: 1, text: clipWords(short ? `${a1} ۝ ${a2}` : a1, 10), first: (a1 ?? '').trim().split(/\s+/)[0] ?? '' });
  }
  return out;
}

/// Each surah's theme in a line: Ibn ʿĀshūr's aims and Mawdūdī's subject matter, first sentence each.
export async function themeLines(env: QuranEnv, surahs: number[], L: Record<string, Label[]>) {
  const out = new Map<number, { aim: { text: string; source: string; cite: string } | null; subject: { text: string; source: string; cite: string } | null }>();
  if (!surahs.length) return out;
  const src = byKey(L.group_source);
  // D1 binds at most 100 parameters: the list goes as one JSON array
  const inList = 'SELECT value FROM json_each(?)';
  const arg = [JSON.stringify(surahs)];
  const [aims, subj] = await Promise.all([
    query<{ surah: number; text: string | null }>(env.DB_QR,
      `SELECT surah, substr(json_extract(payload_json, '$.aims.text'), 1, 900) AS text FROM qr_surah_layer
        WHERE layer = 'themes' AND surah IN (${inList})`, arg),
    query<{ surah: number; heading: string; text: string }>(env.DB_QR,
      `SELECT l.surah, json_extract(j.value, '$.heading') AS heading, substr(json_extract(j.value, '$.text'), 1, 900) AS text
         FROM qr_surah_layer l, json_each(l.payload_json, '$.maududi') j
        WHERE l.layer = 'themes' AND l.surah IN (${inList})
          AND (lower(json_extract(j.value, '$.heading')) LIKE '%theme%' OR lower(json_extract(j.value, '$.heading')) LIKE '%subject%'
               OR lower(json_extract(j.value, '$.heading')) LIKE '%topic%')`, arg),
  ]);
  const ashur = src.get('ibn_ashur')?.label ?? 'Ibn ʿĀshūr';
  const mawdudi = src.get('maududi')?.label ?? 'Mawdūdī';
  for (const s of surahs) out.set(s, { aim: null, subject: null });
  for (const a of aims) {
    const t = firstSentence(a.text);
    if (t) out.get(a.surah)!.aim = { text: t, source: 'ibn_ashur', cite: `${ashur}, the surah's aims (aghrāḍ)` };
  }
  for (const m of subj) {
    const o = out.get(m.surah)!;
    const t = firstSentence(m.text);
    if (!o.subject && t) o.subject = { text: t, source: 'maududi', cite: `${mawdudi}, “${m.heading}”` };
  }
  return out;
}

const sourceOf = (L: Record<string, Label[]>, slug: string | null, evidence?: string | null) => {
  const s = byKey(L.group_source).get(slug ?? '');
  return { slug, title: s?.label ?? slug, titleAr: s?.labelAr ?? null, detail: s?.detail ?? null, evidence: evidence ?? null };
};
const basisOf = (L: Record<string, Label[]>, b: string) => {
  const x = byKey(L.group_basis).get(b);
  return { id: b, title: x?.label ?? b, titleAr: x?.labelAr ?? null, tagline: x?.detail ?? null, color: x?.color ?? null };
};
const titleOf = (g: GroupRow) => g.name_translit ?? g.name_en;
const sectionsOf = (L: Record<string, Label[]>) => Object.fromEntries((L.group_section ?? []).map((l) => [l.key, { title: l.label, titleAr: l.labelAr, tagline: l.detail }]));

export function atlasGroupRoutes(router: Router<QuranEnv>) {
  // The Surahs room in a scheme: its groups, each with its surahs, basis and source.
  router.get('/qr/atlas/surahs', async (req, env) => {
    const L = await labels(env);
    const schemes = schemesOf(L);
    const key = new URL(req.url).searchParams.get('group') ?? schemes[0]?.key ?? 'islahi';
    const sc = schemes.find((s) => s.key === key);
    if (!sc) return badRequest(`unknown grouping ${key}`);
    const groups = await groupsOf(env, sc);
    const ids = groups.map((g) => g.id);
    const [surahs, members, ranks] = await Promise.all([
      query<SurahRow & { passages: number; built: number }>(env.DB_QR,
        `SELECT s.id, s.name_ar, s.name_en, s.name_transliteration AS translit, s.ayah_count AS ayahs, s.revelation_type AS revelation,
                (SELECT COUNT(*) FROM qr_surah_study_passage p WHERE p.surah = s.id AND p.status = 'live') AS passages,
                (SELECT COUNT(DISTINCT ayah_from) FROM qr_ss_occ_sentence x WHERE x.surah = s.id) AS built
           FROM qr_surah s ORDER BY s.id`),
      ids.length ? query<MemberRow>(env.DB_QR, `SELECT ${MEMBER_COLS} FROM qr_nazm_group_member WHERE group_id IN (${ids.map(() => '?').join(',')}) ORDER BY member_index`, ids)
                 : Promise.resolve([] as MemberRow[]),
      sc.order === 'revelation' ? query<{ surah: number; rank: number | null }>(env.DB_QR, `SELECT surah, rank FROM qr_surah_revelation_rank`)
                                : Promise.resolve([] as { surah: number; rank: number | null }[]),
    ]);
    const bySurah = new Map(surahs.map((s) => [s.id, s]));
    const rankOf = new Map(ranks.map((r) => [r.surah, r.rank]));
    const surahOut = (s: typeof surahs[number], m?: MemberRow) => ({
      id: s.id, nameAr: s.name_ar, nameEn: s.name_en, translit: s.translit, ayahs: s.ayahs, revelation: s.revelation,
      passages: s.passages, builtAyat: s.built,
      ...(sc.order === 'revelation' ? { rank: rankOf.get(s.id) ?? null } : {}),
      ...(m?.member_role ? { role: m.member_role } : {}),
    });
    const inAny = new Set(members.map((m) => m.surah));
    const outside = surahs.filter((s) => !inAny.has(s.id));
    const sec = sectionsOf(L);
    return ok({
      grouping: { ...card(sc.label), order: sc.order, overlap: sc.overlap },
      schemes: schemes.map((s) => ({ ...card(s.label), order: s.order, overlap: s.overlap })),
      basis: (L.group_basis ?? []).map(card),
      groups: groups.map((g, i) => {
        let ms = members.filter((m) => m.group_id === g.id);
        if (sc.order === 'revelation') {
          // Ibn ʿĀshūr's rank first; a surah he gives none closes the list, in muṣḥaf order
          ms = [...ms].sort((a, b) => (rankOf.get(a.surah) ?? 1e6) - (rankOf.get(b.surah) ?? 1e6) || a.surah - b.surah);
        }
        return {
          id: g.id, slug: g.slug, no: i + 1, title: titleOf(g), titleEn: g.name_en, titleAr: g.name_ar ?? g.epithet_ar,
          range: [g.surah_from, g.surah_to], contiguous: !!g.contiguous, count: g.member_count,
          summary: g.summary_md, basis: g.group_basis, basisLabel: basisOf(L, g.group_basis), confidence: g.confidence,
          source: sourceOf(L, g.source_slug, g.evidence_ref),
          ...(sc.order === 'revelation' ? { ranked: ms.filter((m) => rankOf.get(m.surah) != null).length,
                                           rankSource: sourceOf(L, String(sc.label.extra?.rank_source ?? 'ibn_ashur')) } : {}),
          surahs: ms.map((m) => bySurah.get(m.surah)).filter((s): s is NonNullable<typeof s> => !!s)
                    .map((s) => surahOut(s, ms.find((m) => m.surah === s.id))),
        };
      }),
      outside: outside.length ? { ...(sec.outside ?? { title: 'Outside', titleAr: null, tagline: null }), surahs: outside.map((s) => surahOut(s)) } : null,
    });
  });

  // One group: what it is, its surahs (each with a line on its theme), what they share, its ring.
  router.get('/qr/atlas/group/:groupId', async (_req, env, { groupId }) => {
    const slug = groupId.replace(/^QR:NZ:/, '');
    const g = await queryOne<GroupRow & { note_md: string | null; gloss_json: string | null }>(env.DB_QR,
      `SELECT ${GROUP_COLS}, gloss_json FROM qr_nazm_group WHERE slug = ? OR id = ?`, [slug, groupId]);
    if (!g) return notFound(`group ${groupId}`);
    const L = await labels(env);
    const schemes = schemesOf(L);
    const [members, roots, ranks, readings, links, themes] = await Promise.all([
      query<MemberRow & SurahRow>(env.DB_QR,
        `SELECT ${MEMBER_COLS.split(',').map((c) => `m.${c.trim()}`).join(', ')}, s.id, s.name_ar, s.name_en, s.name_transliteration AS translit,
                s.ayah_count AS ayahs, s.revelation_type AS revelation
           FROM qr_nazm_group_member m JOIN qr_surah s ON s.id = m.surah WHERE m.group_id = ? ORDER BY m.member_index`, [g.id]),
      query<{ root: string; n_group: number; n_surahs: number; n_quran: number; lift: number }>(env.DB_QR,
        `SELECT root, n_group, n_surahs, n_quran, lift FROM qr_nazm_group_root WHERE group_id = ? ORDER BY rank`, [g.id]),
      query<{ surah: number; rank: number | null; evidence_ar: string; note: string | null }>(env.DB_QR,
        `SELECT r.surah, r.rank, r.evidence_ar, r.note FROM qr_surah_revelation_rank r JOIN qr_nazm_group_member m ON m.surah = r.surah WHERE m.group_id = ?`, [g.id]),
      query<{ id: string; reading_label: string; structure_type: string; pattern_notation: string | null; scholar_ref: string | null;
              confidence: string; summary_md: string; dissent_md: string | null; source_slug: string | null; evidence_ref: string | null }>(env.DB_QR,
        `SELECT id, reading_label, structure_type, pattern_notation, scholar_ref, confidence, summary_md, dissent_md, source_slug, evidence_ref
           FROM qr_nazm_reading WHERE group_id = ? ORDER BY created_at`, [g.id]),
      query<{ surah_a: number; surah_b: number; link_type: string; link_strength: string | null; link_evidence: string | null; ayah_a: number | null;
              ayah_b: number | null; note_md: string | null; source_slug: string | null }>(env.DB_QR,
        `SELECT surah_a, surah_b, link_type, link_strength, link_evidence, ayah_a, ayah_b, note_md, source_slug FROM qr_nazm_link WHERE group_id = ?`, [g.id]),
      query<{ theme_key: string; title_en: string; title_ar: string | null; marker_ar: string | null; summary_md: string; distribution_note: string | null }>(env.DB_QR,
        `SELECT theme_key, title_en, title_ar, marker_ar, summary_md, distribution_note FROM qr_nazm_theme WHERE group_id = ? ORDER BY theme_key`, [g.id]),
    ]);
    const surahIds = members.map((m) => m.surah);
    const [open, lines, ring] = await Promise.all([
      openingsOf(env, surahIds), themeLines(env, surahIds, L), groupRing(env, g, L, members),
    ]);
    const rank = new Map(ranks.map((r) => [r.surah, r]));
    const names = new Map(members.map((m) => [m.surah, m.translit ?? m.name_en]));

    // shared openings: the first word of āyah 1 each member opens with, where more than one shares it
    const firsts = new Map<string, { text: string; surahs: number[] }>();
    for (const m of members) {
      const o = open.get(m.surah);
      if (!o) continue;
      const k = fold(o.first);
      firsts.set(k, { text: firsts.get(k)?.text ?? o.first, surahs: [...(firsts.get(k)?.surahs ?? []), m.surah] });
    }
    const forms = new Map<string, number[]>();
    for (const m of members) if (m.opening_form) forms.set(m.opening_form, [...(forms.get(m.opening_form) ?? []), m.surah]);
    const inSchemes = schemes.filter((s) => (s.slugs ? s.slugs.includes(g.slug) : s.sourceSlug === g.source_slug));
    const ringScheme = inSchemes.find((s) => s.ring);
    const sec = sectionsOf(L);

    return ok({
      group: {
        id: g.id, slug: g.slug, title: titleOf(g), titleEn: g.name_en, titleAr: g.name_ar, translit: g.name_translit,
        epithet: g.epithet_ar ? { ar: g.epithet_ar, attrib: g.epithet_attrib } : null,
        range: [g.surah_from, g.surah_to], count: g.member_count, contiguous: !!g.contiguous, revelation: g.revelation_type,
        basis: g.group_basis, basisLabel: basisOf(L, g.group_basis), confidence: g.confidence,
        summary: g.summary_md, note: g.note_md, source: sourceOf(L, g.source_slug, g.evidence_ref),
      },
      schemes: inSchemes.map((s) => card(s.label)),
      sections: sec,
      members: members.map((m) => {
        const o = open.get(m.surah);
        const r = rank.get(m.surah);
        return {
          surah: m.surah, nameAr: m.name_ar, nameEn: m.name_en, translit: m.translit, ayahs: m.ayahs, revelation: m.revelation,
          index: m.member_index, role: m.member_role,
          // the opening as the member table records it where it does, else the muṣḥaf's first āyah
          opening: m.opening_text_ar ? { ayah: m.opening_ayah, text: m.opening_text_ar, form: m.opening_form, recorded: true }
                 : o ? { ayah: o.ayah, text: o.text, form: null, recorded: false } : null,
          epithet: m.epithet_pair_ar ? { ar: m.epithet_pair_ar, case: m.epithet_case } : null,
          anomaly: m.is_anomaly ? (m.anomaly_note ?? '') : null,
          note: m.note_md,
          rank: r ? { rank: r.rank, note: r.note, source: 'ibn_ashur' } : null,
          theme: lines.get(m.surah) ?? null,
        };
      }),
      openings: {
        shared: [...firsts.values()].filter((f) => f.surahs.length > 1).sort((a, b) => b.surahs.length - a.surahs.length)
          .map((f) => ({ text: f.text, count: f.surahs.length, surahs: f.surahs })),
        forms: [...forms.entries()].map(([form, ss]) => ({ form, label: form.replace(/_/g, ' '), surahs: ss })),
      },
      roots: roots.map((r) => ({ root: r.root, n: r.n_group, surahs: r.n_surahs, quran: r.n_quran, lift: r.lift })),
      themes: themes.map((t) => ({ key: t.theme_key, title: t.title_en, titleAr: t.title_ar, marker: t.marker_ar, summary: t.summary_md,
                                   distribution: t.distribution_note })),
      ring: ring ?? (ringScheme?.ring === 'not_recorded'
        ? { status: 'not_recorded', ...(sec.ring_unrecorded ?? {}),
            sequence: members.map((m) => ({ label: String(m.member_index), role: 'unpaired', ref: String(m.surah), text: names.get(m.surah) ?? null, surah: m.surah })) }
        : null),
      links: links.map((k) => ({ a: k.surah_a, b: k.surah_b, aName: names.get(k.surah_a) ?? null, bName: names.get(k.surah_b) ?? null,
                                 type: k.link_type.replace(/_/g, ' '), strength: k.link_strength, evidence: k.link_evidence,
                                 ayahA: k.ayah_a, ayahB: k.ayah_b, note: k.note_md, source: sourceOf(L, k.source_slug) })),
      readings: readings.map((r) => ({ id: r.id, title: r.reading_label, type: r.structure_type.replace(/_/g, ' '), notation: r.pattern_notation,
                                       scholar: r.scholar_ref, confidence: r.confidence, summary: r.summary_md, dissent: r.dissent_md,
                                       source: sourceOf(L, r.source_slug, r.evidence_ref) })),
      practice: { skill: 'groups', group: g.slug, ...(sec.practise ?? {}) },
    });
  });
}

// ── Rings ───────────────────────────────────────────────────────────────────────────────────────

export type RingSide = { label: string; ref: string; text: string | null; surah?: number; from?: number; to?: number };
export type Ring = {
  id: string; scope: 'group' | 'surah' | 'passage'; surah: number | null; group: string | null; title: string; notation: string | null;
  summary: string | null; confidence: string | null;
  source: { slug: string | null; title: string | null; detail: string | null; note: string | null };
  pairs: Array<{ label: string; name: string | null; left: RingSide; right: RingSide; basis: string | null; strength: string | null; evidence: string | null }>;
  centre: RingSide | null;
  sequence: Array<RingSide & { role: 'left' | 'centre' | 'right' | 'unpaired'; pair: string | null }>;
  caveats: Array<{ title: string; text: string; source: string | null }>;
};

const prime = (l: string) => `${l}′`;
const refOf = (a: number | null | undefined, b?: number | null) => (a == null ? '' : b != null && b !== a ? `${a}–${b}` : `${a}`);
const posOf = (r: string) => Number((/\d+/.exec(r) ?? ['0'])[0]);

/// A group's ring, from its recorded ring reading: the notation's letters give the sides (X and
/// X-prime pair across; a letter written twice without a prime pairs with itself; the letter
/// introduced last is the centre), the member table gives each surah's opening and role.
export async function groupRing(env: QuranEnv, g: GroupRow, L: Record<string, Label[]>, members?: Array<MemberRow & Partial<SurahRow>>): Promise<Ring | null> {
  const rd = await queryOne<{ id: string; reading_label: string; pattern_notation: string | null; confidence: string; summary_md: string;
                               scholar_ref: string | null; source_slug: string | null; evidence_ref: string | null; dissent_md: string | null }>(env.DB_QR,
    `SELECT id, reading_label, pattern_notation, confidence, summary_md, scholar_ref, source_slug, evidence_ref, dissent_md FROM qr_nazm_reading
      WHERE group_id = ? AND structure_type LIKE 'ring%' AND pattern_notation IS NOT NULL ORDER BY created_at LIMIT 1`, [g.id]);
  if (!rd?.pattern_notation) return null;
  const toks = [...rd.pattern_notation.matchAll(/([A-Z])(-prime|′|')?\(([^)]*)\)/g)].map((m) => ({ letter: m[1], primed: !!m[2], ref: m[3].trim() }));
  if (toks.length < 3) return null;
  const ms = members ?? await query<MemberRow & SurahRow>(env.DB_QR,
    `SELECT m.*, s.name_transliteration AS translit, s.name_en FROM qr_nazm_group_member m JOIN qr_surah s ON s.id = m.surah WHERE m.group_id = ?`, [g.id]);
  const [others, names] = await Promise.all([
    query<{ reading_label: string; summary_md: string; scholar_ref: string | null }>(env.DB_QR,
      `SELECT reading_label, summary_md, scholar_ref FROM qr_nazm_reading WHERE group_id = ? AND id <> ? AND structure_type NOT LIKE 'ring%'`, [g.id, rd.id]),
    query<{ id: number; translit: string | null; name_en: string }>(env.DB_QR, `SELECT id, name_transliteration AS translit, name_en FROM qr_surah`),
  ]);
  const nameOf = new Map(names.map((n) => [n.id, n.translit ?? n.name_en]));
  const memberOf = new Map(ms.map((m) => [m.surah, m]));
  const side = (t: typeof toks[number]): RingSide => {
    const s = posOf(t.ref);
    const m = memberOf.get(s);
    return { label: t.primed ? prime(t.letter) : t.letter, ref: t.ref, surah: s,
             text: [nameOf.get(s), m?.opening_text_ar ? `﴿${m.opening_text_ar}﴾` : null].filter(Boolean).join(' — ') || null };
  };
  const order = [...new Set(toks.map((t) => t.letter))];
  const centreLetter = order[order.length - 1];
  const pairs: Ring['pairs'] = [];
  for (const letter of order.filter((l) => l !== centreLetter)) {
    const ts = toks.filter((t) => t.letter === letter);
    const plain = ts.filter((t) => !t.primed), primed = ts.filter((t) => t.primed);
    const [lefts, rights] = primed.length ? [plain, primed] : [ts.slice(0, Math.ceil(ts.length / 2)), ts.slice(Math.ceil(ts.length / 2))];
    if (!lefts.length || !rights.length) continue;
    const merge = (xs: typeof ts): RingSide => xs.length === 1 ? side(xs[0])
      : { label: side(xs[0]).label, ref: xs.map((x) => x.ref).join(', '), text: xs.map((x) => side(x).text).join(' · '), surah: posOf(xs[0].ref) };
    pairs.push({ label: letter, name: null, left: merge(lefts), right: merge(rights), basis: null, strength: null, evidence: null });
  }
  const cs = toks.filter((t) => t.letter === centreLetter);
  const centre: RingSide = { label: centreLetter, ref: cs.map((c) => c.ref).join(', '), surah: posOf(cs[0].ref),
                             text: cs.map((c) => side(c).text).join(' · ') };
  const src = byKey(L.group_source).get(rd.source_slug ?? '');
  return {
    id: rd.id, scope: 'group', surah: null, group: g.slug, title: `${titleOf(g)} — ${rd.reading_label}`, notation: rd.pattern_notation,
    summary: rd.summary_md, confidence: rd.confidence,
    source: { slug: rd.source_slug, title: rd.scholar_ref ?? src?.label ?? rd.source_slug, detail: src?.detail ?? null, note: rd.evidence_ref },
    pairs, centre,
    sequence: toks.map((t) => {
      const same = toks.filter((x) => x.letter === t.letter);
      const role = t.letter === centreLetter ? 'centre' as const
        : same.some((x) => x.primed) ? (t.primed ? 'right' as const : 'left' as const)
        : same.indexOf(t) < Math.ceil(same.length / 2) ? 'left' as const : 'right' as const;
      return { ...side(t), role, pair: role === 'centre' ? null : t.letter };
    }),
    caveats: [
      ...(rd.dissent_md ? [{ title: 'Dissent', text: rd.dissent_md, source: null }] : []),
      ...others.map((o) => ({ title: o.reading_label, text: o.summary_md, source: o.scholar_ref })),
    ],
  };
}

type SymRow = { id: string; surah: number; pattern_type: string; center_ayah_from: number | null; center_ayah_to: number | null;
                pattern_notation: string | null; pairs_json: string | null; summary_md: string | null; note_md: string | null;
                reading_label: string | null; scholar_ref: string | null; reading_confidence: string | null };
type UnitRow = { surah: number; ayah_from: number; ayah_to: number; label: string | null };
type SectionRow = { id: string; passage_id: string; surah: number; renderer: string; title: string | null; data_json: string | null;
                    ayah_from: number | null; ayah_to: number | null; ptitle: string | null };

/// Every recorded ring of a surah (or of all surahs): its symmetry pattern, its passages' ring positions
/// in the naẓm layer, the chiasm of a passage, and the rings of the groups it belongs to.
export async function surahRings(env: QuranEnv, s: number | null, L?: Record<string, Label[]>): Promise<Ring[]> {
  L ??= await labels(env);
  const where = s == null ? '1=1' : 'x.surah = ?';
  const args = s == null ? [] : [s];
  const [syms, units, sections, groupRows] = await Promise.all([
    query<SymRow>(env.DB_QR,
      `SELECT x.id, x.surah, x.pattern_type, x.center_ayah_from, x.center_ayah_to, x.pattern_notation, x.pairs_json, x.summary_md, x.note_md,
              r.reading_label, r.scholar_ref, r.confidence AS reading_confidence
         FROM qr_surah_symmetry_pattern x LEFT JOIN qr_surah_structure_reading r ON r.id = x.structure_reading_id WHERE ${where}`, args),
    query<UnitRow>(env.DB_QR, `SELECT x.surah, x.ayah_from, x.ayah_to, x.label FROM qr_surah_structure_unit x WHERE ${where} ORDER BY x.surah, x.unit_index`, args),
    query<SectionRow>(env.DB_QR,
      `SELECT x.id, x.passage_id, x.surah, x.renderer, x.title, x.data_json, p.ayah_from, p.ayah_to, COALESCE(p.title_en, p.label) AS ptitle
         FROM qr_passage_section x LEFT JOIN qr_surah_study_passage p ON p.id = x.passage_id
        WHERE x.renderer IN ('nazm_ring', 'chiasm') AND x.status = 'active' AND ${where} ORDER BY x.surah, p.ayah_from, x.sort_order`, args),
    query<GroupRow>(env.DB_QR,
      `SELECT DISTINCT ${GROUP_COLS.split(',').map((c) => `g.${c.trim()}`).join(', ')} FROM qr_nazm_group g JOIN qr_nazm_reading r ON r.group_id = g.id
         ${s == null ? '' : 'JOIN qr_nazm_group_member m ON m.group_id = g.id AND m.surah = ?'}
        WHERE r.structure_type LIKE 'ring%'`, args),
  ]);
  const src = byKey(L.group_source);
  const editorial = (note: string | null, conf: string | null) => ({ slug: 'editorial', title: src.get('editorial')?.label ?? 'editorial',
                                                                     detail: src.get('editorial')?.detail ?? null, note, confidence: conf ?? 'proposed' });
  const unitText = (surah: number, a: number, b: number) => {
    const us = units.filter((u) => u.surah === surah && u.ayah_from >= a && u.ayah_to <= b && u.label);
    return us.length ? us.map((u) => u.label).join(' · ') : null;
  };
  const ptitle = new Map((await query<{ surah: number; ayah_from: number; ayah_to: number; title: string | null }>(env.DB_QR,
    `SELECT x.surah, x.ayah_from, x.ayah_to, COALESCE(x.title_en, x.label) AS title FROM qr_surah_study_passage x
      WHERE x.status = 'live' AND x.surah IN (SELECT DISTINCT surah FROM qr_passage_section WHERE renderer = 'nazm_ring') AND ${where}`, args))
    .map((r) => [`${r.surah}:${r.ayah_from}-${r.ayah_to}`, r.title]));
  const surahNames = new Map((await query<{ id: number; translit: string | null; name_en: string }>(env.DB_QR,
    `SELECT id, name_transliteration AS translit, name_en FROM qr_surah`)).map((r) => [r.id, r.translit ?? r.name_en]));
  const rings: Ring[] = [];

  // a surah's symmetry pattern: pairs in whichever of the recorded shapes, the centre from its āyāt
  for (const x of syms) {
    let raw: Array<Record<string, any>> = [];
    try { raw = x.pairs_json ? JSON.parse(x.pairs_json) : []; } catch { raw = []; }
    let note: Record<string, unknown> | null = null;
    try { note = x.note_md?.trim().startsWith('{') ? JSON.parse(x.note_md) : null; } catch { note = null; }
    const span = (v: any): { from: number; to: number } | null => {
      if (Array.isArray(v)) return { from: +v[0], to: +(v[1] ?? v[0]) };
      if (v && typeof v === 'object') {
        if (v.ayah_from != null) return { from: +v.ayah_from, to: +(v.ayah_to ?? v.ayah_from) };
        if (v.ayah != null) { const m = /^(\d+)(?:-(\d+))?$/.exec(String(v.ayah)); if (m) return { from: +m[1], to: +(m[2] ?? m[1]) }; }
      }
      return null;
    };
    const mk = (v: any, label: string): RingSide | null => {
      const sp = span(v);
      if (!sp) return null;
      return { label, ref: `${x.surah}:${refOf(sp.from, sp.to)}`, from: sp.from, to: sp.to, surah: x.surah,
               text: (v && typeof v === 'object' && !Array.isArray(v) && v.theme) ? String(v.theme) : unitText(x.surah, sp.from, sp.to) };
    };
    const found = raw.filter((p) => !p.center).map((p) => ({
      name: (p.label as string | undefined) ?? null, left: p.left ?? p.a, right: p.right ?? p.b,
      basis: (p.basis as string | undefined) ?? null, strength: (p.strength as string | undefined) ?? null, evidence: (p.evidence as string | undefined) ?? null,
    })).filter((p) => span(p.left) && span(p.right))
      .sort((a, b) => span(a.left)!.from - span(b.left)!.from);
    const pairs = found.map((p, i) => {
      const letter = String.fromCharCode(65 + i);
      return { label: letter, name: p.name, left: mk(p.left, letter)!, right: mk(p.right, prime(letter))!, basis: p.basis, strength: p.strength, evidence: p.evidence };
    });
    const c = raw.find((p) => p.center)?.center;
    const cf = x.center_ayah_from ?? span(c)?.from ?? null, ct = x.center_ayah_to ?? span(c)?.to ?? cf;
    const centre: RingSide | null = cf != null ? { label: 'X', ref: `${x.surah}:${refOf(cf, ct)}`, from: cf, to: ct ?? cf, surah: x.surah,
                                                   text: (c?.theme as string | undefined) ?? unitText(x.surah, cf, ct ?? cf) } : null;
    const sides = [...pairs.flatMap((p) => [{ ...p.left, role: 'left' as const, pair: p.label }, { ...p.right, role: 'right' as const, pair: p.label }]),
                   ...(centre ? [{ ...centre, role: 'centre' as const, pair: null }] : [])];
    const lefts = sides.filter((z) => z.role === 'left').sort((a, b) => a.from! - b.from!);
    const rights = sides.filter((z) => z.role === 'right').sort((a, b) => a.from! - b.from!);
    const noteText = x.note_md && !note ? x.note_md : null;
    rings.push({
      id: x.id, scope: 'surah', surah: x.surah, group: null,
      title: `${surahNames.get(x.surah) ?? `Surah ${x.surah}`} — ${x.reading_label ?? x.pattern_type.replace(/_/g, ' ')}`,
      notation: x.pattern_notation, summary: x.summary_md,
      confidence: (note?.confidence as string | undefined) ?? x.reading_confidence ?? (noteText && /proposal/i.test(noteText) ? 'proposed' : 'proposed'),
      source: x.scholar_ref ? { slug: null, title: x.scholar_ref, detail: null, note: noteText } : editorial(noteText, null),
      pairs, centre,
      sequence: [...lefts, ...(centre ? [{ ...centre, role: 'centre' as const, pair: null }] : []), ...rights],
      caveats: noteText ? [{ title: 'Note', text: noteText, source: null }] : [],
    });
  }

  // a surah's passages placed in a ring by the naẓm layer (qr_passage_section 'nazm_ring')
  const bySurah = new Map<number, SectionRow[]>();
  for (const r of sections.filter((r) => r.renderer === 'nazm_ring')) bySurah.set(r.surah, [...(bySurah.get(r.surah) ?? []), r]);
  for (const [surah, rows] of bySurah) {
    const items = rows.map((r) => {
      let d: Record<string, any> = {};
      try { d = r.data_json ? JSON.parse(r.data_json) : {}; } catch { d = {}; }
      const range = /:(\d+)-(\d+)$/.exec(r.passage_id);
      const from = r.ayah_from ?? (range ? +range[1] : 0), to = r.ayah_to ?? (range ? +range[2] : from);
      return { r, d, ring: (d.ring ?? {}) as { pair?: string | null; side?: string; partner?: string | null; basis?: string },
               from, to, text: r.ptitle ?? (d.movement?.label as string | undefined) ?? null };
    }).sort((a, b) => a.from - b.from);
    const paired = items.filter((i) => i.ring.pair && (i.ring.side === 'first' || i.ring.side === 'second'));
    const letters = [...new Set(paired.map((i) => i.ring.pair!))];
    const pairs: Ring['pairs'] = [];
    for (const l of letters) {
      // a side whose own row is retired still stands where its active partner names it
      const partnerOf = (x: typeof paired[number] | undefined) => {
        const m = x?.ring.partner ? /:(\d+)-(\d+)$/.exec(x.ring.partner) : null;
        return m ? { from: +m[1], to: +m[2], text: ptitle.get(`${surah}:${m[1]}-${m[2]}`) ?? unitText(surah, +m[1], +m[2]), d: {} as Record<string, any>, ring: {} as { basis?: string } } : null;
      };
      const a0 = paired.find((i) => i.ring.pair === l && i.ring.side === 'first');
      const b0 = paired.find((i) => i.ring.pair === l && i.ring.side === 'second');
      const a = a0 ?? partnerOf(b0), b = b0 ?? partnerOf(a0);
      if (!a || !b) continue;
      pairs.push({ label: l, name: null,
                   left: { label: l, ref: `${surah}:${refOf(a.from, a.to)}`, from: a.from, to: a.to, surah, text: a.text },
                   right: { label: prime(l), ref: `${surah}:${refOf(b.from, b.to)}`, from: b.from, to: b.to, surah, text: b.text ?? unitText(surah, b.from, b.to) },
                   basis: a.ring.basis ?? b.ring.basis ?? null, strength: null, evidence: ((a.d.evidence ?? b.d.evidence) as string | undefined) ?? null });
    }
    pairs.sort((x, y) => (x.left.from ?? 0) - (y.left.from ?? 0));
    const cs = items.filter((i) => i.ring.side === 'centre');
    if (pairs.length < 2 && !cs.length) continue;   // one pair alone is a pair, not a ring (the symmetry pattern carries it)
    const centre: RingSide | null = cs.length ? { label: cs[0].ring.pair ?? 'X', ref: `${surah}:${refOf(cs[0].from, cs[cs.length - 1].to)}`,
                                                  from: cs[0].from, to: cs[cs.length - 1].to, surah,
                                                  text: [...new Set(cs.map((c) => c.d.movement?.label ?? c.text))].join(' · ') } : null;
    const note = items.map((i) => i.d.note as string | undefined).find(Boolean) ?? null;
    // in the order of the text: the paired sides, the centre, and the passages the ring leaves unpaired
    const placed = new Set(pairs.flatMap((p) => [p.left.from, p.right.from]));
    const sequence: Ring['sequence'] = [
      ...pairs.flatMap((p) => [{ ...p.left, role: 'left' as const, pair: p.label }, { ...p.right, role: 'right' as const, pair: p.label }]),
      ...(centre ? [{ ...centre, role: 'centre' as const, pair: null }] : []),
      ...items.filter((i) => i.ring.side !== 'centre' && !placed.has(i.from))
        .map((i) => ({ label: '·', ref: `${surah}:${refOf(i.from, i.to)}`, from: i.from, to: i.to, surah, text: i.text, role: 'unpaired' as const, pair: null })),
    ].sort((x, y) => (x.from ?? 0) - (y.from ?? 0));
    rings.push({
      id: `QR:RING:${surah}:passages`, scope: 'surah', surah, group: null,
      title: `${surahNames.get(surah) ?? `Surah ${surah}`} — its passages in a ring`,
      notation: sequence.map((z) => z.role === 'unpaired' ? '·' : z.label).join(' '), summary: null, confidence: 'proposed',
      source: editorial(note, 'proposed'), pairs, centre, sequence, caveats: note ? [{ title: 'Note', text: note, source: null }] : [],
    });
  }

  // a passage's own chiasm (qr_passage_section 'chiasm'): its levels as recorded, mirrored by their letters
  for (const r of sections.filter((r) => r.renderer === 'chiasm')) {
    let d: { levels?: Array<{ label: string; variant?: string; ref: string; text: string }>; axis_note?: string; note?: string } = {};
    try { d = r.data_json ? JSON.parse(r.data_json) : {}; } catch { d = {}; }
    const lv = d.levels ?? [];
    if (lv.length < 3) continue;
    const half = Math.floor(lv.length / 2);
    const xIdx = lv.findIndex((l) => l.variant === 'x' || l.label === 'X');
    const at = (l: typeof lv[number]): RingSide => ({ label: l.label, ref: `${r.surah}:${l.ref}`, text: l.text, surah: r.surah });
    const pairs: Ring['pairs'] = [];
    const leftEnd = xIdx >= 0 ? xIdx : half;
    const rightStart = xIdx >= 0 ? xIdx + 1 : lv.length - half;
    for (let i = 0; i < leftEnd; i++) {
      const j = lv.length - 1 - i;
      if (j < rightStart) break;
      if ((lv[i].variant ?? lv[i].label[0]) !== (lv[j].variant ?? lv[j].label[0])) continue;
      pairs.push({ label: lv[i].label, name: null, left: at(lv[i]), right: at(lv[j]), basis: null, strength: null, evidence: null });
    }
    // no X: the two innermost levels share a letter and stand together at the centre
    const centre: RingSide | null = xIdx >= 0 ? at(lv[xIdx])
      : (lv.length % 2 === 0 && pairs.length && pairs[pairs.length - 1].left.label === lv[half - 1].label)
        ? (() => { const p = pairs.pop()!; return { label: p.left.label, ref: `${p.left.ref} · ${p.right.ref}`, text: `${p.left.text} · ${p.right.text}`, surah: r.surah }; })()
        : null;
    const paired = new Set(pairs.flatMap((p) => [p.left.ref, p.right.ref]));
    rings.push({
      id: r.id, scope: 'passage', surah: r.surah, group: null,
      title: `${surahNames.get(r.surah) ?? `Surah ${r.surah}`} ${r.surah}:${refOf(r.ayah_from, r.ayah_to)} — ${r.title ?? 'chiasm'}`,
      notation: lv.map((l) => l.label).join(' '), summary: d.axis_note ?? d.note ?? null, confidence: 'proposed',
      source: editorial(null, 'proposed'), pairs, centre,
      sequence: lv.map((l, i) => {
        const role = centre && (i === xIdx || (xIdx < 0 && (i === half - 1 || i === half) && !paired.has(`${r.surah}:${l.ref}`))) ? 'centre' as const
          : i < lv.length / 2 ? 'left' as const : 'right' as const;
        return { ...at(l), role, pair: role === 'centre' ? null : (l.variant ?? l.label[0]).toUpperCase() };
      }),
      caveats: [],
    });
  }

  for (const g of groupRows) {
    const ring = await groupRing(env, g, L);
    if (ring) rings.push(ring);
  }
  return rings;
}

export const allRings = (env: QuranEnv, L?: Record<string, Label[]>) => surahRings(env, null, L);
