import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { byKey, type Label } from '../lib/labels';
import { loadAyat, withCard, levelOf, interleave, shuffle, uniq, type Ayah, type Band, type Drill, type Scope } from './practice-kit';

// ── A surah's near-synonyms, key terms and expressions (QR skills 'nearsyn', 'keyterm', 'expression') ──
// Where each stands is precomputed, word by word (qr_061 qr_drill_anchor; kmaps-resources
// scripts/quran/surah_expr_drills.py): the furūq set members the surah uses, Sinai's key terms and the
// āyāt his articles cite, and every expression the sources record — Mir's verbal idioms, the verb frames
// (Mir's verb + particle, the curated frames, ʿUḍayma's form meanings), Ibn ʿĀshūr's and the passage
// studies' expressions, Sinai's verbal idioms. What the sources SAY is read from AL as the drill is made:
// the set and its notes (/al/drill/nearsyn), Sinai's entry (/al/drill/keyterms), and how Lisān, the Tāj,
// Lane and al-Rāghib define each word (/al/drill/defs, through every key its root is filed under).
// Every drill stands in its āyah (the word marked or blanked, al-ʿAfāsī's recitation) and files its card
// (module QR). The asks each level has are data: qr_study_label, skill.extra_json.levels.
//
//   nearsyn     L1 ns_which · L2 ns_meaning · L3 ns_where, ns_contrast
//   keyterm     L1 kt_gloss · L2 kt_form, kt_word · L3 kt_point, kt_lane
//   expression  L1 ex_meaning · L2 ex_particle, ex_verb, ex_source · L3 ex_range, ex_where, ex_note
// A furūq set that is an unreviewed draft (most are: AI-assisted) says so in every drill made from it.

type Anchor = { id: string; family: string; source: string; ref: string; grp: string | null; surah: number; ayah: number;
                word_index: number | null; word_to: number | null; word_text: string | null; lemma: string | null; root: string | null;
                al_root: string | null; match: string; head_ar: string | null; label_en: string | null; note: string | null; status: string | null };
type Member = { id: string; ar: string; bare: string | null; root: string | null; gloss: string | null; note: string | null;
                contrast: string | null; rule: string | null; pattern: string | null; status: string | null };
type NSet = { name: string; nameAr: string | null; summary: string | null; sourceStatus: string | null; reviewStatus: string | null;
              confidence: string | null; members: Member[] };
type Def = { source: string; text: string; page: number | null; key: string };
type Entry = { root: string; filedUnder: string; page: number | null; terms: Array<{ t: string; ar: string | null; gloss: string | null }>;
               excerpt: string | null; source: string };
type Skill = 'nearsyn' | 'keyterm' | 'expression';

const FAMILIES: Skill[] = ['nearsyn', 'keyterm', 'expression'];
const SOURCE: Record<string, { en: string; ar: string; color: string }> = {
  furuq: { en: 'Furūq · near-synonyms', ar: 'الفروق', color: '#4FB3A9' },
  sinai_key_terms: { en: 'Sinai, Key Terms', ar: 'سيناي', color: '#6D9DC5' },
  sinai_cite: { en: 'Sinai, Key Terms', ar: 'سيناي', color: '#6D9DC5' },
  mir_verbal_idioms: { en: 'Mir, Verbal Idioms', ar: 'مير', color: '#F4A261' },
  adima_dirasat: { en: 'ʿUḍayma, Dirāsāt', ar: 'عضيمة', color: '#B388EB' },
  kmaps_tadiya: { en: 'K-Maps verb frames', ar: 'التعدية', color: '#81B29A' },
  ibn_ashur: { en: 'Ibn ʿĀshūr, al-Taḥrīr', ar: 'ابن عاشور', color: '#E07A5F' },
  kmaps_passage_study: { en: 'K-Maps passage study', ar: 'دراسة المقطع', color: '#D8B657' },
};
const srcOf = (s: string) => SOURCE[s] ?? { en: s.replace(/_/g, ' '), ar: s, color: '#D8B657' };
const PARTICLES: Record<string, string> = { ب: 'بِـ', علي: 'عَلَى', في: 'فِي', من: 'مِنْ', الي: 'إِلَى', ل: 'لِـ', عن: 'عَنْ', مع: 'مَعَ', ك: 'كَـ' };

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const fold = (w: string | null | undefined) => (w ?? '').replace(/ی/g, 'ي').replace(MARKS, '').replace(/[ٱأإآءؤئ]/g, 'ا')
  .replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^ء-ي]/g, '');
