import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { byKey, type Label } from '../lib/labels';

// ── Grammar-term drills (skill source 'gramterm') ────────────────────────────
// The grammar-term registry drilled from AL's drill sources (/al/drill/grammar/*): where a term
// sits in the hierarchy, its definition, its Qurʾānic shawāhid, which book and bāb treat it,
// Baṣra against Kūfa (the Inṣāf), the ṣarf wazn rules, the pairs that are confused, and
// ʿUḍayma's Dirāsāt (a Qurʾānic word's pattern, the meaning the pattern carries, his own notes).
// AL makes each drill whole; here a drill that stands on an āyah is heard in al-ʿAfāsī's
// recitation with its word marked, and every drill files its review card (module QR).
//
// A skill's labels say which AL source it draws (extra.drill) and, per level, which ask
// (extra.levels[band].ask, or .asks to mix several) — qr_053_gramterm_skills.sql.
// Terms the registry has no shāhid for are drilled from the iʿrāb instances here
// (qr_irab_drill_item): the word as al-Daʿʿās parses it.
//
//   GET /qr/drill/irab-shawahid?terms=GT:irab_role:…&n=&surah=   iʿrāb instances as āyah drills, for AR's grammar path
//   GET /qr/drill/ayat?refs=2:255,…                               āyāt heard: words, timings, clip, English

const RECITER = 7;
const BOOKS: Record<string, string> = { qul_irab_quran_daas: 'al-Daʿʿās, Iʿrāb al-Qurʾān' };
type Scope = { surah: number | null; from: number | null; to: number | null };
type Band = 'basic' | 'middle' | 'advanced' | 'all';
type Drill = Record<string, unknown>;
type GramDrill = { id: string; source: string; ask: string; termId: string | null; terms: string[]; prompt: string; promptEn: string | null;
                   options: string[]; answer: string; explanation: string | null; note?: { en: string | null; ar: string | null } | null;
                   optionScope?: string; qrRef?: string; exampleAr?: string; wordIndex?: number | null; word?: string | null;
                   cite?: { source: string; title: string | null; bab?: string | null; volume?: number | null; page?: number | null } | null };

const shuffle = <T>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cap = (s: string | null | undefined) => (s ?? '').replace(/^\w/, (c) => c.toUpperCase());
const fold = (w: string) => (w ?? '').replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^ء-ي]/g, '');
const loose = (w: string) => fold(w).replace(/[اوي]/g, '');

function al<T>(env: QuranEnv, path: string): Promise<T> {
  if (!env.AR_LINGUISTICS) return Promise.reject(new Error('no AL binding'));
  // an AL error answers { ok: false } with no data: that is a failure here too, not an empty round
  return env.AR_LINGUISTICS.fetch(`https://al${path}`).then((r) => r.json() as Promise<{ data?: T }>)
    .then((j) => { if (j?.data === undefined) throw new Error(`AL ${path}: no data`); return j.data; });
}

type Word = { word_index: number; word_text: string };
export type Ayah = { key: string; surah: number; ayah: number; ws: Word[]; words: { t: string; s: number; e: number }[];
                     audio: { url: string; start: number; end: number } | null; en: string | null; title: string; series: string };

