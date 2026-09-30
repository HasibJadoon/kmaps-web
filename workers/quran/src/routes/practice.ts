import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { labels, byKey, card, type Label } from '../lib/labels';

// ── Qurʾān drills ─────────────────────────────────────────────────────────────
// The Qurʾān drilled as the Arabic side is (DrillKit shapes): each āyah a line heard in
// al-ʿAfāsī's recitation, its words timed — listen & fill, build the āyah, catch the word,
// shadow — and iʿrāb, grammar, balāgha, verbal idioms and sense arcs. Every skill has three
// levels, read from qr_study_label (skill.extra_json.levels). Every drill carries its review
// card (CORE SRS, module QR) with the whole drill kept, so review replays it as the drill.
//
//   GET /qr/practice/home
//   GET /qr/practice/session?skill=&level=basic|middle|advanced|all&surah=&from=&to=&n=8
//       scope: an āyah range of a surah, a whole surah, or (no surah) the whole Qurʾān

const RECITER = 7;
const BOOKS: Record<string, string> = { qul_irab_quran_daas: 'al-Daʿʿās, Iʿrāb al-Qurʾān' };
type Band = 'basic' | 'middle' | 'advanced' | 'all';
type Levels = Record<string, Record<string, unknown>>;
type Scope = { surah: number | null; from: number | null; to: number | null };

const shuffle = <T>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cap = (s: string | null | undefined) => (s ?? '').replace(/^\w/, (c) => c.toUpperCase());
/// letters only, for matching words across spellings
const fold = (w: string) => (w ?? '').replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^ء-ي]/g, '');
const loose = (w: string) => fold(w).replace(/[اوي]/g, '');