const spaced = (r: string | null) => fold(r).replace(/\s+/g, ''); // a root is shown joined (نزل), never ن ز ل
const clip = (t: string | null | undefined, n = 220) => { const s = (t ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + ' …' : s; };
const distinct = (xs: string[]) => { const seen = new Set<string>(); return xs.filter((x) => { const k = x.trim().toLowerCase(); if (!x || seen.has(k)) return false; seen.add(k); return true; }); };
const distinctAr = (xs: string[]) => { const seen = new Set<string>(); return xs.filter((x) => { const k = fold(x); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
/// a scholar's sentence as an option: the āyah numbers it cites hidden, so the choice is made on what it says
const unref = (t: string) => t.replace(/\bQ\s*(?=\d)/g, '').replace(/\(?\b\d{1,3}:\d{1,3}(?:\s?[.–-]\s?\d{1,3})*\)?/g, '[…]');
const GAP = /\[(…|\.\.\.)\]/g;

/// an AL read, asked a second time when the first fails (the linguistic DB queues reads under load)
async function al<T>(env: QuranEnv, path: string): Promise<T> {
  if (!env.AR_LINGUISTICS) throw new Error('no AL binding');
  for (let i = 0; ; i++) {
    const j = await env.AR_LINGUISTICS.fetch(`https://al${path}`).then((r) => r.json() as Promise<{ ok?: boolean; data?: T }>).catch(() => null);
    if (j?.data) return j.data;
    if (i >= 1) throw new Error(`AL ${path.split('?')[0]} failed`);
    await new Promise((r) => setTimeout(r, 400));
  }
}

const scopeSql = (s: Scope) => s.surah === null ? { sql: '1=1', args: [] as number[] }
  : s.from && s.to ? { sql: 'surah = ? AND ayah BETWEEN ? AND ?', args: [s.surah, s.from, s.to] }
  : { sql: 'surah = ?', args: [s.surah] };

async function anchors(env: QuranEnv, family: Skill, scope: Scope, extra = '', k = 400) {
  const w = scopeSql(scope);
  return query<Anchor>(env.DB_QR, `SELECT * FROM qr_drill_anchor WHERE family = ? AND ${w.sql} ${extra} ORDER BY random() LIMIT ?`,
    [family, ...w.args, k]);
}

/// a few words round a word of an āyah, for an option that names a place: "20:69 · … كَيْدُ سَاحِرٍ …"
async function snippets(env: QuranEnv, places: Array<{ surah: number; ayah: number; word_index: number | null }>) {
  const pairs = uniq(places.map((p) => `${p.surah}:${p.ayah}`)).map((k) => k.split(':').map(Number));
  if (!pairs.length) return new Map<string, string>();
  const ws = await query<{ surah: number; ayah: number; word_index: number; word_text: string }>(env.DB_QR,
    `SELECT surah, ayah, word_index, word_text FROM qr_word_occurrence WHERE (surah, ayah) IN
       (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?)) ORDER BY surah, ayah, word_index`, [JSON.stringify(pairs)]);
  const of = new Map<string, typeof ws>();
  for (const w of ws) of.set(`${w.surah}:${w.ayah}`, [...(of.get(`${w.surah}:${w.ayah}`) ?? []), w]);
  const out = new Map<string, string>();
  for (const p of places) {
    const all = of.get(`${p.surah}:${p.ayah}`) ?? [];
    const i = Math.max(0, all.findIndex((w) => w.word_index === p.word_index));
    const from = Math.max(0, i - 3), to = Math.min(all.length, i + 4);
    out.set(`${p.surah}:${p.ayah}:${p.word_index}`, `${p.surah}:${p.ayah} · ${from > 0 ? '… ' : ''}${all.slice(from, to).map((w) => w.word_text).join(' ')}${to < all.length ? ' …' : ''}`);
  }
  return out;
}

/// the drill's common part: the āyah as heard, the word(s) marked, where it stands, the source's badge
function base(a: Ayah, an: Anchor, extra: Record<string, unknown> = {}) {
  const i = an.word_index != null ? a.ws.findIndex((w) => w.word_index === an.word_index) : -1;
  const j = an.word_to != null ? a.ws.findIndex((w) => w.word_index === an.word_to) : -1;
  const s = srcOf(an.source);
  return {
    idx: i, idxTo: j,
    drill: { script: 'quran', audio: a.audio, words: a.words, en: a.en, span: [i, j].filter((x) => x >= 0),
             source: { workId: `QR:SURAH:${a.surah}`, title: a.title, level: null },
             badges: [{ label: s.en, labelAr: s.ar, color: s.color }], ...extra } as Drill,
  };
}

const line = (a: Ayah) => a.ws.map((w) => w.word_text).join(' ');

/// how far a furūq set may be trusted, said plainly in every drill made from it
function trust(set: NSet | undefined) {
  if (!set) return 'The set is not found in the linguistic record.';
  const reviewed = ['reviewed', 'live'].includes(set.reviewStatus ?? '');
  const how = set.sourceStatus === 'ai_assisted' ? 'AI-assisted' : set.sourceStatus?.replace(/_/g, ' ') ?? 'unsourced';
  return reviewed ? `A reviewed set (${how}).` : `An unreviewed ${how} draft set (${set.reviewStatus ?? 'draft'}) — its grouping is not yet checked.`;
}

// ── entry point ─────────────────────────────────────────────────────────────

export async function surahLexDrills(env: QuranEnv, skill: string, n: number, scope: Scope, lv: Record<string, unknown>,
                                     L: Record<string, Label[]>): Promise<Drill[]> {
  const { band, asks } = levelOf(L, skill, lv);
  const make = skill === 'nearsyn' ? nearsynDrills : skill === 'keyterm' ? keytermDrills : expressionDrills;
  return make(env, n, scope, asks, band, L);
}

/// the places each family has, for the practice home
export async function surahLexCounts(env: QuranEnv): Promise<Record<string, number>> {
  const rows = await query<{ family: string; n: number }>(env.DB_QR,
    `SELECT family, COUNT(*) AS n FROM qr_drill_anchor WHERE word_index IS NOT NULL OR family <> 'keyterm' GROUP BY family`);
  return Object.fromEntries(FAMILIES.map((f) => [f, rows.find((r) => r.family === f)?.n ?? 0]));
}

type Make = (env: QuranEnv, n: number, scope: Scope, asks: string[], band: Band, L: Record<string, Label[]>) => Promise<Drill[]>;

/// each ask's drills built from the pool in turn, one per place, then mixed
function mixed(piles: Drill[][], n: number) {
  const seen = new Set<string>();
  return interleave(piles.map((p) => p.filter((d) => { const k = String(d.id); if (seen.has(k)) return false; seen.add(k); return true; })), n);
}

// ── near-synonyms (furūq) ───────────────────────────────────────────────────

const nearsynDrills: Make = async (env, n, scope, asks, band, L) => {
  const pool = await anchors(env, 'nearsyn', scope, 'AND word_index IS NOT NULL', 600);
  if (!pool.length) return [];
  // one place per set and āyah, the sets spread
  const bySet = new Map<string, Anchor[]>();
  for (const a of pool) bySet.set(a.grp!, [...(bySet.get(a.grp!) ?? []), a]);
  // as many sets as a round can use (a set's members, their places and the lexica's texts are read for each)
  const setIds = shuffle([...bySet.keys()]).slice(0, Math.min(24, n * 3));
  const [nsets, placed] = await Promise.all([
    al<{ sets: Record<string, NSet> }>(env, `/al/drill/nearsyn?sets=${encodeURIComponent(setIds.join(','))}`).catch(() => ({ sets: {} as Record<string, NSet> })),
    // every member of these sets that the Qurʾān uses, and where (for "where else")
    query<Anchor>(env.DB_QR, `SELECT * FROM qr_drill_anchor WHERE family = 'nearsyn' AND grp IN (SELECT value FROM json_each(?))
                               ORDER BY (match = 'evidence') DESC, random() LIMIT 1500`, [JSON.stringify(setIds)]),
  ]);
  // only a reviewed set is dealt: a draft grouping is not yet a fact to drill a learner on
  const sets = Object.fromEntries(Object.entries(nsets.sets ?? {})
    .filter(([, set]) => ['reviewed', 'live'].includes(set.reviewStatus ?? ''))) as Record<string, NSet>;
  const placedOf = new Map<string, Anchor[]>();
  for (const a of placed) placedOf.set(a.ref, [...(placedOf.get(a.ref) ?? []), a]);
  const memberOf = (ref: string) => ref.split('|')[1];
  // the lexica's definitions of every member of these sets (roots from AL, else where the Qurʾān has it)
  const rootOfMember = new Map<string, string>();
  for (const a of placed) if (a.root) rootOfMember.set(memberOf(a.ref), a.root);
  const want: string[] = [];
  for (const sid of setIds) for (const m of (sets[sid]?.members ?? []).slice(0, 6)) {
    const r = m.root ?? rootOfMember.get(m.id);
    if (r) want.push(`${r}~${m.ar}`);
  }
  // (the Arabic lexica's long entries only where the level asks for the definitions themselves; else Lane's senses)
  const srcs = asks.includes('ns_meaning') ? 'lane,mufradat,lisan' : 'lane';
  const defs: Record<string, Def[]> = want.length
    ? (await al<{ defs: Record<string, Def[]> }>(env, `/al/drill/defs?src=${srcs}&w=${encodeURIComponent(uniq(want).slice(0, 60).join(','))}`)
      .catch(() => ({ defs: {} as Record<string, Def[]> }))).defs ?? {}
    : {};
  // the Tāj (the longest entries of all) only for the words the others leave undefined
  const bare = asks.includes('ns_meaning') ? uniq(want).filter((k) => !(defs[k] ?? []).length).slice(0, 12) : [];
  if (bare.length) {
    const taj = (await al<{ defs: Record<string, Def[]> }>(env, `/al/drill/defs?src=taj&w=${encodeURIComponent(bare.join(','))}`)
      .catch(() => ({ defs: {} as Record<string, Def[]> }))).defs ?? {};
    for (const [k, v] of Object.entries(taj)) if (v.length) defs[k] = [...(defs[k] ?? []), ...v];
  }
  const defsOf = (m: Member) => { const r = m.root ?? rootOfMember.get(m.id); return r ? defs[`${r}~${m.ar}`] ?? [] : []; };
  const titles = byKey(L.context);
  const context = (set: NSet, usedId: string) => ({
    synonyms: { title: titles.get('synonyms')?.label ?? null, set: `${set.name} — ${trust(set)}`,
      items: set.members.slice(0, 8).map((m) => ({ ar: m.ar, gloss: m.gloss, note: [m.note, m.contrast, m.rule].filter(Boolean).join(' — ') || null,
                                                   used: m.id === usedId, lexica: defsOf(m).map((d) => ({ source: d.source, text: d.text, page: d.page })) })) },
  });
  const sideBySide = (set: NSet, ms: Member[]) => ms.map((m) => {
    const d = defsOf(m)[0];
    const note = [m.note, m.contrast, m.rule].filter(Boolean).join(' — ');
    return `${m.ar}: ${note || (d ? `${d.source} — ${clip(d.text, 160)}` : 'no lexicon here defines it apart')}`;
  }).join('\n');

  // the places, one per set and āyah
  const seen = new Set<string>();
  const places = shuffle(pool).filter((a) => { const k = `${a.grp}:${a.surah}:${a.ayah}`; if (!sets[a.grp!] || seen.has(k)) return false; seen.add(k); return true; });
  const ayat = await loadAyat(env, places.slice(0, n * 5).map((a) => [a.surah, a.ayah]));
  // "where else": the other members' places (and the word's own, and some other āyāt of the scope) as options
  const whereRows = new Map<string, { answer: Anchor; wrong: Anchor[]; other: Member }>();
  if (asks.includes('ns_where')) {
    for (const a of places.slice(0, n * 3)) {
      const set = sets[a.grp!];
      const used = memberOf(a.ref);
      const others = shuffle((set?.members ?? []).filter((m) => m.id !== used && (placedOf.get(`NS:${a.grp}|${m.id}`) ?? []).some((p) => `${p.surah}:${p.ayah}` !== `${a.surah}:${a.ayah}`)));
      const other = others[0];
      if (!other) continue;
      const answer = (placedOf.get(`NS:${a.grp}|${other.id}`) ?? []).find((p) => `${p.surah}:${p.ayah}` !== `${a.surah}:${a.ayah}`)!;
      // wrong places: the word itself elsewhere, and other āyāt of the scope — never an āyah where the near-synonym stands
      const yAyat = new Set((placedOf.get(`NS:${a.grp}|${other.id}`) ?? []).map((p) => `${p.surah}:${p.ayah}`));
      const here = `${a.surah}:${a.ayah}`;
      const own = (placedOf.get(a.ref) ?? []).filter((p) => `${p.surah}:${p.ayah}` !== here && !yAyat.has(`${p.surah}:${p.ayah}`));
      const stray = pool.filter((p) => p.grp !== a.grp && `${p.surah}:${p.ayah}` !== here && !yAyat.has(`${p.surah}:${p.ayah}`));
      const wrong = [...shuffle(own).slice(0, 2), ...shuffle(stray)].filter((x, i, xs) => xs.findIndex((y) => y.surah === x.surah && y.ayah === x.ayah) === i
        && `${x.surah}:${x.ayah}` !== `${answer.surah}:${answer.ayah}`).slice(0, 3);
      if (wrong.length >= 2) whereRows.set(a.id, { answer, wrong, other });
    }
  }
  const snip = await snippets(env, [...whereRows.values()].flatMap((w) => [w.answer, ...w.wrong]));
  const key = (p: Anchor) => snip.get(`${p.surah}:${p.ayah}:${p.word_index}`) ?? `${p.surah}:${p.ayah}`;

  const piles: Drill[][] = asks.map(() => []);
  for (const a of places) {
    const ay = ayat.get(`${a.surah}:${a.ayah}`);
    const set = sets[a.grp!];
    if (!ay || !set) continue;
    const used = set.members.find((m) => m.id === memberOf(a.ref));
    if (!used) continue;
    const { idx, drill: b } = base(ay, a);
    if (idx < 0) continue;
    const others = distinctAr([used.ar, ...shuffle(set.members.filter((m) => m.id !== used.id)).map((m) => m.ar)]).slice(1);
    const card = (d: Drill, ask: string, front: string, back: string) => withCard(d, { ref: `QR:nearsyn:${ask}:${a.id}`, type: 'vocabulary', kind: 'nearsyn',
      front, back, surah: a.surah, ayah: a.ayah, series: set.name, band });
    asks.forEach((ask, k) => {
      if (piles[k].length >= n) return;
      if (ask === 'ns_which' && others.length >= 1) {
        const opts = shuffle([used.ar, ...others.slice(0, 3)]);
        piles[k].push(card({ ...b, id: `nearsyn:which:${a.id}`, kind: 'nuance', ask, blank: idx, span: [], answer: used.ar, options: opts,
          prompt: `${set.name}${set.nameAr ? ` · ${set.nameAr}` : ''}`, explanation: `${ay.ws[idx].word_text} is ${used.ar}. ${trust(set)}\n${sideBySide(set, set.members.slice(0, 5))}`,
          context: context(set, used.id) }, ask, line(ay).replace(ay.ws[idx].word_text, '＿＿＿') + `\n${set.name}: ${opts.join('، ')}`, `${used.ar}\n${trust(set)}`));
      }
      if (ask === 'ns_meaning') {
        const mine = defsOf(used);
        // one lexicon for every option where it can be (Lane first, then al-Rāghib, Lisān, the Tāj)
        const order = ['Lane', 'al-Rāghib, al-Mufradāt', 'Lisān al-ʿArab', 'Tāj al-ʿArūs'];
        const pickFrom = order.map((src) => ({ src, ans: mine.find((d) => d.source === src),
          wrong: set.members.filter((m) => m.id !== used.id).map((m) => defsOf(m).find((d) => d.source === src)).filter((d): d is Def => !!d) }))
          .find((x) => x.ans && x.wrong.length >= 1);
        const ans = pickFrom?.ans ?? mine[0];
        const wrong = pickFrom?.wrong ?? set.members.filter((m) => m.id !== used.id).map((m) => defsOf(m)[0]).filter((d): d is Def => !!d);
        const opts = distinct([clip(ans?.text, 200), ...wrong.map((d) => clip(d.text, 200))]).filter(Boolean);
        if (ans && opts.length >= 2) {
          const shown = opts.slice(0, 4);
          piles[k].push(card({ ...b, id: `nearsyn:meaning:${a.id}`, kind: 'feature', ask, span: [idx],
            prompt: `The marked word is ${used.ar}. Which is its definition${pickFrom ? ` in ${pickFrom.src}` : ''} — not a near-synonym's (${others.slice(0, 3).join('، ')})?`,
            options: shuffle(shown), answer: clip(ans.text, 200), note: { en: set.name, ar: used.ar },
            explanation: `${ans.source}${ans.page ? `, p. ${ans.page}` : ''}: ${ans.text}\n${trust(set)}\n${sideBySide(set, set.members.slice(0, 5))}`,
            context: context(set, used.id) }, ask, `${used.ar} — ${set.name}: which definition?`, `${ans.source}: ${ans.text}`));
        }
      }
      if (ask === 'ns_where') {
        const w = whereRows.get(a.id);
        if (w) {
          const answer = key(w.answer);
          const opts = distinct([answer, ...w.wrong.map(key)]);
          if (opts.length >= 3) piles[k].push(card({ ...b, id: `nearsyn:where:${a.id}`, kind: 'feature', ask, span: [idx],
            prompt: `The marked word is ${used.ar}. Where does the Qurʾān use its near-synonym ${w.other.ar} (${set.name})?`,
            options: shuffle(opts), answer, note: { en: set.name, ar: `${used.ar} · ${w.other.ar}` },
            explanation: `${w.other.ar} at ${w.answer.surah}:${w.answer.ayah}${w.answer.match === 'evidence' ? ' — an āyah the set itself cites' : ''}.\n`
              + `What tells them apart:\n${sideBySide(set, [used, w.other])}\n${trust(set)}`,
            context: context(set, used.id) }, ask, `${used.ar} — where is ${w.other.ar}?`, `${answer}`));
        }
      }
      if (ask === 'ns_contrast') {
        const noteOf = (m: Member) => [m.note, m.contrast, m.rule].filter(Boolean).join(' — ');
        const mine = noteOf(used);
        const wrong = set.members.filter((m) => m.id !== used.id).map(noteOf).filter(Boolean);
        if (mine && wrong.length >= 1) {
          const opts = distinct([clip(mine, 220), ...wrong.map((x) => clip(x, 220))]).slice(0, 4);
          if (opts.length >= 2) piles[k].push(card({ ...b, id: `nearsyn:contrast:${a.id}`, kind: 'feature', ask, span: [idx],
            prompt: `What sets ${used.ar} apart from its near-synonyms (${others.slice(0, 3).join('، ')})?`, options: shuffle(opts), answer: clip(mine, 220),
            note: { en: set.name, ar: used.ar }, explanation: `${sideBySide(set, set.members.slice(0, 6))}\n${trust(set)}`, context: context(set, used.id) },
            ask, `${used.ar} vs ${others.slice(0, 3).join('، ')}`, mine));
        }
      }
    });
    if (piles.every((p) => p.length >= n)) break;
  }
  return mixed(piles, n);
};

// ── Sinai's key terms ───────────────────────────────────────────────────────

const keytermDrills: Make = async (env, n, scope, asks, band, L) => {
  const wantCite = asks.includes('kt_point');
  const [pool, cites] = await Promise.all([
    anchors(env, 'keyterm', scope, `AND source = 'sinai_key_terms' AND word_index IS NOT NULL`, 500),
    wantCite ? anchors(env, 'keyterm', scope, `AND source = 'sinai_cite'`, 300) : Promise.resolve([] as Anchor[]),
  ]);
  if (!pool.length && !cites.length) return [];
  const seen = new Set<string>();
  const places = shuffle(pool).filter((a) => { const k = `${a.ref}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .concat(shuffle(pool).filter((a) => !seen.has(a.id) && (seen.add(a.id), true))).slice(0, n * 6);
  const citeSeen = new Set<string>();
  const citePlaces = shuffle(cites).filter((a) => { const k = `${a.surah}:${a.ayah}:${a.grp}`; if (citeSeen.has(k)) return false; citeSeen.add(k); return true; }).slice(0, n * 3);
  const entryIds = uniq([...places, ...citePlaces].map((a) => a.grp!)).slice(0, 40);
  // glosses to choose among: the scope's terms first, then any
  const [entriesRes, glossPool, otherCites] = await Promise.all([
    al<{ entries: Record<string, Entry> }>(env, `/al/drill/keyterms?entries=${encodeURIComponent(entryIds.join(','))}`).catch(() => ({ entries: {} as Record<string, Entry> })),
    query<{ grp: string; note: string; head_ar: string; label_en: string }>(env.DB_QR,
      `SELECT grp, note, head_ar, label_en FROM qr_drill_anchor WHERE family = 'keyterm' AND source = 'sinai_key_terms' AND label_en IS NOT NULL
         AND label_en NOT LIKE '%~%' GROUP BY ref ORDER BY random() LIMIT 60`),
    wantCite ? query<Anchor>(env.DB_QR, `SELECT * FROM qr_drill_anchor WHERE family = 'keyterm' AND source = 'sinai_cite' ORDER BY random() LIMIT 40`)
      : Promise.resolve([] as Anchor[]),
  ]);
  const entries = entriesRes.entries ?? {};
  const good = (g: string | null) => !!g && !g.includes('~') && g.replace(/[^a-z]/gi, '').length >= 3;
  // Lane beside Sinai: Lane's rendering of each term's word (and of the others, as options)
  const needLane = asks.includes('kt_lane') || asks.includes('kt_gloss');
  const laneWant = needLane ? uniq(places.filter((a) => a.root && a.head_ar).map((a) => `${a.root}~${a.head_ar}`)).slice(0, 50) : [];
  const lane = laneWant.length ? (await al<{ defs: Record<string, Def[]> }>(env, `/al/drill/defs?src=lane&w=${encodeURIComponent(laneWant.join(','))}`)
    .catch(() => ({ defs: {} as Record<string, Def[]> }))).defs ?? {} : {};
  const laneOf = (a: Anchor) => (a.root && a.head_ar ? lane[`${a.root}~${a.head_ar}`]?.[0] : undefined);
  const ayat = await loadAyat(env, [...places.slice(0, n * 4), ...citePlaces].map((a) => [a.surah, a.ayah]));
  const titles = byKey(L.context);
  const sinaiCtx = (e: Entry | undefined, a: Anchor) => e ? {
    sinai: { title: titles.get('sinai')?.label ?? 'Sinai, Key Terms of the Qurʾān', terms: e.terms.map((t) => [t.ar, t.t, t.gloss].filter(Boolean).join(' — ')),
             excerpt: e.excerpt, cite: `${e.source}${e.page ? `, p. ${e.page}` : ''}` },
    lane: laneOf(a) ? { title: titles.get('lane')?.label ?? 'Lane', senses: [laneOf(a)!.text], cite: `Lane${laneOf(a)!.page ? `, p. ${laneOf(a)!.page}` : ''}` } : null,
  } : null;
  const piles: Drill[][] = asks.map(() => []);
  const scopeTerms = distinctAr(places.map((a) => a.head_ar ?? ''));
  for (const a of places) {
    const ay = ayat.get(`${a.surah}:${a.ayah}`);
    if (!ay) continue;
    const e = entries[a.grp!];
    const { idx, drill: b } = base(ay, a);
    if (idx < 0) continue;
    const translit = a.note ?? '';
    const gloss = good(a.label_en) ? a.label_en! : null;
    const ln = laneOf(a);
    const card = (d: Drill, ask: string, front: string, back: string) => withCard(d, { ref: `QR:keyterm:${ask}:${a.ref}:${a.surah}:${a.ayah}`, type: 'vocabulary',
      kind: 'keyterm', front, back, surah: a.surah, ayah: a.ayah, series: 'Sinai, Key Terms', band });
    const expl = [e?.excerpt ? `Sinai (${e.page ? `p. ${e.page}` : 'Key Terms'}): ${e.excerpt}` : null, ln ? `Lane: ${ln.text}` : null].filter(Boolean).join('\n');
    asks.forEach((ask, k) => {
      if (piles[k].length >= n) return;
      if (ask === 'kt_gloss') {
        // Sinai's own gloss only: Lane's long rendering beside short glosses gave itself away by its length
        const answer = gloss;
        if (!answer) return;
        // near misses first: the other key terms of this passage, then any (never random filler from far afield first)
        const near = places.filter((x) => x.grp !== a.grp && good(x.label_en)).map((x) => x.label_en!);
        const wrong = distinct([...shuffle(near), ...glossPool.filter((g) => g.grp !== a.grp).map((g) => g.label_en)])
          .filter((g) => g.toLowerCase() !== answer.toLowerCase()).slice(0, 3);
        if (wrong.length < 3) return;
        // the word itself, in Arabic script — no transliteration, no book named in the question
        piles[k].push(card({ ...b, id: `keyterm:gloss:${a.id}`, kind: 'idiom', ask, prompt: a.head_ar, options: shuffle([answer, ...wrong]), answer,
          note: { en: gloss ? '' : 'Lane’s rendering', ar: a.head_ar ?? '' },
          explanation: expl || null, context: sinaiCtx(e, a) }, ask, `${a.head_ar} (${translit}) — ?\n${line(ay)}`, answer));
      }
      if (ask === 'kt_form' && !a.match.includes('~root')) {
        const same = (e?.terms ?? []).map((t) => t.ar ?? '').filter(Boolean);
        const opts = distinctAr([a.head_ar ?? '', ...shuffle(same), ...shuffle(scopeTerms)]).slice(0, 4);
        if (opts.length < 3) return;
        piles[k].push(card({ ...b, id: `keyterm:form:${a.id}`, kind: 'nuance', ask, blank: idx, span: [], answer: a.head_ar, options: shuffle(opts),
          prompt: `Sinai's key term: ${translit}${gloss ? ` — “${gloss}”` : ''}`, explanation: `${ay.ws[idx].word_text} — ${a.head_ar} (${translit}).\n${expl}`,
          context: sinaiCtx(e, a) }, ask, `${line(ay).replace(ay.ws[idx].word_text, '＿＿＿')}\n${translit}`, `${a.head_ar}`));
      }
      if (ask === 'kt_word' && gloss) {
        const content = distinctAr(ay.ws.filter((w) => w.is_content_word === 1 && w.word_index !== a.word_index && fold(w.word_text).length >= 2).map((w) => w.word_text));
        if (content.length < 2) return;
        const opts = [ay.ws[idx].word_text, ...shuffle(content).slice(0, 3)];
        piles[k].push(card({ ...b, id: `keyterm:word:${a.id}`, kind: 'feature', ask, span: [], options: shuffle(opts), answer: ay.ws[idx].word_text,
          prompt: `Which word of this āyah means “${gloss}”?`, note: { en: '', ar: a.head_ar ?? '' },
          explanation: `${ay.ws[idx].word_text} — ${a.head_ar}.\n${expl}` }, ask, `${line(ay)}\nwhich is ${translit}?`, ay.ws[idx].word_text));
      }
      if (ask === 'kt_lane' && ln) {
        const wrong = distinct(places.filter((x) => x.grp !== a.grp).map((x) => laneOf(x)?.text ?? '').filter(Boolean).map((t) => clip(t, 160)))
          .filter((t) => t !== clip(ln.text, 160)).slice(0, 3);
        if (wrong.length < 2) return;
        const answer = clip(ln.text, 160);
        piles[k].push(card({ ...b, id: `keyterm:lane:${a.id}`, kind: 'feature', ask, span: [idx], options: shuffle([answer, ...wrong]), answer,
          prompt: gloss ? `Sinai glosses ${translit} as “${gloss}”. Which is Lane's rendering of ${a.head_ar}?` : `Which is Lane's rendering of ${a.head_ar} (Sinai's key term ${translit})?`,
          note: { en: translit, ar: a.head_ar ?? '' }, explanation: `Sinai: ${gloss ?? '—'}${e?.excerpt ? ` · ${e.excerpt}` : ''}\nLane${ln.page ? `, p. ${ln.page}` : ''}: ${ln.text}`,
          context: sinaiCtx(e, a) }, ask, `${a.head_ar} — Lane?`, ln.text));
      }
    });
    if (asks.filter((x) => x !== 'kt_point').every((x) => piles[asks.indexOf(x)].length >= n)) break;
  }
  // his article's point, on the āyāt it cites
  const kp = asks.indexOf('kt_point');
  if (kp >= 0) {
    for (const a of citePlaces) {
      if (piles[kp].length >= n) break;
      const ay = ayat.get(`${a.surah}:${a.ayah}`);
      if (!ay || !a.label_en) continue;
      const e = entries[a.grp!];
      const { drill: b } = base(ay, a);
      const answer = clip(unref(a.label_en), 260);
      const wrong = distinct([...cites.filter((x) => x.grp !== a.grp), ...otherCites.filter((x) => x.grp !== a.grp)].map((x) => clip(unref(x.label_en ?? ''), 260)))
        .filter((t) => t && t !== answer).slice(0, 3);
      if (wrong.length < 3) continue;
      piles[kp].push(withCard({ ...b, id: `keyterm:point:${a.id}`, kind: 'feature', ask: 'kt_point', options: shuffle([answer, ...wrong]), answer,
        prompt: `Sinai's article on ${a.note ?? spaced(a.al_root)} (${spaced(e?.root ?? a.al_root)}) cites this āyah. Which point does it make?`,
        note: { en: a.note ?? '', ar: a.head_ar ?? '' }, explanation: `Sinai, Key Terms${e?.page ? `, p. ${e.page}` : ''}: ${a.label_en}`, context: sinaiCtx(e, a) },
        { ref: `QR:keyterm:kt_point:${a.id}`, type: 'vocabulary', kind: 'keyterm', front: `${line(ay)}\nSinai on ${a.note}?`, back: a.label_en,
          surah: a.surah, ayah: a.ayah, series: 'Sinai, Key Terms', band }));
    }
  }
  return mixed(piles, n);
};

