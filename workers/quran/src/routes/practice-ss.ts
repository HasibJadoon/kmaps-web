import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import type { Label } from '../lib/labels';
import { loadAyat, withCard, levelOf, interleave, shuffle, uniq, cap, parseJson, type Ayah, type Drill, type Scope } from './practice-kit';

// ── sentence structure (ss) ───────────────────────────────────────────────────
// The clauses of every āyah as al-Jadwal fī iʿrāb al-Qurʾān states them (qr_ss_clause_reading, built by
// kmaps-resources scripts/quran/ss_clause_drills.py — migration qr_065), set against the other iʿrāb books,
// and the curated sentence-structure layer (ellipsis, nuance, the translation's build-up and decisions).
// Every label — the kinds, places, roles, elided elements, drivers, the books' names — is qr_study_label.
//
//   ss_kind      nominal or verbal? (the clause's opening words decide it)                       L1
//   ss_mahall    has the clause a place in iʿrāb, and which?                                      L1
//   ss_role      its role, set among sibling roles                                                L2
//   ss_books     where the books part on a clause: how does this book read it?                    L3
//   ss_ellipsis  what is elided                                                                   L3
//   ss_nuance    the figure / discourse force at work                                             L3
//   ss_buildup   order the translation's build-up steps                                           L3
//   ss_why       why was it rendered so                                                           L3
//
// The derived rows stand only on āyāt the curated layer does not cover (clause_id IS NOT NULL), so a curated
// āyah is drilled from the curated rows alone.

type Reading = { rid: number; id: string; clause_id: string | null; surah: number; ayah: number; word_start: number; word_end: number;
                 quote_ar: string | null; source_slug: string; role_key: string | null; mahall: string | null; alt_roles_json: string | null;
                 statement_ar: string; is_backbone: number; agrees: number | null; kind: string | null; kind_head: string | null; kind_head_pos: string | null };
type Book = { en: string; ar: string };
type Pick = { ask: string; surah: number; ayah: number; from: number | null; to: number | null; key: string; row: Record<string, unknown> };

const J = (xs: unknown[]) => JSON.stringify(xs);