/// Each āyah with its words, their times in the recitation (where it numbers the words as the corpus does),
/// its clip, its default English and where it stands.
export async function ayatHeard(env: QuranEnv, refs: string[]): Promise<Map<string, Ayah>> {
  const pairs = [...new Set(refs.filter((r) => /^\d+:\d+$/.test(r)))].map((r) => r.split(':').map(Number)).slice(0, 60);
  if (!pairs.length) return new Map();
  const inAyat = (p = '') => pairs.map(() => `(${p}surah = ? AND ${p}ayah = ?)`).join(' OR ');
  const flat = pairs.flat();
  const surahIds = [...new Set(pairs.map((p) => p[0]))];
  const [words, rec, tr, surahs] = await Promise.all([
    query<Word & { surah: number; ayah: number }>(env.DB_QR,
      `SELECT surah, ayah, word_index, word_text FROM qr_word_occurrence WHERE ${inAyat()} ORDER BY surah, ayah, word_index`, flat),
    query<{ surah: number; ayah: number; start_ms: number; end_ms: number; segments_json: string | null; audio_url: string }>(env.DB_QR,
      `SELECT a.surah, a.ayah, a.start_ms, a.end_ms, a.segments_json, r.audio_url FROM qr_recitation_ayah a
         JOIN qr_recitation r ON r.reciter_id = a.reciter_id AND r.surah = a.surah
        WHERE a.reciter_id = ${RECITER} AND (${inAyat('a.')})`, flat),
    query<{ surah: number; ayah: number; text: string }>(env.DB_QR,
      `SELECT t.surah, t.ayah, t.translation_text AS text FROM qr_translation t
         JOIN qr_translation_source s ON s.id = t.source_id AND s.is_default = 1 WHERE ${inAyat('t.')}`, flat),
    query<{ id: number; name_en: string }>(env.DB_QR, `SELECT id, name_en FROM qr_surah WHERE id IN (${surahIds.map(() => '?').join(',')})`, surahIds),
  ]);
  const names = new Map(surahs.map((s) => [s.id, s.name_en]));
  const recOf = new Map(rec.map((r) => [`${r.surah}:${r.ayah}`, r]));
  const enOf = new Map(tr.map((r) => [`${r.surah}:${r.ayah}`, r.text]));
  const wsOf = new Map<string, Word[]>();
  for (const w of words) wsOf.set(`${w.surah}:${w.ayah}`, [...(wsOf.get(`${w.surah}:${w.ayah}`) ?? []), w]);
  const out = new Map<string, Ayah>();
  for (const [s, a] of pairs) {
    const key = `${s}:${a}`;
    const ws = wsOf.get(key) ?? [];
    if (!ws.length) continue;
    const r = recOf.get(key);
    let segs: number[][] = [];
    try { segs = r?.segments_json ? JSON.parse(r.segments_json) : []; } catch { segs = []; }
    const at = new Map<number, number[]>();
    for (const x of segs) if (!at.has(x[0])) at.set(x[0], x);
    const aligned = at.size === ws.length && ws.every((w) => at.has(w.word_index));
    const series = names.get(s) ?? `Surah ${s}`;
    out.set(key, {
      key, surah: s, ayah: a, ws, en: enOf.get(key) ?? null, title: `${series} ${key}`, series,
      words: ws.map((w) => { const t = aligned ? at.get(w.word_index) : undefined; return { t: w.word_text, s: t ? t[1] / 1000 : 0, e: t ? t[2] / 1000 : 0 }; }),
      audio: r ? { url: r.audio_url, start: r.start_ms / 1000, end: r.end_ms / 1000 } : null,
    });
  }
  return out;
}

/// where a phrase stands in its āyah: the run of words it spells (the first two at least)
export function spanOf(ws: Word[], phrase: string): number[] {
  const toks = (phrase ?? '').replace(/[﴿﴾()«»]/g, ' ').split(/\s+/).map(loose).filter(Boolean);
  const keys = ws.map((w) => loose(w.word_text));
  if (!toks.length) return [];
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== toks[0]) continue;
    let k = 1;
    while (k < toks.length && i + k < keys.length && keys[i + k] === toks[k]) k++;
    if (k >= Math.min(2, toks.length)) return Array.from({ length: Math.min(toks.length, keys.length - i) }, (_, j) => i + j);
  }
  return [];
}

/// the review card every drill files: the whole drill kept, so review replays it, and where it sits
function withCard(drill: Drill, a: { ref: string; skill: string; front: string; back: string; band: Band; surah?: number; ayah?: number; series?: string | null }) {
  drill.srs = {
    module: 'QR', resource_type: 'grammar', card_kind: a.skill, card_template: String(drill.kind),
    resource_ref: a.ref, front_text: a.front, back_text: a.back,
    extra: { drill: { ...drill }, group: { skill: a.skill, band: a.band !== 'all' ? a.band : null, series: a.series ?? null,
                                           workId: a.surah ? `QR:SURAH:${a.surah}` : null, work: a.surah ? `${a.surah}:${a.ayah ?? ''}` : null,
                                           episode: null, scene: null } },
  };
  return drill;
}