// ── expressions ─────────────────────────────────────────────────────────────

const expressionDrills: Make = async (env, n, scope, asks, band, L) => {
  const pool = await anchors(env, 'expression', scope, '', 500);
  if (!pool.length) return [];
  // the senses to choose among: the same particle's other verbs, the same verb's other senses, the rest
  const all = await query<{ grp: string; label_en: string; lemma: string | null; head_ar: string | null; source: string; surah: number; ayah: number;
                            word_index: number | null; id: string }>(env.DB_QR,
    `SELECT grp, label_en, lemma, head_ar, source, surah, ayah, word_index, id FROM qr_drill_anchor WHERE family = 'expression' AND label_en IS NOT NULL`);
  const partOf = (g: string | null) => (g ?? '').split('|')[1] ?? '';
  const rootOf = (g: string | null) => (g ?? '').split('|')[0] ?? '';
  const places = shuffle(pool).filter((a, i, xs) => xs.findIndex((x) => x.ref === a.ref && x.surah === a.surah && x.ayah === a.ayah) === i);
  const ayat = await loadAyat(env, places.slice(0, n * 8).map((a) => [a.surah, a.ayah]));
  // where else, in this sense: the same verb + particle and sense elsewhere; its other senses as the wrong places
  const whereOf = new Map<string, { answer: typeof all[0]; wrong: typeof all }>();
  if (asks.includes('ex_where')) {
    for (const a of places.slice(0, n * 4)) {
      if (!a.label_en || a.grp?.startsWith('type|')) continue;
      const same = all.filter((x) => x.grp === a.grp && x.label_en.toLowerCase() === a.label_en!.toLowerCase() && `${x.surah}:${x.ayah}` !== `${a.surah}:${a.ayah}`);
      if (!same.length) continue;
      const other = all.filter((x) => x.grp === a.grp && x.label_en.toLowerCase() !== a.label_en!.toLowerCase());
      const kin = all.filter((x) => rootOf(x.grp) === rootOf(a.grp) && x.grp !== a.grp);
      const wrong = [...shuffle(other), ...shuffle(kin), ...shuffle(all.filter((x) => partOf(x.grp) === partOf(a.grp) && rootOf(x.grp) !== rootOf(a.grp)))]
        .filter((x, i, xs) => xs.findIndex((y) => y.surah === x.surah && y.ayah === x.ayah) === i && !same.some((s) => s.surah === x.surah && s.ayah === x.ayah)
          && `${x.surah}:${x.ayah}` !== `${a.surah}:${a.ayah}`).slice(0, 3);
      if (wrong.length >= 2) whereOf.set(a.id, { answer: shuffle(same)[0], wrong });
    }
  }
  const snip = await snippets(env, [...whereOf.values()].flatMap((w) => [w.answer, ...w.wrong]));
  const placeOf = (p: { surah: number; ayah: number; word_index: number | null }) => snip.get(`${p.surah}:${p.ayah}:${p.word_index}`) ?? `${p.surah}:${p.ayah}`;
  const titles = byKey(L.context);
  const piles: Drill[][] = asks.map(() => []);
  const usedAyah = asks.map(() => new Set<string>());
  for (const a of places) {
    const ay = ayat.get(`${a.surah}:${a.ayah}`);
    if (!ay) continue;
    const { idx, idxTo, drill: b } = base(ay, a);
    const sense = a.label_en?.trim() || null;
    const src = srcOf(a.source);
    const head = (a.head_ar ?? '').trim();
    const note = a.note && (a.note.match(GAP) ?? []).length <= 2 && /[a-z]{3}/i.test(a.note) ? a.note.replace(GAP, '…') : null;
    const range = distinct(all.filter((x) => x.grp === a.grp).map((x) => x.label_en));
    const meanings = all.filter((x) => x.grp === a.grp && x.id !== a.id).slice(0, 5);
    const context = range.length > 1 || meanings.length ? {
      meanings: { title: titles.get('meanings')?.label ?? null, items: [{ en: sense ?? '', ref: `${a.surah}:${a.ayah}`, ayahAr: null, ayahEn: ay.en },
        ...meanings.map((m) => ({ en: m.label_en, ref: `${m.surah}:${m.ayah}`, ayahAr: null, ayahEn: null }))] } } : null;
    const expl = [`${src.en}${a.status && /needs_review/.test(a.status) ? ' (this entry still needs review)' : ''}: ${head}${sense ? ` — ${sense}` : ''}`, note].filter(Boolean).join('\n');
    const card = (d: Drill, ask: string, front: string, back: string) => withCard(d, { ref: `QR:expression:${ask}:${a.id}`, type: 'vocabulary', kind: 'expression',
      front, back, surah: a.surah, ayah: a.ayah, series: src.en, band });
    asks.forEach((ask, k) => {
      if (piles[k].length >= n || usedAyah[k].has(`${a.surah}:${a.ayah}:${a.grp}`)) return;
      const before = piles[k].length;
      if (ask === 'ex_meaning' && sense) {
        const isForm = a.source === 'adima_dirasat';
        const pool2 = isForm ? all.filter((x) => x.source === 'adima_dirasat') : all.filter((x) => x.grp !== a.grp && x.source !== 'adima_dirasat');
        // near misses, in tiers: the same particle's senses, then the expressions of nearby āyāt (the passage's own), then
        // the sūra's, then the same source's — each tier nearest in length first, so the answer's length gives nothing away
        const byLen = (xs: typeof pool2) => shuffle(xs).sort((x, y) => Math.abs(x.label_en.length - sense.length) - Math.abs(y.label_en.length - sense.length));
        const samePart = byLen(pool2.filter((x) => partOf(x.grp) && partOf(x.grp) === partOf(a.grp)));
        const nearby = byLen(pool2.filter((x) => x.surah === a.surah && Math.abs(x.ayah - a.ayah) <= 10));
        const inScope = byLen(pool2.filter((x) => x.surah === a.surah));
        const sameSrc = byLen(pool2.filter((x) => x.source === a.source));
        const wrong = distinct([...samePart, ...nearby, ...inScope, ...sameSrc, ...shuffle(pool2)].map((x) => x.label_en))
          .filter((x) => x.toLowerCase() !== sense.toLowerCase()).slice(0, 3);
        if (wrong.length >= 3) piles[k].push(card({ ...b, id: `expression:meaning:${a.id}`, kind: 'idiom', ask, prompt: head, options: shuffle([sense, ...wrong]),
          answer: sense, note: { en: src.en, ar: head }, explanation: expl, context }, ask, `${head}\n${line(ay)}`, `${sense}\n(${a.surah}:${a.ayah})`));
      }
      if (ask === 'ex_particle' && partOf(a.grp) && idxTo >= 0 && idx >= 0) {
        const p = PARTICLES[partOf(a.grp)] ?? partOf(a.grp);
        const opts = uniq([p, ...shuffle(Object.values(PARTICLES).filter((x) => x !== p)).slice(0, 3)]);
        piles[k].push(card({ ...b, id: `expression:particle:${a.id}`, kind: 'nuance', ask, blank: idxTo, span: [], answer: p, options: shuffle(opts),
          prompt: `${ay.ws[idx].word_text} … ?${sense ? ` — “${sense}”` : ''}`, explanation: `${ay.ws[idxTo].word_text}: ${head} takes ${p}.\n${expl}`, context },
          ask, `${line(ay).replace(ay.ws[idxTo].word_text, '＿＿＿')}\n${sense ?? head}`, `${p} — ${head}`));
      }
      if (ask === 'ex_verb' && partOf(a.grp) && a.lemma && idx >= 0 && sense && a.source !== 'adima_dirasat') {
        const verbs = distinctAr([a.lemma, ...shuffle(all.filter((x) => partOf(x.grp) === partOf(a.grp) && rootOf(x.grp) !== rootOf(a.grp) && x.lemma).map((x) => x.lemma!))]).slice(0, 4);
        if (verbs.length >= 3) piles[k].push(card({ ...b, id: `expression:verb:${a.id}`, kind: 'nuance', ask, blank: idx, span: [], answer: a.lemma, options: shuffle(verbs),
          prompt: `… ${PARTICLES[partOf(a.grp)] ?? partOf(a.grp)} — “${sense}”`, explanation: `${ay.ws[idx].word_text} (${a.lemma}): ${expl}`, context },
          ask, `${line(ay).replace(ay.ws[idx].word_text, '＿＿＿')}\n“${sense}”`, `${a.lemma} — ${head}`));
      }
      if (ask === 'ex_source') {
        const others = uniq(Object.keys(SOURCE).filter((s) => s !== 'furuq' && s !== 'sinai_cite' && srcOf(s).en !== src.en).map((s) => srcOf(s).en));
        // a source that records the same place is not a wrong answer
        const alsoHere = new Set(pool.filter((x) => x.surah === a.surah && x.ayah === a.ayah && x.id !== a.id).map((x) => srcOf(x.source).en));
        const wrong = shuffle(others.filter((x) => !alsoHere.has(x))).slice(0, 3);
        if (wrong.length >= 2) piles[k].push(card({ ...b, id: `expression:source:${a.id}`, kind: 'feature', ask, prompt: `${head}${sense ? ` — “${sense}”` : ''}: who records it?`,
          options: shuffle([src.en, ...wrong]), answer: src.en, note: { en: src.en, ar: head }, explanation: expl }, ask, `${head} — who?`, src.en));
      }
      if (ask === 'ex_range' && sense && range.length >= 3) {
        const opts = [sense, ...shuffle(range.filter((x) => x.toLowerCase() !== sense.toLowerCase())).slice(0, 3)];
        piles[k].push(card({ ...b, id: `expression:range:${a.id}`, kind: 'idiom', ask, prompt: head, options: shuffle(opts), answer: sense,
          note: { en: `${range.length} senses in ${src.en}`, ar: head }, explanation: `${expl}\nIts senses: ${range.slice(0, 8).join(' · ')}`, context },
          ask, `${head} — which sense here?\n${line(ay)}`, sense));
      }
      if (ask === 'ex_where') {
        const w = whereOf.get(a.id);
        if (w) {
          const answer = placeOf(w.answer);
          const opts = distinct([answer, ...w.wrong.map(placeOf)]);
          if (opts.length >= 3) piles[k].push(card({ ...b, id: `expression:where:${a.id}`, kind: 'feature', ask, prompt: `Where else does the Qurʾān use ${head} as “${sense}”?`,
            options: shuffle(opts), answer, note: { en: sense ?? '', ar: head },
            explanation: `${w.answer.surah}:${w.answer.ayah} — ${w.answer.label_en}. The others: ${w.wrong.map((x) => `${x.surah}:${x.ayah} ${x.label_en}`).join(' · ')}\n${expl}`, context },
            ask, `${head} “${sense}” — where else?`, answer));
        }
      }
      if (ask === 'ex_note' && note) {
        const wrong = distinct(shuffle(pool.filter((x) => x.id !== a.id && x.note && x.grp !== a.grp && /[a-z]{3}/i.test(x.note) && (x.note.match(GAP) ?? []).length <= 2))
          .map((x) => clip(x.note!.replace(GAP, '…'), 200))).slice(0, 3);
        const answer = clip(note, 200);
        if (wrong.length >= 2) piles[k].push(card({ ...b, id: `expression:note:${a.id}`, kind: 'feature', ask, prompt: `What does ${src.en} note on ${head}?`,
          options: shuffle([answer, ...wrong.filter((x) => x !== answer)]), answer, note: { en: sense ?? src.en, ar: head }, explanation: `${src.en}: ${note}` },
          ask, `${head} — ${src.en}'s note?`, note));
      }
      if (piles[k].length > before) usedAyah[k].add(`${a.surah}:${a.ayah}:${a.grp}`);
    });
    if (piles.every((p) => p.length >= n)) break;
  }
  return mixed(piles, n);
};