export function practiceRoutes(router: Router<QuranEnv>) {
  router.get('/qr/practice/home', async (_req, env) => {
    const [L, irab, ayat, counts] = await Promise.all([
      labels(env),
      query<{ n: number }>(env.DB_QR, `SELECT COUNT(*) AS n FROM qr_irab_drill_item`),
      query<{ n: number }>(env.DB_QR, `SELECT COUNT(*) AS n FROM qr_ayah`),
      al<{ grammar: number; balagha: number; idiom: number; arc: number }>(env, '/al/drill/counts').catch(() => null),
    ]);
    const n: Record<string, number> = { irab: irab[0]?.n ?? 0, lines: ayat[0]?.n ?? 0, ...(counts ?? {}) };
    return ok({
      skills: (L.skill ?? []).map((s) => {
        const src = String(s.extra?.source ?? s.key);
        const key = src === 'gram' ? (s.extra?.discipline === 'BL' ? 'balagha' : 'grammar') : src;
        return { ...card(s), count: n[key] ?? 0 };
      }),
      levels: (L.level ?? []).map(card),
    });
  });

  router.get('/qr/practice/session', async (req, env) => {
    const u = new URL(req.url);
    const skill = u.searchParams.get('skill') ?? 'irab';
    const band = (['basic', 'middle', 'advanced'].includes(u.searchParams.get('level') ?? '') ? u.searchParams.get('level') : 'all') as Band;
    const n = Math.min(20, Math.max(1, Number(u.searchParams.get('n') ?? 8)));
    const scope: Scope = { surah: Number(u.searchParams.get('surah') ?? 0) || null,
                           from: Number(u.searchParams.get('from') ?? 0) || null, to: Number(u.searchParams.get('to') ?? 0) || null };
    if (scope.surah !== null && (scope.surah < 1 || scope.surah > 114)) return badRequest('surah 1–114');
    const L = await labels(env);
    const meta = byKey(L.skill).get(skill);
    if (!meta) return badRequest(`unknown skill ${skill}`);
    const levels = (meta.extra?.levels ?? {}) as Levels;
    const lv = band === 'all' ? {} : (levels[band] ?? {});
    const src = String(meta.extra?.source ?? skill);
    const items =
      src === 'irab' ? await irabDrills(env, n, scope, lv, band, levels)
      : src === 'lines' ? await lineDrills(env, skill, n, scope, lv, !!meta.extra?.timed)
      : src === 'gram' ? await gramDrills(env, skill, String(meta.extra?.discipline ?? 'NH'), n, scope, lv)
      : src === 'idiom' ? await idiomDrills(env, n, scope, lv, L)
      : src === 'arc' ? await arcDrills(env, n, lv, L)
      : [];
    const kinds = byKey(L.kind);
    const deck = byKey(L.path).get('srs_deck');
    const res = ok({
      skill: card(meta), level: band,
      items: items.map((it) => {
        const k = kinds.get(String(it.ask ?? skill)) ?? kinds.get(skill);
        const { ask: _a, ...rest } = it;
        return { ...rest, instruction: k?.label ?? null, instructionAr: k?.labelAr ?? null };
      }),
      srsDeck: deck ? { title: deck.label, description: deck.detail } : null,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });
}

// ── shared ──────────────────────────────────────────────────────────────────

function al<T>(env: QuranEnv, path: string): Promise<T> {
  if (!env.AR_LINGUISTICS) return Promise.reject(new Error('no AL binding'));
  return env.AR_LINGUISTICS.fetch(`https://al${path}`).then((r) => r.json() as Promise<{ data: T }>).then((j) => j.data);
}

type Word = { word_index: number; word_text: string; pos: string | null; lemma: string | null; is_content_word: number | null };
type Ayah = { key: string; surah: number; ayah: number; ws: Word[]; words: { t: string; s: number; e: number }[]; aligned: boolean;
              audio: { url: string; start: number; end: number } | null; en: string | null; title: string };

/// Each āyah with its words, their times in the recitation (where it numbers the words as the
/// corpus does), its clip, its default English, and where it stands.
async function loadAyat(env: QuranEnv, pairs: number[][]): Promise<Map<string, Ayah>> {
  if (!pairs.length) return new Map();
  const inAyat = pairs.map(() => '(surah = ? AND ayah = ?)').join(' OR ');
  const flat = pairs.flat();
  const surahIds = [...new Set(pairs.map((p) => p[0]))];
  const [words, rec, tr, surahs] = await Promise.all([
    query<Word & { surah: number; ayah: number }>(env.DB_QR,
      `SELECT surah, ayah, word_index, word_text, pos, lemma, is_content_word FROM qr_word_occurrence WHERE ${inAyat} ORDER BY surah, ayah, word_index`, flat),
    query<{ surah: number; ayah: number; start_ms: number; end_ms: number; segments_json: string | null; audio_url: string }>(env.DB_QR,
      `SELECT a.surah, a.ayah, a.start_ms, a.end_ms, a.segments_json, r.audio_url FROM qr_recitation_ayah a
         JOIN qr_recitation r ON r.reciter_id = a.reciter_id AND r.surah = a.surah
        WHERE a.reciter_id = ${RECITER} AND (${pairs.map(() => '(a.surah = ? AND a.ayah = ?)').join(' OR ')})`, flat),
    query<{ surah: number; ayah: number; text: string }>(env.DB_QR,
      `SELECT t.surah, t.ayah, t.translation_text AS text FROM qr_translation t
         JOIN qr_translation_source s ON s.id = t.source_id AND s.is_default = 1 WHERE ${pairs.map(() => '(t.surah = ? AND t.ayah = ?)').join(' OR ')}`, flat),
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
    const r = recOf.get(key);
    const segs: number[][] = r?.segments_json ? JSON.parse(r.segments_json) : [];
    const at = new Map<number, number[]>();
    for (const x of segs) if (!at.has(x[0])) at.set(x[0], x);
    const aligned = ws.length > 0 && at.size === ws.length && ws.every((w) => at.has(w.word_index));
    out.set(key, {
      key, surah: s, ayah: a, ws, aligned, en: enOf.get(key) ?? null,
      title: `${names.get(s) ?? 'Surah ' + s} ${s}:${a}`,
      words: ws.map((w) => { const t = aligned ? at.get(w.word_index) : undefined; return { t: w.word_text, s: t ? t[1] / 1000 : 0, e: t ? t[2] / 1000 : 0 }; }),
      audio: r ? { url: r.audio_url, start: r.start_ms / 1000, end: r.end_ms / 1000 } : null,
    });
  }
  return out;
}

/// The review card every drill files: the whole drill kept so review replays it, and where it sits.
function withCard(drill: Record<string, unknown>, a: { ref: string; type: string; kind: string; front: string; back: string;
                  surah?: number | null; ayah?: number | null; series?: string | null; band?: Band }) {
  drill.srs = {
    module: 'QR', resource_type: a.type, card_kind: a.kind, card_template: String(drill.kind),
    resource_ref: a.ref, front_text: a.front, back_text: a.back,
    extra: { drill: { ...drill }, group: { skill: a.kind, band: a.band && a.band !== 'all' ? a.band : null, series: a.series ?? null,
                                           workId: a.surah ? `QR:SURAH:${a.surah}` : null, work: a.surah ? `${a.surah}:${a.ayah ?? ''}` : null,
                                           episode: null, scene: null } },
  };
  return drill;
}

const scopeWhere = (s: Scope, col = '') => s.surah === null ? { sql: '1=1', args: [] as number[] }
  : s.from && s.to ? { sql: `${col}surah = ? AND ${col}ayah BETWEEN ? AND ?`, args: [s.surah, s.from, s.to] }
  : { sql: `${col}surah = ?`, args: [s.surah] };

/// āyāt in scope whose word count sits in the level's bounds
async function pickAyat(env: QuranEnv, scope: Scope, minWords: number, maxWords: number, n: number) {
  const w = scopeWhere(scope);
  const rows = await query<{ surah: number; ayah: number }>(env.DB_QR,
    `SELECT surah, ayah FROM qr_word_occurrence WHERE ${w.sql} GROUP BY surah, ayah
      HAVING COUNT(*) BETWEEN ? AND ? ORDER BY random() LIMIT ?`, [...w.args, minWords, maxWords, n]);
  return rows.map((r) => [r.surah, r.ayah]);
}

// ── listen & fill · build the āyah · catch the word · shadow ──────────────────

async function lineDrills(env: QuranEnv, skill: string, n: number, scope: Scope, lv: Record<string, unknown>, timed: boolean) {
  const minW = Number(lv.minWords ?? 3), maxW = Number(lv.maxWords ?? 60);
  const pairs = await pickAyat(env, scope, minW, maxW, n * (timed ? 3 : 2));
  const ayat = [...(await loadAyat(env, pairs)).values()].filter((a) => a.ws.length && (!timed || a.aligned));
  // the other words to choose from: content words of the same surahs
  const surahIds = [...new Set(ayat.map((a) => a.surah))];
  const pool = surahIds.length ? await query<{ word_text: string; pos: string | null }>(env.DB_QR,
    `SELECT DISTINCT word_text, pos FROM qr_word_occurrence WHERE surah IN (${surahIds.map(() => '?').join(',')}) AND is_content_word = 1 LIMIT 1500`, surahIds) : [];
  const out: Record<string, unknown>[] = [];
  for (const a of ayat) {
    if (out.length >= n) break;
    const base: Record<string, unknown> = { id: `${skill}:${a.key}`, kind: skill, script: 'quran', audio: a.audio, words: a.words, en: a.en,
                                            source: { workId: `QR:SURAH:${a.surah}`, title: a.title, level: null } };
    const line = a.ws.map((w) => w.word_text).join(' ');
    const card = (front: string, back: string) => withCard(base, { ref: `QR:${skill}:${a.key}`, type: 'passage', kind: skill, front, back,
                                                                   surah: a.surah, ayah: a.ayah, series: a.title.replace(/ \d+:\d+$/, '') });
    if (skill === 'fill' || skill === 'hear') {
      const content = a.ws.map((w, i) => ({ w, i })).filter(({ w, i }) => (w.is_content_word ?? 0) === 1 && fold(w.word_text).length >= 3
        && (skill !== 'hear' || a.words[i].e - a.words[i].s >= 0.25));
      if (!content.length) continue;
      const pick = content[Math.floor(Math.random() * content.length)];
      const answer = pick.w.word_text;
      const same = pool.filter((p) => p.pos === pick.w.pos && loose(p.word_text) !== loose(answer));
      const options = shuffle([answer, ...shuffle(same.length >= 3 ? same : pool.filter((p) => loose(p.word_text) !== loose(answer)))
        .map((p) => p.word_text).filter((x, i, xs) => xs.indexOf(x) === i).slice(0, 3)]);
      if (options.length < 4) continue;
      if (skill === 'fill') { base.blank = pick.i; base.answer = answer; base.options = options; }
      else {
        const t = a.words[pick.i];
        base.audio = { ...a.audio!, start: Math.max(a.audio!.start, t.s - 0.04), end: Math.min(a.audio!.end, t.e + 0.08) };
        base.target = pick.i; base.answer = answer; base.options = options; base.line = a.audio;
      }
      out.push(card(line.replace(answer, '＿＿＿'), `${answer}\n${line}`));
    } else if (skill === 'order') {
      const order = a.ws.map((_, i) => i);
      let sh = shuffle(order);
      for (let k = 0; k < 4 && sh.every((v, i) => v === i); k++) sh = shuffle(order);
      base.shuffled = sh;
      out.push(card(a.en ?? a.title, line));
    } else {
      out.push(card(a.en ?? a.title, line));   // shadow: the āyah and its timings
    }
  }
  return out;
}

// ── iʿrāb ──────────────────────────────────────────────────────────────────

type IrabItem = { id: string; surah: number; ayah: number; word_index: number; word_text: string; role_gt: string; irab_ar: string; source_slug: string };

async function irabDrills(env: QuranEnv, n: number, scope: Scope, lv: Record<string, unknown>, band: Band, levels: Levels) {
  const w = scopeWhere(scope);
  const roles = (lv.roles as string[] | undefined)?.map((r) => `GT:irab_role:${r}`);
  const alt = lv.alternative === true;
  const pool = await query<IrabItem>(env.DB_QR,
    `SELECT id, surah, ayah, word_index, word_text, role_gt, irab_ar, source_slug FROM qr_irab_drill_item
      WHERE ${w.sql} ${roles ? `AND role_gt IN (${roles.map(() => '?').join(',')})` : ''} ${alt ? `AND irab_ar LIKE '%ويجوز%'` : ''}
      ORDER BY random() LIMIT ?`, [...w.args, ...(roles ?? []), n * 4]);
  const seen = new Set<string>();
  const picked = pool.filter((it) => { const k = `${it.surah}:${it.ayah}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, n);
  if (!picked.length) return [];
  const pairs = picked.map((p) => [p.surah, p.ayah]);
  const inAyat = pairs.map(() => '(surah = ? AND ayah = ?)').join(' OR ');
  const [ayat, sameAyah, names] = await Promise.all([
    loadAyat(env, pairs),
    query<{ surah: number; ayah: number; role_gt: string }>(env.DB_QR, `SELECT DISTINCT surah, ayah, role_gt FROM qr_irab_drill_item WHERE ${inAyat}`, pairs.flat()),
    query<{ id: string; name_ar: string; name_en: string | null }>(env.DB_QR, `SELECT id, name_ar, name_en FROM ar_ling_gram_term WHERE id LIKE 'GT:irab_role:%'`),
  ]);
  const name = new Map(names.map((t) => [t.id, t]));
  const optionOf = (gt: string) => { const t = name.get(gt); return t ? (t.name_en ? `${cap(t.name_en)} · ${t.name_ar}` : t.name_ar) : null; };
  // distractors from the same level first (then all roles), and the roles standing in the same āyah
  const levelRoles = band !== 'all' ? ((levels[band]?.roles as string[] | undefined) ?? []).map((r) => `GT:irab_role:${r}`) : [];
  const allRoles = [...name.keys()];
  const rolesIn = new Map<string, string[]>();
  for (const r of sameAyah) rolesIn.set(`${r.surah}:${r.ayah}`, [...(rolesIn.get(`${r.surah}:${r.ayah}`) ?? []), r.role_gt]);
  return picked.map((it) => {
    const a = ayat.get(`${it.surah}:${it.ayah}`)!;
    const idx = a.ws.findIndex((w) => w.word_index === it.word_index);
    const answer = optionOf(it.role_gt) ?? it.role_gt;
    const others = [...new Set([...(rolesIn.get(a.key) ?? []), ...shuffle(levelRoles), ...shuffle(allRoles)])]
      .filter((g) => g !== it.role_gt).map(optionOf).filter((x): x is string => !!x && x !== answer).slice(0, 3);
    const t = name.get(it.role_gt);
    const drill: Record<string, unknown> = {
      id: `irab:${a.key}:${it.word_index}`, kind: 'feature', script: 'quran', audio: a.audio, words: a.words, en: a.en,
      span: idx >= 0 ? [idx] : [], prompt: `What is the iʿrāb of ${it.word_text}?`,
      options: shuffle([answer, ...others]), answer,
      note: t ? { en: cap(t.name_en), ar: t.name_ar } : null,
      explanation: `${it.irab_ar} — ${BOOKS[it.source_slug] ?? it.source_slug}`,
      source: { workId: `QR:SURAH:${it.surah}`, title: a.title, level: null },
    };
    return withCard(drill, { ref: `QR:irab:${a.key}:${it.word_index}`, type: 'grammar', kind: 'irab', band,
      front: `${a.ws.map((w) => w.word_text).join(' ')}\n${it.word_text} — ?`, back: `${answer}\n${it.irab_ar}`,
      surah: it.surah, ayah: it.ayah, series: a.title.replace(/ \d+:\d+$/, '') });
  });
}

// ── grammar · balāgha (the registry's Qurʾānic examples) ─────────────────────

type GramEx = { id: string; termId: string; nameAr: string; nameEn: string | null; definition: string | null; category: string; depth: number;
                exampleAr: string; ref: string; siblings: Array<{ id: string; nameAr: string; nameEn: string | null }> };

/// where an example phrase stands in its āyah: the run of words it spells
function spanOf(ws: Word[], phrase: string): number[] {
  const toks = phrase.split(/\s+/).map(loose).filter(Boolean);
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

async function gramDrills(env: QuranEnv, skill: string, discipline: string, n: number, scope: Scope, lv: Record<string, unknown>) {
  const qs = new URLSearchParams({ discipline, n: String(n), minDepth: String(lv.minDepth ?? 0), maxDepth: String(lv.maxDepth ?? 9) });
  if (scope.surah) qs.set('surah', String(scope.surah));
  const res = await al<{ items: GramEx[] }>(env, `/al/drill/gram-examples?${qs}`).catch(() => ({ items: [] as GramEx[] }));
  const exs = res.items.filter((e) => /^\d+:\d+$/.test(e.ref) && e.siblings.length >= 3
    && (!scope.from || !scope.to || (Number(e.ref.split(':')[1]) >= scope.from && Number(e.ref.split(':')[1]) <= scope.to)));
  const ayat = await loadAyat(env, exs.map((e) => e.ref.split(':').map(Number)));
  const optionOf = (t: { nameAr: string; nameEn: string | null }) => (t.nameEn ? `${cap(t.nameEn)} · ${t.nameAr}` : t.nameAr);
  return exs.map((e) => {
    const a = ayat.get(e.ref);
    if (!a) return null;
    const answer = optionOf(e);
    const others = e.siblings.map(optionOf).filter((x) => x !== answer).slice(0, 3);
    const drill: Record<string, unknown> = {
      id: `${skill}:${e.id}`, kind: 'feature', script: 'quran', audio: a.audio, words: a.words, en: a.en,
      span: spanOf(a.ws, e.exampleAr), prompt: skill === 'balagha' ? 'Which figure of rhetoric is at work in the marked words?' : 'Which grammar term names the marked words?',
      options: shuffle([answer, ...others]), answer,
      note: { en: cap(e.nameEn), ar: e.nameAr }, explanation: e.definition,
      source: { workId: `QR:SURAH:${a.surah}`, title: a.title, level: null },
    };
    return withCard(drill, { ref: `QR:${skill}:${e.id}`, type: 'grammar', kind: skill,
      front: `${e.exampleAr}\n(${e.ref}) — ?`, back: `${answer}${e.definition ? `\n${e.definition}` : ''}`,
      surah: a.surah, ayah: a.ayah, series: a.title.replace(/ \d+:\d+$/, '') });
  }).filter((x): x is Record<string, unknown> => !!x);
}

// ── verbal idioms (Mir) ────────────────────────────────────────────────────

type Idiom = { id: string; root: string; expressionAr: string; surfaceAr: string | null; particle: string | null; en: string;
               construction: string | null; explanation: string | null; surah: number; ayah: number; freq: number; ref: string;
               range: Array<{ ar: string; en: string }>; sameParticle: Array<{ ar: string; en: string }> };
type Lexeme = { meanings?: Array<{ en: string; ref: string | null; ayahEn?: string | null }>; lane?: { senses: string[]; page: number | null; source: string } | null };

async function idiomDrills(env: QuranEnv, n: number, scope: Scope, lv: Record<string, unknown>, L: Record<string, Label[]>) {
  const qs = new URLSearchParams({ n: String(n) });
  if (scope.surah) qs.set('surah', String(scope.surah));
  if (scope.from && scope.to) { qs.set('from', String(scope.from)); qs.set('to', String(scope.to)); }
  if (lv.minFreq != null) qs.set('minFreq', String(lv.minFreq));
  if (lv.maxFreq != null) qs.set('maxFreq', String(lv.maxFreq));
  const res = await al<{ items: Idiom[] }>(env, `/al/drill/idioms?${qs}`).catch(() => ({ items: [] as Idiom[] }));
  const items = res.items;
  if (!items.length) return [];
  const [ayat, lex] = await Promise.all([
    loadAyat(env, items.map((i) => [i.surah, i.ayah])),
    al<{ lexemes?: Record<string, Lexeme> }>(env, `/al/lex/v2/lexemes?refs=${encodeURIComponent([...new Set(items.map((i) => i.ref))].join(','))}`)
      .catch(() => ({ lexemes: {} as Record<string, Lexeme> })),
  ]);
  const refs = [...new Set(Object.values(lex.lexemes ?? {}).flatMap((x) => (x.meanings ?? []).map((m) => m.ref)).filter((r): r is string => !!r && /^\d+:\d+$/.test(r)))];
  const texts = refs.length ? new Map((await query<{ surah: number; ayah: number; text: string }>(env.DB_QR,
    `SELECT surah, ayah, text_uthmani AS text FROM qr_ayah WHERE ${refs.map(() => '(surah = ? AND ayah = ?)').join(' OR ')}`,
    refs.flatMap((r) => r.split(':').map(Number)))).map((r) => [`${r.surah}:${r.ayah}`, r.text])) : new Map<string, string>();
  const titles = byKey(L.context);
  const all = items.flatMap((i) => [...i.range, ...i.sameParticle]);
  return items.map((it) => {
    const a = ayat.get(`${it.surah}:${it.ayah}`);
    if (!a) return null;
    // the verb as it stands, and its particle if it is a word of its own
    const vi = a.ws.findIndex((w) => it.surfaceAr && loose(w.word_text) === loose(it.surfaceAr));
    const span = vi >= 0 ? [vi] : [];
    if (vi >= 0 && it.particle) {
      const p = loose(it.particle);
      const pi = a.ws.findIndex((w, i) => i > vi && i <= vi + 4 && (loose(w.word_text) === p || loose(w.word_text).startsWith(p)));
      if (pi > vi) span.push(pi);
    }
    const wrong = [...new Map([...it.range, ...it.sameParticle, ...shuffle(all)].filter((x) => x.en.toLowerCase() !== it.en.toLowerCase())
      .map((x) => [x.en.toLowerCase(), x.en])).values()].slice(0, 3);
    if (wrong.length < 3) return null;
    const x = lex.lexemes?.[it.ref];
    const context = x ? {
      meanings: x.meanings?.length ? { title: titles.get('meanings')?.label ?? null,
        items: x.meanings.slice(0, 5).map((m) => ({ en: m.en, ref: m.ref, ayahAr: m.ref ? texts.get(m.ref) ?? null : null, ayahEn: m.ayahEn ?? null })) } : null,
      lane: x.lane ? { title: titles.get('lane')?.label ?? null, senses: x.lane.senses, cite: `${x.lane.source}, p. ${x.lane.page ?? '—'}` } : null,
    } : null;
    const drill: Record<string, unknown> = {
      id: `idiom:${it.id}`, kind: 'idiom', script: 'quran', audio: a.audio, words: a.words, en: a.en, span,
      prompt: it.expressionAr, options: shuffle([it.en, ...wrong]), answer: it.en,
      note: it.construction ? { en: it.construction, ar: it.expressionAr } : null,
      explanation: it.explanation ?? 'Mustansir Mir, Verbal Idioms of the Qurʾān', context,
      source: { workId: `QR:SURAH:${a.surah}`, title: a.title, level: null },
    };
    return withCard(drill, { ref: `QR:idiom:${it.id}`, type: 'vocabulary', kind: 'idiom',
      front: `${it.expressionAr}\n${a.ws.map((w) => w.word_text).join(' ')}`, back: `${it.en}\n(${it.surah}:${it.ayah})`,
      surah: a.surah, ayah: a.ayah, series: a.title.replace(/ \d+:\d+$/, '') });
  }).filter((x): x is Record<string, unknown> => !!x);
}

// ── sense arcs ─────────────────────────────────────────────────────────────

type Arc = { id: string; root: string; title: string | null; titleAr: string | null; steps: Array<{ n: number; en: string; gloss: string | null; ar: string }> };

async function arcDrills(env: QuranEnv, n: number, lv: Record<string, unknown>, L: Record<string, Label[]>) {
  const qs = new URLSearchParams({ n: String(n), minSteps: String(lv.minSteps ?? 2), maxSteps: String(lv.maxSteps ?? 20) });
  const res = await al<{ items: Arc[] }>(env, `/al/drill/arcs?${qs}`).catch(() => ({ items: [] as Arc[] }));
  const ask = String(lv.ask ?? 'order');
  const rootOf = (r: string) => r.split('').join(' ');
  const allSteps = res.items.flatMap((a) => a.steps.map((s) => s.en));
  return res.items.map((arc) => {
    const steps = [...arc.steps].sort((a, b) => a.n - b.n);
    if (steps.length < 2) return null;
    const source = { workId: `AL:ROOT:${arc.root}`, title: `${rootOf(arc.root)}${arc.title ? ` · ${arc.title}` : ''}`, level: null };
    if (ask === 'origin') {
      const answer = steps[0].en;
      const wrong = [...new Set([...steps.slice(1).map((s) => s.en), ...shuffle(allSteps)])].filter((x) => x !== answer).slice(0, 3);
      if (wrong.length < 3) return null;
      const drill: Record<string, unknown> = {
        id: `arc:origin:${arc.id}`, kind: 'gist', ask: 'arc_origin',
        prompt: `Where does the meaning of ${rootOf(arc.root)} start?`, options: shuffle([answer, ...wrong]), answer,
        en: steps.map((s) => s.en).join(' → '), source,
      };
      return withCard(drill, { ref: `QR:arc:origin:${arc.id}`, type: 'root', kind: 'arc',
        front: `${rootOf(arc.root)} — first image?`, back: steps.map((s) => s.en).join(' → ') });
    }
    const order = steps.map((_, i) => i);
    let sh = shuffle(order);
    for (let k = 0; k < 4 && sh.every((v, i) => v === i); k++) sh = shuffle(order);
    const drill: Record<string, unknown> = {
      id: `arc:order:${arc.id}`, kind: 'dialogue', ask: 'arc_order',
      prompt: `${rootOf(arc.root)} — from its first image to its last sense`,
      dialogue: steps.map((s) => ({ speaker: null, ar: s.ar || s.en, en: [s.en, s.gloss].filter(Boolean).join(' — '), clip: null })),
      shuffled: sh, source,
    };
    return withCard(drill, { ref: `QR:arc:order:${arc.id}`, type: 'root', kind: 'arc',
      front: `${rootOf(arc.root)} — order its senses`, back: steps.map((s) => s.en).join(' → ') });
  }).filter((x): x is Record<string, unknown> => !!x);
}