/// the asks a level draws: one (`ask`) or a mix (`asks`), each with its share of the round
function asksOf(lv: Record<string, unknown>, fallback: string[]): string[] {
  if (Array.isArray(lv.asks) && lv.asks.length) return lv.asks.map(String);
  if (lv.ask) return [String(lv.ask)];
  return fallback;
}

/// Turn AL's drills into Qurʾān drills: an āyah drill ('feature') where it stands on one, a question
/// ('grammar') where it does not; options named from the labels where AL gives keys (the schools).
export async function heardDrills(env: QuranEnv, items: GramDrill[], skill: string, band: Band, L: Record<string, Label[]>, scope: Scope | null) {
  const inRange = (ref?: string) => !ref || !scope?.from || !scope?.to
    || (Number(ref.split(':')[1]) >= scope.from && Number(ref.split(':')[1]) <= scope.to);
  const kept = items.filter((it) => inRange(it.qrRef));
  const ayat = await ayatHeard(env, kept.map((it) => it.qrRef).filter((r): r is string => !!r));
  const optionLabels = new Map<string, Map<string, Label>>();
  const named = (scopeKey: string | undefined, x: string) => {
    if (!scopeKey) return x;
    if (!optionLabels.has(scopeKey)) optionLabels.set(scopeKey, byKey(L[scopeKey]));
    const l = optionLabels.get(scopeKey)!.get(x);
    return l ? (l.labelAr ? `${l.label} · ${l.labelAr}` : l.label) : x;
  };
  const out: Drill[] = [];
  for (const it of kept) {
    const options = it.options.map((o) => named(it.optionScope, o));
    const answer = named(it.optionScope, it.answer);
    const cite = it.cite ? [it.cite.title, it.cite.bab ? `«${it.cite.bab}»` : null,
                            it.cite.volume ? `${it.cite.volume}:${it.cite.page ?? ''}` : it.cite.page ? `p. ${it.cite.page}` : null].filter(Boolean).join(' — ') : null;
    const explanation = [it.explanation, cite].filter(Boolean).join('\n') || null;
    const a = it.qrRef ? ayat.get(it.qrRef) : undefined;
    if (it.qrRef && !a) continue;
    if (a) {
      const idx = it.wordIndex != null ? a.ws.findIndex((w) => w.word_index === it.wordIndex) : -1;
      const span = idx >= 0 ? [idx] : spanOf(a.ws, it.exampleAr ?? '');
      const drill: Drill = {
        id: `${skill}:${it.id}`, kind: 'feature', ask: it.ask, script: 'quran', audio: a.audio, words: a.words, en: a.en, span,
        prompt: it.word ?? (span.length ? span.map((i) => a.ws[i].word_text).join(' ') : it.prompt), promptEn: it.promptEn,
        options: shuffle(options), answer, note: it.note ?? null, explanation, terms: it.terms,
        source: { workId: `QR:SURAH:${a.surah}`, title: a.title, level: null },
      };
      out.push(withCard(drill, { ref: `QR:${it.id}`, skill, band, surah: a.surah, ayah: a.ayah, series: a.series,
        front: `${a.ws.map((w) => w.word_text).join(' ')}\n${String(drill.prompt)} — ?`, back: [answer, it.explanation].filter(Boolean).join('\n') }));
    } else {
      const drill: Drill = {
        id: `${skill}:${it.id}`, kind: 'grammar', ask: it.ask, prompt: it.prompt, promptEn: it.promptEn, options: shuffle(options), answer,
        note: it.note ?? null, explanation, terms: it.terms,
        source: { workId: it.termId ? `AL:${it.termId}` : it.cite ? `AL:SOURCE:${it.cite.source}` : null, title: it.cite?.title ?? null, level: null },
      };
      out.push(withCard(drill, { ref: `QR:${it.id}`, skill, band, series: it.cite?.title ?? null,
        front: [it.prompt, it.promptEn].filter(Boolean).join('\n'), back: [answer, it.explanation].filter(Boolean).join('\n') }));
    }
  }
  return out;
}