export async function ssDrills(env: QuranEnv, n: number, scope: Scope, lv: Record<string, unknown>, L: Record<string, Label[]>): Promise<Drill[]> {
  const { band, asks, extra } = levelOf(L, 'ss', lv);
  const books = (extra.books ?? {}) as Record<string, Book>;
  const curatedName = ((extra.curated ?? {}) as Book).en ?? 'curated';
  const bookName = (slug: string) => books[slug]?.en ?? slug;
  const lab = (scopeKey: string) => new Map((L[scopeKey] ?? []).map((x) => [x.key, x]));
  const kinds = lab('ss_kind'), places = lab('ss_mahall'), roles = lab('ss_role'), pos = lab('ss_pos'), drivers = lab('ss_driver');
  const ellipses = lab('ss_ellipsis');
  const aliasOf = (m: Map<string, Label>) => {
    const a = new Map<string, string>();
    for (const [k, v] of m) { a.set(k, k); for (const x of ((v.extra?.aliases ?? []) as string[])) a.set(x, k); }
    return a;
  };
  const ellipsisKey = aliasOf(ellipses), driverKey = aliasOf(drivers);
  const roleLabel = (k: string | null | undefined) => (k && roles.get(k)?.label) || k || '';
  const family = (k: string) => String(roles.get(k)?.extra?.family ?? '');

  const sc = (col = '') => scope.surah === null ? { sql: '1=1', args: [] as number[] }
    : scope.from && scope.to ? { sql: `${col}surah = ? AND ${col}ayah BETWEEN ? AND ?`, args: [scope.surah, scope.from, scope.to] }
    : { sql: `${col}surah = ?`, args: [scope.surah] };
  const scRange = (col = '') => scope.surah === null ? { sql: '1=1', args: [] as number[] }
    : scope.from && scope.to ? { sql: `${col}surah = ? AND ${col}ayah_from <= ? AND ${col}ayah_to >= ?`, args: [scope.surah, scope.to, scope.from] }
    : { sql: `${col}surah = ?`, args: [scope.surah] };
  const take = n * 3;
  const roleKeys = [...roles.keys()];
  const ellKeys = [...ellipsisKey.keys()];

  // ── draw each ask's pile ──
  const draw: Record<string, () => Promise<Pick[]>> = {
    ss_kind: async () => { const w = sc(); return (await query<Reading>(env.DB_QR,
      `SELECT rowid AS rid, * FROM qr_ss_clause_reading WHERE is_backbone = 1 AND clause_id IS NOT NULL AND kind IN ('ismiyya','filiyya')
         AND kind_head IS NOT NULL AND ${w.sql} ORDER BY random() LIMIT ?`, [...w.args, take]))
      .map((r) => ({ ask: 'ss_kind', surah: r.surah, ayah: r.ayah, from: r.word_start, to: r.word_end, key: r.id, row: r })); },
    ss_mahall: async () => { const w = sc(); return (await query<Reading>(env.DB_QR,
      `SELECT rowid AS rid, * FROM qr_ss_clause_reading WHERE is_backbone = 1 AND clause_id IS NOT NULL AND mahall IS NOT NULL
         AND role_key IS NOT NULL AND ${w.sql} ORDER BY random() LIMIT ?`, [...w.args, take]))
      .map((r) => ({ ask: 'ss_mahall', surah: r.surah, ayah: r.ayah, from: r.word_start, to: r.word_end, key: r.id, row: r })); },
    ss_role: async () => { const w = sc(); return (await query<Reading>(env.DB_QR,
      `SELECT rowid AS rid, * FROM qr_ss_clause_reading WHERE is_backbone = 1 AND clause_id IS NOT NULL AND role_key != 'maatufa'
         AND role_key IN (SELECT value FROM json_each(?)) AND ${w.sql} ORDER BY random() LIMIT ?`, [J(roleKeys), ...w.args, take]))
      .map((r) => ({ ask: 'ss_role', surah: r.surah, ayah: r.ayah, from: r.word_start, to: r.word_end, key: r.id, row: r })); },
    ss_books: async () => { const w = sc('o.'); return (await query<Reading & { j_role: string; j_statement: string }>(env.DB_QR,
      `SELECT o.rowid AS rid, o.*, j.role_key AS j_role, j.statement_ar AS j_statement FROM qr_ss_clause_reading o
         JOIN qr_ss_clause_reading j ON j.clause_id = o.clause_id AND j.is_backbone = 1
        WHERE o.is_backbone = 0 AND o.agrees = 0 AND o.clause_id IS NOT NULL AND o.role_key IN (SELECT value FROM json_each(?))
          AND j.role_key IN (SELECT value FROM json_each(?)) AND ${w.sql} ORDER BY random() LIMIT ?`, [J(roleKeys), J(roleKeys), ...w.args, take]))
      .map((r) => ({ ask: 'ss_books', surah: r.surah, ayah: r.ayah, from: r.word_start, to: r.word_end, key: r.id, row: r })); },
    ss_ellipsis: async () => { const w = scRange('s.'); return (await query<Record<string, unknown> & { surah: number; ayah_from: number; ws: number | null; we: number | null; id: string }>(env.DB_QR,
      `SELECT e.id, e.ellipsis_type, e.elided_element, e.rhetorical_effect, e.note_md, e.source_basis, s.surah, s.ayah_from,
              COALESCE(c.word_start_index, s.word_start_index) AS ws, COALESCE(c.word_end_index, s.word_end_index) AS we,
              COALESCE(c.ayah_from, s.ayah_from) AS c_ayah
         FROM qr_ss_ellipsis_event e JOIN qr_ss_occ_sentence s ON s.id = e.sentence_id
         LEFT JOIN qr_ss_occ_clause c ON e.scope_type = 'clause' AND c.id = e.scope_id
        WHERE e.ellipsis_type IN (SELECT value FROM json_each(?)) AND ${w.sql} ORDER BY random() LIMIT ?`, [J(ellKeys), ...w.args, take]))
      .map((r) => ({ ask: 'ss_ellipsis', surah: r.surah, ayah: Number(r.c_ayah ?? r.ayah_from), from: r.ws, to: r.we, key: r.id, row: r })); },
    ss_nuance: async () => {
      const w = scRange('s.');
      const rows = await query<Record<string, unknown> & { id: string; surah: number; ayah_from: number; ws: number | null; we: number | null }>(env.DB_QR,
        `SELECT n.id, n.nuance_type, n.lx_nuance_type_ref, n.nuance_text, n.nuance_text_ar, n.source_basis, s.surah,
                COALESCE(c.ayah_from, s.ayah_from) AS ayah_from,
                COALESCE(c.word_start_index, s.word_start_index) AS ws, COALESCE(c.word_end_index, s.word_end_index) AS we
           FROM qr_ss_scope_nuance n
           LEFT JOIN qr_ss_occ_clause c ON n.scope_type = 'clause' AND c.id = n.scope_id
           JOIN qr_ss_occ_sentence s ON s.id = CASE WHEN n.scope_type = 'sentence' THEN n.scope_id ELSE c.sentence_id END
          WHERE n.scope_type IN ('sentence','clause') AND ${w.sql} ORDER BY random() LIMIT ?`, [...w.args, take]);
      return rows.map((r) => ({ ask: 'ss_nuance', surah: r.surah, ayah: r.ayah_from, from: r.ws, to: r.we, key: r.id, row: r }));
    },
    ss_buildup: async () => {
      const w = scRange('p.');
      const ps = await query<{ id: string; surah: number; ayah_from: number; ayah_to: number; final_fluent_en: string; steps: number }>(env.DB_QR,
        `SELECT p.id, p.surah, p.ayah_from, p.ayah_to, p.final_fluent_en, (SELECT COUNT(*) FROM qr_ss_translation_buildup b WHERE b.passage_id = p.id) AS steps
           FROM qr_ss_translation_passage p WHERE ${w.sql} AND (SELECT COUNT(*) FROM qr_ss_translation_buildup b WHERE b.passage_id = p.id) BETWEEN 3 AND 12
          ORDER BY random() LIMIT ?`, [...w.args, n]);
      return ps.map((p) => ({ ask: 'ss_buildup', surah: p.surah, ayah: p.ayah_from, from: null, to: null, key: p.id, row: p }));
    },
    ss_why: async () => {
      const w = sc('d.');
      const ds = await query<Record<string, unknown> & { id: string; surah: number; ayah: number; ws: number | null; we: number | null }>(env.DB_QR,
        `SELECT d.id, d.surah, d.ayah, d.target_span_ar, d.rendered_json, d.driver_kind, d.rationale_json,
                s.word_start_index AS ws, s.word_end_index AS we, s.ayah_from AS s_ayah
           FROM qr_ss_translation_decision d
           LEFT JOIN qr_ss_translation_unit u ON u.id = d.unit_id
           LEFT JOIN qr_ss_occ_sentence s ON u.scope_type = 'sentence' AND s.id = u.scope_id
          WHERE d.status = 'live' AND d.driver_kind IN (SELECT value FROM json_each(?)) AND ${w.sql} ORDER BY random() LIMIT ?`,
        [J([...driverKey.keys()]), ...w.args, take]);
      return ds.map((d) => ({ ask: 'ss_why', surah: d.surah, ayah: d.ayah, from: d.s_ayah === d.ayah ? d.ws : null, to: d.s_ayah === d.ayah ? d.we : null, key: d.id, row: d }));
    },
  };
  const piles = await Promise.all(asks.filter((a) => draw[a]).map((a) => draw[a]().catch(() => [] as Pick[])));
  // one drill per āyah, the asks taken in turn
  const seen = new Set<string>();
  const chosen = interleave(piles, take).filter((p) => { const k = `${p.surah}:${p.ayah}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, n);
  if (!chosen.length) return [];

  // what the drills need beyond their own rows
  const bookClauses = uniq(chosen.filter((c) => c.ask === 'ss_books').map((c) => String((c.row as Reading).clause_id)));
  const roleClauses = uniq(chosen.filter((c) => c.ask === 'ss_role' || c.ask === 'ss_mahall').map((c) => String((c.row as Reading).clause_id)));
  const passageIds = chosen.filter((c) => c.ask === 'ss_buildup').map((c) => c.key);
  const buildAyat = chosen.filter((c) => c.ask === 'ss_buildup').flatMap((c) => {
    const p = c.row as { surah: number; ayah_from: number; ayah_to: number };
    return Array.from({ length: p.ayah_to - p.ayah_from + 1 }, (_, k) => [p.surah, p.ayah_from + k]);
  });
  const gtRefs = chosen.filter((c) => c.ask === 'ss_nuance' && c.row.lx_nuance_type_ref).map((c) => String(c.row.lx_nuance_type_ref));
  const [ayat, others, steps, figures, curatedNuances] = await Promise.all([
    loadAyat(env, [...chosen.map((c) => [c.surah, c.ayah]), ...buildAyat]),
    bookClauses.length || roleClauses.length ? query<Reading>(env.DB_QR,
      `SELECT rowid AS rid, * FROM qr_ss_clause_reading WHERE clause_id IN (SELECT value FROM json_each(?)) ORDER BY is_backbone DESC, source_slug`,
      [J([...bookClauses, ...roleClauses])]) : Promise.resolve([] as Reading[]),
    passageIds.length ? query<{ passage_id: string; step_seq: number; added_en: string | null; connector_en: string | null; layers_ar: string | null }>(env.DB_QR,
      `SELECT passage_id, step_seq, added_en, connector_en, layers_ar FROM qr_ss_translation_buildup
        WHERE passage_id IN (SELECT value FROM json_each(?)) AND added_en IS NOT NULL ORDER BY passage_id, step_seq`, [J(passageIds)]) : Promise.resolve([]),
    // the figures of the same family the derived nuances are set among: those al-Jadwal names somewhere
    gtRefs.length ? query<{ id: string; name_ar: string; name_en: string | null }>(env.DB_QR,
      `SELECT id, name_ar, name_en FROM ar_ling_gram_term WHERE id IN (SELECT DISTINCT lx_nuance_type_ref FROM qr_ss_scope_nuance
         WHERE lx_nuance_type_ref IS NOT NULL) OR id IN (SELECT value FROM json_each(?))`, [J(gtRefs)]) : Promise.resolve([]),
    chosen.some((c) => c.ask === 'ss_nuance' && !c.row.lx_nuance_type_ref) ? query<{ id: string; nuance_type: string; nuance_text: string }>(env.DB_QR,
      `SELECT id, nuance_type, nuance_text FROM qr_ss_scope_nuance WHERE COALESCE(source_basis, '') NOT LIKE 'derived%' AND length(nuance_text) < 220`) : Promise.resolve([]),
  ]);
  const term = new Map(figures.map((t) => [t.id, t]));
  const figureLabel = (id: string) => { const t = term.get(id); return t ? `${cap(t.name_en ?? '')} · ${t.name_ar}` : id; };

  const out: Drill[] = [];
  for (const c of chosen) {
    const a = ayat.get(`${c.surah}:${c.ayah}`);
    if (!a) continue;
    const span = spanOf(a, c.from, c.to);
    const line = a.ws.map((w) => w.word_text).join(' ');
    const marked = span.length ? span.map((i) => a.ws[i]?.word_text).join(' ') : line;
    const base = { kind: 'feature', ask: c.ask, script: 'quran', audio: a.audio, words: a.words, en: a.en, span,
                   source: { workId: `QR:SURAH:${c.surah}`, title: a.title, level: null } };
    const card = (d: Drill, key: string, front: string, back: string) =>
      withCard(d, { ref: `QR:ss:${key}`, type: 'grammar', kind: 'ss', band, front, back, surah: c.surah, ayah: c.ayah, series: a.surahName });
    const cite = (r: { statement_ar: string; source_slug: string }) => `${r.statement_ar} — ${bookName(r.source_slug)}`;

    if (c.ask === 'ss_kind') {
      const r = c.row as Reading;
      const ans = kinds.get(r.kind!);
      if (!ans || kinds.size < 2) continue;
      const head = r.kind_head_pos ? pos.get(r.kind_head_pos) : undefined;
      out.push(card({
        ...base, id: `ss:kind:${r.id}`, prompt: 'Is the marked clause a nominal or a verbal sentence?',
        options: [...kinds.values()].map((k) => k.label), answer: ans.label, note: { en: ans.label, ar: ans.labelAr ?? '' },
        explanation: `${head ? `It opens with ${r.kind_head} — ${head.label}.\n` : ''}${cite(r)}`,
      }, `kind:${r.id}`, `${line}\n${marked} — nominal or verbal?`, `${ans.label}\n${r.statement_ar}`));
    } else if (c.ask === 'ss_mahall') {
      const r = c.row as Reading;
      const ans = places.get(r.mahall!);
      if (!ans) continue;
      // no place, and the three cases (the jussive in for one of them when it is the answer)
      const set = r.mahall === 'jazm' ? ['none', ...shuffle(['raf', 'nasb', 'jarr']).slice(0, 2), 'jazm'] : ['none', 'raf', 'nasb', 'jarr'];
      out.push(card({
        ...base, id: `ss:mahall:${r.id}`, prompt: 'Has the marked clause a place in iʿrāb — and which?',
        options: set.map((k) => places.get(k)?.label ?? k), answer: ans.label,
        note: { en: roleLabel(r.role_key), ar: roles.get(r.role_key ?? '')?.labelAr ?? '' }, explanation: cite(r),
      }, `mahall:${r.id}`, `${line}\n${marked} — its place in iʿrāb?`, `${ans.label} · ${roleLabel(r.role_key)}\n${r.statement_ar}`));
    } else if (c.ask === 'ss_role') {
      const r = c.row as Reading;
      const allowed = new Set([r.role_key!, ...parseJson<string[]>(r.alt_roles_json, [])]);
      // whatever any book says of this clause is never a wrong answer
      for (const o of others.filter((o) => o.clause_id === r.clause_id)) { if (o.role_key) allowed.add(o.role_key); }
      const fam = family(r.role_key!);
      const sib = shuffle(roleKeys.filter((k) => family(k) === fam && !allowed.has(k)));
      const rest = shuffle(roleKeys.filter((k) => family(k) !== fam && family(k) !== 'follower' && !allowed.has(k)));
      const wrong = [...sib, ...rest].slice(0, 3);
      if (wrong.length < 3) continue;
      const alts = parseJson<string[]>(r.alt_roles_json, []).filter((k) => roles.has(k));
      out.push(card({
        ...base, id: `ss:role:${r.id}`, prompt: 'What role does the marked clause play?',
        options: shuffle([r.role_key!, ...wrong]).map(roleLabel), answer: roleLabel(r.role_key),
        note: { en: roleLabel(r.role_key), ar: roles.get(r.role_key!)?.labelAr ?? '' },
        explanation: `${cite(r)}${alts.length ? `\nIt also allows: ${alts.map(roleLabel).join('; ')}` : ''}`,
      }, `role:${r.id}`, `${line}\n${marked} — its role?`, `${roleLabel(r.role_key)}\n${r.statement_ar}`));
    } else if (c.ask === 'ss_books') {
      const r = c.row as Reading & { j_role: string; j_statement: string };
      const said = others.filter((o) => o.clause_id === r.clause_id);
      // what this book says of the clause, its first reading and any it allows, is never a wrong answer
      const named = new Set([r.role_key!, ...parseJson<string[]>(r.alt_roles_json, [])]);
      const fam = family(r.role_key!);
      const wrong = uniq([r.j_role, ...shuffle(roleKeys.filter((k) => family(k) === fam)), ...shuffle(roleKeys.filter((k) => family(k) !== 'follower'))])
        .filter((k) => !named.has(k)).slice(0, 3);
      if (wrong.length < 3 || named.has(r.j_role)) continue;
      out.push(card({
        ...base, id: `ss:books:${r.id}`,
        prompt: `${bookName('qul_jadwal_irab_quran').split(',').pop()!.trim()} reads the marked clause as ${roleLabel(r.j_role)}. How does ${bookName(r.source_slug)} read it?`,
        options: shuffle([r.role_key!, ...wrong]).map(roleLabel), answer: roleLabel(r.role_key),
        note: { en: roleLabel(r.role_key), ar: roles.get(r.role_key!)?.labelAr ?? '' },
        explanation: said.map(cite).join('\n'),
      }, `books:${r.id}`, `${line}\n${marked} — ${bookName(r.source_slug)}?`, `${roleLabel(r.role_key)}\n${said.map(cite).join('\n')}`));
    } else if (c.ask === 'ss_ellipsis') {
      const r = c.row;
      const k = ellipsisKey.get(String(r.ellipsis_type));
      const ans = k ? ellipses.get(k) : undefined;
      if (!k || !ans) continue;
      const wrong = shuffle([...ellipses.keys()].filter((x) => x !== k)).slice(0, 3).map((x) => ellipses.get(x)!.label);
      const derived = String(r.source_basis ?? '').startsWith('derived');
      const said = derived ? `${r.note_md} — ${bookName('qul_jadwal_irab_quran')}` : [r.rhetorical_effect, r.note_md && !String(r.note_md).startsWith('{') ? r.note_md : null].filter(Boolean).join('\n') + ` — ${curatedName}`;
      out.push(card({
        ...base, id: `ss:ellipsis:${r.id}`, prompt: 'Something is left unsaid in the marked words. What is elided?',
        options: shuffle([ans.label, ...wrong]), answer: ans.label, note: { en: ans.label, ar: String(r.elided_element ?? ans.labelAr ?? '') },
        explanation: `Supplied: ${r.elided_element}\n${said}`,
      }, `ellipsis:${r.id}`, `${line}\n${marked} — what is elided?`, `${ans.label}: ${r.elided_element}`));
    } else if (c.ask === 'ss_nuance') {
      const r = c.row;
      if (r.lx_nuance_type_ref) {
        const id = String(r.lx_nuance_type_ref);
        const fam = id.split(':').slice(0, 2).join(':');
        const pool = shuffle([...term.keys()].filter((x) => x !== id && x.startsWith(fam)));
        const wrong = uniq([...pool, ...shuffle([...term.keys()].filter((x) => x !== id))]).slice(0, 3).map(figureLabel);
        if (wrong.length < 3) continue;
        out.push(card({
          ...base, id: `ss:nuance:${r.id}`, prompt: 'Which figure of balāgha does al-Jadwal find in the marked words?',
          options: shuffle([figureLabel(id), ...wrong]), answer: figureLabel(id),
          note: { en: cap(term.get(id)?.name_en ?? ''), ar: term.get(id)?.name_ar ?? '' },
          explanation: `${r.nuance_text_ar} — ${bookName('qul_jadwal_irab_quran')}`,
        }, `nuance:${r.id}`, `${line}\n${marked} — which figure?`, `${figureLabel(id)}\n${r.nuance_text_ar}`));
      } else {
        const text = String(r.nuance_text ?? '');
        if (!text || text.length > 220) continue;
        const same = curatedNuances.filter((x) => x.id !== r.id && x.nuance_text !== text);
        const wrong = uniq([...shuffle(same.filter((x) => x.nuance_type === r.nuance_type)), ...shuffle(same)].map((x) => x.nuance_text)).slice(0, 3);
        if (wrong.length < 3) continue;
        out.push(card({
          ...base, id: `ss:nuance:${r.id}`, prompt: 'Which reading of its force fits the marked words?',
          options: shuffle([text, ...wrong]), answer: text, note: { en: cap(String(r.nuance_type ?? '').replace(/_/g, ' ')), ar: '' },
          explanation: `${r.nuance_text_ar ?? ''} — ${curatedName}`.trim(),
        }, `nuance:${r.id}`, `${line}\n${marked} — its force?`, text));
      }
    } else if (c.ask === 'ss_buildup') {
      const p = c.row as { id: string; surah: number; ayah_from: number; ayah_to: number; final_fluent_en: string };
      const st = steps.filter((s) => s.passage_id === p.id);
      if (st.length < 3) continue;
      const first = ayat.get(`${p.surah}:${p.ayah_from}`), last = ayat.get(`${p.surah}:${p.ayah_to}`);
      const audio = first?.audio && last?.audio && first.audio.url === last.audio.url ? { url: first.audio.url, start: first.audio.start, end: last.audio.end } : first?.audio ?? null;
      const order = st.map((_, i) => i);
      let sh = shuffle(order);
      for (let k = 0; k < 4 && sh.every((v, i) => v === i); k++) sh = shuffle(order);
      const range = p.ayah_to > p.ayah_from ? `${p.surah}:${p.ayah_from}–${p.ayah_to}` : `${p.surah}:${p.ayah_from}`;
      out.push(card({
        id: `ss:buildup:${p.id}`, kind: 'dialogue', ask: 'ss_buildup', audio,
        prompt: `${range} — order the translation's steps, from the first to the last`,
        dialogue: st.map((s) => ({ speaker: null, ar: String(s.added_en ?? '').trim(), en: [s.added_en, s.connector_en].filter(Boolean).join(' — '), clip: null })),
        shuffled: sh, en: p.final_fluent_en, source: { workId: `QR:SURAH:${p.surah}`, title: `${a.surahName} ${range}`, level: null },
      }, `buildup:${p.id}`, `${range} — build the translation`, st.map((s) => s.added_en).join(' ')));
    } else if (c.ask === 'ss_why') {
      const r = c.row;
      const k = driverKey.get(String(r.driver_kind));
      const ans = k ? drivers.get(k) : undefined;
      const rendered = parseJson<{ en?: string }>(String(r.rendered_json ?? ''), {});
      const why = parseJson<{ en?: string; ar?: string }>(String(r.rationale_json ?? ''), {});
      if (!k || !ans || !rendered.en || !why.en) continue;
      const wrong = shuffle([...drivers.keys()].filter((x) => x !== k)).slice(0, 3).map((x) => drivers.get(x)!.label);
      if (wrong.length < 3) continue;
      out.push(card({
        ...base, id: `ss:why:${r.id}`, prompt: `Why is ${r.target_span_ar} rendered “${rendered.en}”?`,
        options: shuffle([ans.label, ...wrong]), answer: ans.label, note: { en: ans.label, ar: ans.labelAr ?? '' },
        explanation: `${cap(why.en)}${why.ar ? `\n${why.ar}` : ''} — ${curatedName}`,
      }, `why:${r.id}`, `${line}\n${r.target_span_ar} → “${rendered.en}” — why?`, `${ans.label}\n${why.en}`));
    }
  }
  return out;
}

