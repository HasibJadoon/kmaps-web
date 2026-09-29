import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { labels, byKey, card } from '../lib/labels';

// ── Qurʾān drills ─────────────────────────────────────────────────────────────
// Drills built from the Qurʾān's own study data, in the shape the Arabic drills
// have (DrillKit): the āyah heard in al-ʿAfāsī's recitation, its words each timed,
// a word marked, a question, options, and — once answered — what the book says.
// Every drill carries its review card (CORE SRS), module QR, with the whole drill
// kept so review replays it, and where it sits (surah, āyah, skill, book).
//
//   GET /qr/practice/home                       the skills, with how many items each has
//   GET /qr/practice/session?skill=irab&surah=&from=&to=&n=8
//        scope: an āyah range of a surah, a whole surah, or (no surah) the whole Qurʾān

const RECITER = 7;

type Item = { id: string; surah: number; ayah: number; word_index: number; word_text: string; role_gt: string; irab_ar: string; source_slug: string };

const BOOKS: Record<string, string> = { qul_irab_quran_daas: 'al-Daʿʿās, Iʿrāb al-Qurʾān' };

const shuffle = <T>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function practiceRoutes(router: Router<QuranEnv>) {
  router.get('/qr/practice/home', async (_req, env) => {
    const [L, counts] = await Promise.all([
      labels(env),
      query<{ n: number }>(env.DB_QR, `SELECT COUNT(*) AS n FROM qr_irab_drill_item`),
    ]);
    const n: Record<string, number> = { irab: counts[0]?.n ?? 0 };
    const res = ok({ skills: (L.skill ?? []).map((s) => ({ ...card(s), count: n[String(s.extra?.source ?? s.key)] ?? 0 })) });
    return res;
  });

  router.get('/qr/practice/session', async (req, env) => {
    const u = new URL(req.url);
    const skill = u.searchParams.get('skill') ?? 'irab';
    const n = Math.min(20, Math.max(1, Number(u.searchParams.get('n') ?? 8)));
    const surah = Number(u.searchParams.get('surah') ?? 0) || null;
    const from = Number(u.searchParams.get('from') ?? 0) || null;
    const to = Number(u.searchParams.get('to') ?? 0) || null;
    if (surah !== null && (surah < 1 || surah > 114)) return badRequest('surah 1–114');
    const L = await labels(env);
    const meta = byKey(L.skill).get(skill);
    if (!meta) return badRequest(`unknown skill ${skill}`);
    const items = skill === 'irab' ? await irabDrills(env, n, surah, from, to) : [];
    const kind = byKey(L.kind).get(skill);
    const deck = byKey(L.path).get('srs_deck');
    const res = ok({
      skill: card(meta), level: 'all',
      items: items.map((it) => ({ ...it, instruction: kind?.label ?? null, instructionAr: kind?.labelAr ?? null })),
      srsDeck: deck ? { title: deck.label, description: deck.detail } : null,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });
}

/// Iʿrāb: the marked word's role, as the book gives it. The options are roles that
/// stand in the same āyah first (so the choice is made in context), then common ones.
async function irabDrills(env: QuranEnv, n: number, surah: number | null, from: number | null, to: number | null) {
  const where = surah === null ? '' : from && to ? 'WHERE surah = ? AND ayah BETWEEN ? AND ?' : 'WHERE surah = ?';
  const args = surah === null ? [] : from && to ? [surah, from, to] : [surah];
  // a varied draw: never two words from the same āyah in one round
  const pool = await query<Item>(env.DB_QR,
    `SELECT id, surah, ayah, word_index, word_text, role_gt, irab_ar, source_slug FROM qr_irab_drill_item ${where}
      ORDER BY random() LIMIT ${n * 4}`, args);
  const picked: Item[] = [];
  const seen = new Set<string>();
  for (const it of pool) {
    const k = `${it.surah}:${it.ayah}`;
    if (seen.has(k)) continue;
    seen.add(k); picked.push(it);
    if (picked.length >= n) break;
  }
  if (!picked.length) return [];

  const keys = [...new Set(picked.map((p) => `${p.surah}:${p.ayah}`))];
  const pairs = keys.map((k) => k.split(':').map(Number));
  const inAyat = pairs.map(() => '(surah = ? AND ayah = ?)').join(' OR ');
  const flat = pairs.flat();
  const surahIds = [...new Set(picked.map((p) => p.surah))];
  const [words, rec, sameAyah, terms, names, surahRows] = await Promise.all([
    query<{ surah: number; ayah: number; word_index: number; word_text: string }>(env.DB_QR,
      `SELECT surah, ayah, word_index, word_text FROM qr_word_occurrence WHERE ${inAyat} ORDER BY surah, ayah, word_index`, flat),
    query<{ surah: number; ayah: number; start_ms: number; end_ms: number; segments_json: string | null; audio_url: string }>(env.DB_QR,
      `SELECT a.surah, a.ayah, a.start_ms, a.end_ms, a.segments_json, r.audio_url FROM qr_recitation_ayah a
         JOIN qr_recitation r ON r.reciter_id = a.reciter_id AND r.surah = a.surah
        WHERE a.reciter_id = ${RECITER} AND (${pairs.map(() => '(a.surah = ? AND a.ayah = ?)').join(' OR ')})`, flat),
    query<{ surah: number; ayah: number; role_gt: string }>(env.DB_QR,
      `SELECT DISTINCT surah, ayah, role_gt FROM qr_irab_drill_item WHERE ${inAyat}`, flat),
    query<{ role_gt: string; n: number }>(env.DB_QR,
      `SELECT role_gt, COUNT(*) AS n FROM qr_irab_drill_item GROUP BY role_gt ORDER BY n DESC`),
    query<{ id: string; name_ar: string; name_en: string | null }>(env.DB_QR,
      `SELECT id, name_ar, name_en FROM ar_ling_gram_term WHERE id LIKE 'GT:irab_role:%'`),
    query<{ id: number; name_en: string }>(env.DB_QR,
      `SELECT id, name_en FROM qr_surah WHERE id IN (${surahIds.map(() => '?').join(',')})`, surahIds),
  ]);
  const surahNames = new Map(surahRows.map((s) => [s.id, s.name_en]));
  const name = new Map(names.map((t) => [t.id, t]));
  // an option as the learner reads it: the English, then the Arabic term
  const optionOf = (gt: string) => {
    const t = name.get(gt);
    if (!t) return null;
    const en = (t.name_en ?? '').replace(/^\w/, (c) => c.toUpperCase());
    return en ? `${en} · ${t.name_ar}` : t.name_ar;
  };
  const common = terms.map((t) => t.role_gt);
  const byAyah = new Map<string, typeof words>();
  for (const w of words) byAyah.set(`${w.surah}:${w.ayah}`, [...(byAyah.get(`${w.surah}:${w.ayah}`) ?? []), w]);
  const recOf = new Map(rec.map((r) => [`${r.surah}:${r.ayah}`, r]));
  const rolesIn = new Map<string, string[]>();
  for (const r of sameAyah) rolesIn.set(`${r.surah}:${r.ayah}`, [...(rolesIn.get(`${r.surah}:${r.ayah}`) ?? []), r.role_gt]);

  return picked.map((it) => {
    const k = `${it.surah}:${it.ayah}`;
    const ws = byAyah.get(k) ?? [];
    const r = recOf.get(k);
    // each word's time in the recitation, where it numbers the āyah's words as the corpus does
    const segs: number[][] = r?.segments_json ? JSON.parse(r.segments_json) : [];
    const at = new Map<number, number[]>();
    for (const x of segs) if (!at.has(x[0])) at.set(x[0], x);
    const aligned = ws.length > 0 && at.size === ws.length && ws.every((w) => at.has(w.word_index));
    const words = ws.map((w) => {
      const t = aligned ? at.get(w.word_index) : undefined;
      return { t: w.word_text, s: t ? t[1] / 1000 : 0, e: t ? t[2] / 1000 : 0 };
    });
    const idx = ws.findIndex((w) => w.word_index === it.word_index);
    const answer = optionOf(it.role_gt) ?? it.role_gt;
    // distractors: the other roles in this very āyah, then the commonest roles
    const others = [...new Set([...(rolesIn.get(k) ?? []), ...shuffle(common.slice(0, 12))])]
      .filter((g) => g !== it.role_gt).map(optionOf).filter((x): x is string => !!x && x !== answer).slice(0, 3);
    const t = name.get(it.role_gt);
    const drill: Record<string, unknown> = {
      id: `irab:${it.surah}:${it.ayah}:${it.word_index}`, kind: 'feature', script: 'quran',
      audio: r ? { url: r.audio_url, start: r.start_ms / 1000, end: r.end_ms / 1000 } : null,
      words, span: idx >= 0 ? [idx] : [],
      prompt: `What is the iʿrāb of ${it.word_text}?`,
      options: shuffle([answer, ...others]), answer,
      note: t ? { en: (t.name_en ?? '').replace(/^\w/, (c) => c.toUpperCase()), ar: t.name_ar } : null,
      explanation: `${it.irab_ar} — ${BOOKS[it.source_slug] ?? it.source_slug}`,
      source: { workId: `QR:SURAH:${it.surah}`, title: `${surahNames.get(it.surah) ?? 'Surah ' + it.surah} ${it.surah}:${it.ayah}`, level: null },
    };
    drill.srs = {
      module: 'QR', resource_type: 'grammar', card_kind: 'irab', card_template: 'feature',
      resource_ref: `QR:irab:${it.surah}:${it.ayah}:${it.word_index}`,
      front_text: `${ws.map((w) => w.word_text).join(' ')}\n${it.word_text} — ?`,
      back_text: `${answer}\n${it.irab_ar}`,
      extra: { drill: { ...drill }, group: { skill: 'irab', band: null, series: surahNames.get(it.surah) ?? null,
                                             workId: `QR:SURAH:${it.surah}`, work: `${it.surah}:${it.ayah}`, episode: null, scene: null } },
    };
    return drill;
  });
}