type Irab = { id: string; surah: number; ayah: number; word_index: number; word_text: string; role_gt: string; irab_ar: string; source_slug: string };

/// iʿrāb instances as shawāhid of the terms the registry has none for: the word, its role as the book gives it
async function irabShawahid(env: QuranEnv, terms: string[], n: number, surah: number | null) {
  const roles = terms.filter((t) => t.startsWith('GT:irab_role:')).slice(0, 40);
  if (!roles.length) return [];
  const rows = await query<Irab>(env.DB_QR,
    `SELECT id, surah, ayah, word_index, word_text, role_gt, irab_ar, source_slug FROM qr_irab_drill_item
      WHERE role_gt IN (${roles.map(() => '?').join(',')}) ${surah ? 'AND surah = ?' : ''} ORDER BY random() LIMIT ?`,
    [...roles, ...(surah ? [surah] : []), n * 3]);
  // one per āyah, and no role more than its share, so a round spans the terms
  const seen = new Set<string>();
  const per = new Map<string, number>();
  const cap_ = Math.max(1, Math.ceil(n / roles.length));
  return rows.filter((r) => {
    const k = `${r.surah}:${r.ayah}`;
    if (seen.has(k) || (per.get(r.role_gt) ?? 0) >= cap_) return false;
    seen.add(k); per.set(r.role_gt, (per.get(r.role_gt) ?? 0) + 1); return true;
  }).slice(0, n);
}

/// the registry's options for an iʿrāb role: the roles beside it, named as the terms endpoint names them
async function irabAsShahid(env: QuranEnv, rows: Irab[]): Promise<GramDrill[]> {
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((r) => r.role_gt))];
  const info = await al<{ terms: Array<{ id: string; nameAr: string; nameEn: string | null; siblings: Array<{ id: string; nameAr: string; nameEn: string | null }> }> }>(
    env, `/al/drill/grammar/terms?ids=${encodeURIComponent(ids.join(','))}`).catch(() => ({ terms: [] }));
  const byId = new Map(info.terms.map((t) => [t.id, t]));
  const lab = (t: { nameAr: string; nameEn: string | null }) => (t.nameEn ? `${cap(t.nameEn)} · ${t.nameAr}` : t.nameAr);
  return rows.map((r) => {
    const t = byId.get(r.role_gt);
    if (!t || t.siblings.length < 2) return null;
    return { id: `gt:irab:${r.id}`, source: 'shahid', ask: 'gt_shahid', termId: t.id, terms: [t.id], prompt: r.word_text, promptEn: null,
             options: [lab(t), ...shuffle(t.siblings).slice(0, 3).map(lab)], answer: lab(t), explanation: r.irab_ar,
             note: { en: t.nameEn, ar: t.nameAr }, qrRef: `${r.surah}:${r.ayah}`, wordIndex: r.word_index, word: r.word_text,
             cite: { source: r.source_slug, title: BOOKS[r.source_slug] ?? r.source_slug } } as GramDrill;
  }).filter((x): x is GramDrill => !!x);
}