/// The marked words' positions in the āyah (word_index from … to), or none when the row gives no span.
function spanOf(a: Ayah, from: number | null, to: number | null): number[] {
  if (!from) return [];
  const i = a.ws.findIndex((w) => w.word_index === from);
  const j = a.ws.findIndex((w) => w.word_index === (to && to >= from ? to : from));
  return i < 0 || j < i ? [] : Array.from({ length: j - i + 1 }, (_, k) => i + k);
}

/// What there is to drill: the clauses al-Jadwal places, the ellipses and nuances, the build-ups and decisions.
export async function ssCount(env: QuranEnv): Promise<number> {
  const r = await query<{ n: number }>(env.DB_QR,
    `SELECT (SELECT COUNT(*) FROM qr_ss_clause_reading WHERE is_backbone = 1 AND clause_id IS NOT NULL)
          + (SELECT COUNT(*) FROM qr_ss_clause_reading WHERE is_backbone = 0 AND agrees = 0 AND clause_id IS NOT NULL)
          + (SELECT COUNT(*) FROM qr_ss_ellipsis_event) + (SELECT COUNT(*) FROM qr_ss_scope_nuance)
          + (SELECT COUNT(*) FROM qr_ss_translation_passage) + (SELECT COUNT(*) FROM qr_ss_translation_decision WHERE status = 'live') AS n`);
  return r[0]?.n ?? 0;
}