/// A session of a 'gramterm' skill: its AL source, the level's asks, split over the round.
export async function gramTermDrills(env: QuranEnv, skill: string, meta: Label, n: number, scope: Scope, lv: Record<string, unknown>,
                                     band: Band, L: Record<string, Label[]>): Promise<Drill[]> {
  const source = String(meta.extra?.drill ?? 'tree');
  const levels = (meta.extra?.levels ?? {}) as Record<string, Record<string, unknown>>;
  const asks = band === 'all' ? [...new Set(Object.values(levels).flatMap((x) => asksOf(x, [])))] : asksOf(lv, []);
  const share = Math.max(1, Math.ceil(n / Math.max(1, asks.length)));
  const piles = await Promise.all((asks.length ? asks : ['']).map(async (ask) => {
    const qs = new URLSearchParams({ n: String(share) });
    if (ask) qs.set('ask', ask);
    const bounds = band === 'all' ? {} : lv;
    for (const k of ['minDepth', 'maxDepth', 'category']) if (bounds[k] != null) qs.set(k, String(bounds[k]));
    if (meta.extra?.discipline) qs.set('discipline', String(meta.extra.discipline));
    if (scope.surah) qs.set('surah', String(scope.surah));
    const res = await al<{ items: GramDrill[]; missing?: string[] }>(env, `/al/drill/grammar/${source}?${qs}`)
      .catch(() => ({ items: [] as GramDrill[], missing: [] as string[] }));
    let items = res.items;
    // a term with no shāhid in the registry: its iʿrāb instances stand in
    if (source === 'shahid' && items.length < share && res.missing?.length) {
      items = items.concat(await irabAsShahid(env, await irabShawahid(env, res.missing, share - items.length, scope.surah)));
    }
    return items;
  }));
  // one pile after another, interleaved, so a mixed level mixes
  const mixed: GramDrill[] = [];
  for (let i = 0; mixed.length < n && piles.some((p) => p.length > i); i++) for (const p of piles) if (p[i] && mixed.length < n) mixed.push(p[i]);
  return heardDrills(env, mixed, skill, band, L, scope);
}

/// How much each 'gramterm' skill holds, keyed by the skill (for the practice home): AL's count for
/// the source the skill draws (extra.drill).
export async function gramTermCounts(env: QuranEnv, skills: Label[]): Promise<Record<string, number>> {
  const c = await al<Record<string, number>>(env, '/al/drill/grammar/counts').catch(() => ({} as Record<string, number>));
  return Object.fromEntries(skills.filter((s) => s.extra?.source === 'gramterm').map((s) => [s.key, c[String(s.extra?.drill ?? '')] ?? 0]));
}

export function practiceGrammarRoutes(router: Router<QuranEnv>) {
  // iʿrāb instances as āyah drills, for the Arabic grammar path (which names the options itself)
  router.get('/qr/drill/irab-shawahid', async (req, env) => {
    const u = new URL(req.url);
    const terms = (u.searchParams.get('terms') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!terms.length) return badRequest('terms (GT ids) required');
    const n = Math.min(20, Math.max(1, Number(u.searchParams.get('n') ?? 6)));
    const rows = await irabShawahid(env, terms, n, Number(u.searchParams.get('surah') ?? 0) || null);
    const ayat = await ayatHeard(env, rows.map((r) => `${r.surah}:${r.ayah}`));
    const res = ok({ items: rows.map((r) => {
      const a = ayat.get(`${r.surah}:${r.ayah}`);
      if (!a) return null;
      const idx = a.ws.findIndex((w) => w.word_index === r.word_index);
      return { id: r.id, termId: r.role_gt, ref: a.key, word: r.word_text, irab: r.irab_ar, book: BOOKS[r.source_slug] ?? r.source_slug,
               audio: a.audio, words: a.words, span: idx >= 0 ? [idx] : [], en: a.en, title: a.title, series: a.series };
    }).filter(Boolean) });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });

  // āyāt heard: for a drill elsewhere that stands on an āyah (the Arabic grammar path's shawāhid)
  router.get('/qr/drill/ayat', async (req, env) => {
    const refs = (new URL(req.url).searchParams.get('refs') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!refs.length) return badRequest('refs (s:a,…) required');
    const ayat = await ayatHeard(env, refs);
    return ok({ ayat: Object.fromEntries([...ayat.entries()].map(([k, a]) => [k, {
      ref: k, words: a.words, audio: a.audio, en: a.en, title: a.title, series: a.series, wordIndex: a.ws.map((w) => w.word_index) }])) });
  });
}
