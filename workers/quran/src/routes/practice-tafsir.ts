import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { byKey, type Label } from '../lib/labels';
import { loadAyat, withCard, levelOf, interleave, shuffle, uniq, parseJson, rangeOf, type Drill, type Scope } from './practice-kit';

// ── tafsīr ──────────────────────────────────────────────────────────────────
// The mufassirūn in their own words (qr_tafsir_drill_item, built from the books by kmaps-resources
// scripts/quran/tafsir_drills.py): every excerpt verbatim and cited to its book; the wrong answers
// are the ones that sit beside it — the other books on the same āyāt, the neighbouring āyāt,
// the same commentary's points on the rest of the surah. The kinds per level are the skill's
// extra_json.levels[band].asks.
//
//   tafsir_point   the English commentary's point on an āyah range        (feature)
//   surah_intro    Maududi's introduction — which surah                    (gist)
//   tafsir_who     an Arabic sentence — which of the eight mufassirūn      (idiom: the excerpt as the prompt)
//   tafsir_where   a comment on one āyah — which āyah                      (grammar: Arabic prompt, Arabic options)
//   tafsir_school  a position on a point of doctrine — whose               (idiom)
//   tafsir_reading a curated reading's thesis — whose                      (feature)
//   tafsir_section a mufassir's own words — which step of his argument     (idiom)

type Item = { id: string; ask: string; surah: number; ayah_from: number | null; ayah_to: number | null; ayah: number | null;
              source_slug: string | null; source_name: string | null; text: string; answer: string | null; context: string | null;
              tag: string | null; ref: string | null; page: string | null; others_json: string | null };
type Book = { source_slug: string; book_title_ar: string; book_title_en: string; author_name_ar: string; author_name_en: string;
              madhab: string | null; kalam_school: string | null; death_year_hijri: number | null };

export async function tafsirDrills(env: QuranEnv, n: number, scope: Scope, lv: Record<string, unknown>, L: Record<string, Label[]>): Promise<Drill[]> {
  const { band, asks } = levelOf(L, 'tafsir', lv);
  const where = scope.surah === null ? { sql: '1=1', args: [] as number[] }
    : scope.from && scope.to ? { sql: 'surah = ? AND ayah_from <= ? AND COALESCE(ayah_to, ayah_from) >= ?', args: [scope.surah, scope.to, scope.from] }
    : { sql: 'surah = ?', args: [scope.surah] };
  // each kind drawn apart (a random rowid set on the index), then taken in turn
  const piles = await Promise.all(asks.map((ask) => query<{ rowid: number }>(env.DB_QR,
    `SELECT rowid FROM qr_tafsir_drill_item WHERE ask = ? AND ${where.sql} ORDER BY random() LIMIT ?`, [ask, ...where.args, n])));
  const ids = interleave(piles.map((p) => p.map((r) => r.rowid)), n);
  if (!ids.length) return [];
  const order = new Map(ids.map((id, i) => [id, i]));
  const items = (await query<Item & { rid: number }>(env.DB_QR,
    `SELECT rowid AS rid, * FROM qr_tafsir_drill_item WHERE rowid IN (${ids.map(() => '?').join(',')})`, ids))
    .sort((a, b) => (order.get(a.rid) ?? 0) - (order.get(b.rid) ?? 0));

  const whereAyat = items.filter((i) => i.ask === 'tafsir_where').flatMap((i) => [i.answer!, ...parseJson<string[]>(i.others_json, [])]);
  const introSurahs = items.filter((i) => i.ask === 'surah_intro').flatMap((i) => [Number(i.answer), ...parseJson<number[]>(i.others_json, [])]);
  const [books, ayat, texts, surahs, points] = await Promise.all([
    query<Book>(env.DB_QR, `SELECT source_slug, book_title_ar, book_title_en, author_name_ar, author_name_en, madhab, kalam_school, death_year_hijri
                              FROM qr_tafsir_book_display_source ORDER BY display_order`),
    loadAyat(env, items.filter((i) => i.ask !== 'surah_intro' && i.ask !== 'tafsir_where' && i.ayah).map((i) => [i.surah, i.ayah!])),
    whereAyat.length ? query<{ surah: number; ayah: number; text: string }>(env.DB_QR,
      `SELECT surah, ayah, text_uthmani AS text FROM qr_ayah
        WHERE (surah, ayah) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`,
      [JSON.stringify(whereAyat.map((k) => k.split(':').map(Number)))]) : Promise.resolve([]),
    query<{ id: number; name_en: string; name_ar: string }>(env.DB_QR, `SELECT id, name_en, name_ar FROM qr_surah`),
    // a commentary with too few points on its surah borrows wrong answers from its points elsewhere
    items.some((i) => i.ask === 'tafsir_point' && parseJson<string[]>(i.others_json, []).length < 3)
      ? query<{ source_slug: string; text: string }>(env.DB_QR,
          `SELECT source_slug, text FROM qr_tafsir_drill_item WHERE rowid IN (SELECT rowid FROM qr_tafsir_drill_item WHERE ask = 'tafsir_point' ORDER BY random() LIMIT 60)`)
      : Promise.resolve([]),
  ]);
  const book = new Map(books.map((b) => [b.source_slug, b]));
  const allBooks = books.map((b) => b.source_slug);
  const kalam = byKey(L.kalam);
  const doctrine = byKey(L.doctrine);
  const ayahText = new Map(texts.map((t) => [`${t.surah}:${t.ayah}`, t.text]));
  const surahOf = new Map(surahs.map((s) => [s.id, s]));
  const nameOf = (slug: string) => { const b = book.get(slug); return b ? `${b.author_name_en} — ${b.book_title_en}` : slug; };
  const schoolOf = (slug: string) => { const b = book.get(slug); const k = kalam.get(b?.kalam_school ?? '') ?? kalam.get(b?.madhab ?? ''); return k?.label ?? null; };
  const withSchool = (slug: string) => { const b = book.get(slug); const s = schoolOf(slug); return b ? `${b.author_name_en}${s ? ` (${s})` : ''} — ${b.book_title_en}` : slug; };
  const cite = (it: Item) => { const b = book.get(it.source_slug ?? ''); return `${b ? `${b.author_name_en}, ${b.book_title_en}` : it.source_name ?? it.source_slug}, on ${rangeOf(it.surah, it.ayah_from ?? 1, it.ayah_to)}${it.page ? `, p. ${it.page}` : ''}`; };
  /// the wrong books: those on the same āyāt first, then the rest
  const otherBooks = (it: Item, answer: string, prefer?: (s: string) => boolean) => {
    const near = shuffle(parseJson<string[]>(it.others_json, []).filter((s) => s !== answer && book.has(s)));
    const rest = shuffle(allBooks.filter((s) => s !== answer && !near.includes(s)));
    const pool = [...near, ...rest];
    return (prefer ? [...pool.filter(prefer), ...pool.filter((s) => !prefer(s))] : pool).slice(0, 3);
  };
  const short = (t: string, n = 9) => { const w = t.split(/\s+/); return w.length > n ? `${w.slice(0, n).join(' ')} …` : t; };

  const out: Drill[] = [];
  for (const it of items) {
    const a = it.ayah ? ayat.get(`${it.surah}:${it.ayah}`) : undefined;
    const series = surahOf.get(it.surah)?.name_en ?? null;
    const heard = a ? { audio: a.audio, words: a.words, en: a.en, script: 'quran' as const } : {};
    const source = { workId: `QR:SURAH:${it.surah}`, title: a?.title ?? `${series ?? 'Surah'} ${rangeOf(it.surah, it.ayah_from ?? 1, it.ayah_to)}`, level: null };
    const card = (d: Drill, front: string, back: string, type = 'passage') =>
      withCard(d, { ref: `QR:tafsir:${it.id}`, type, kind: 'tafsir', band, front, back, surah: it.surah, ayah: it.ayah ?? it.ayah_from, series });

    if (it.ask === 'tafsir_point') {
      if (!a) continue;
      let others = parseJson<string[]>(it.others_json, []).filter((x) => x !== it.text);
      if (others.length < 3) others = uniq([...others, ...shuffle(points.filter((p) => p.source_slug === it.source_slug && p.text !== it.text).map((p) => p.text))]);
      const wrong = shuffle(others).slice(0, 3);
      if (wrong.length < 3) continue;
      const range = rangeOf(it.surah, it.ayah_from ?? 1, it.ayah_to);
      out.push(card({
        id: `tafsir:${it.id}`, kind: 'feature', ask: it.ask, ...heard, span: [],
        prompt: `${it.source_name} on ${range} — which is its point?`,
        options: shuffle([it.text, ...wrong]), answer: it.text,
        note: { en: it.source_name ?? '', ar: '' },
        explanation: `${it.context ? `${it.context}\n` : ''}— ${it.source_name}, on ${range}`, source,
      }, `${range} — ${it.source_name}: its point?`, `${it.text}\n— ${it.source_name}, on ${range}`));
    } else if (it.ask === 'surah_intro') {
      const s = surahOf.get(Number(it.answer));
      if (!s) continue;
      const label = (x: { id: number; name_en: string; name_ar: string }) => `${x.id} · ${x.name_en} · ${x.name_ar}`;
      const wrong = parseJson<number[]>(it.others_json, []).map((x) => surahOf.get(x)).filter((x): x is NonNullable<typeof x> => !!x).slice(0, 3).map(label);
      if (wrong.length < 3) continue;
      out.push(card({
        id: `tafsir:${it.id}`, kind: 'gist', ask: it.ask,
        prompt: `“${it.text}”\n— Maududi, ${it.tag ?? 'Introduction'}`,
        options: shuffle([label(s), ...wrong]), answer: label(s),
        explanation: `${it.tag ?? 'Introduction'} of Surah ${s.name_en} (${s.id}) — ${it.source_name}`, source: { workId: `QR:SURAH:${s.id}`, title: s.name_en, level: null },
      }, `“${it.text}”\n— which surah?`, `${label(s)}\n— ${it.source_name}, ${it.tag}`, 'surah'));
    } else if (it.ask === 'tafsir_who' || it.ask === 'tafsir_school') {
      const ans = it.answer ?? it.source_slug ?? '';
      const b = book.get(ans);
      if (!a || !b) continue;
      const school = it.ask === 'tafsir_school';
      const mine = schoolOf(ans);
      const label = school ? withSchool : nameOf;
      // for a doctrine, the wrong answers speak for another school where the books allow it
      const wrong = otherBooks(it, ans, school ? (s) => schoolOf(s) !== mine : undefined).map(label);
      const d = school ? doctrine.get(it.tag ?? '') : undefined;
      out.push(card({
        id: `tafsir:${it.id}`, kind: 'idiom', ask: it.ask, ...heard, span: [],
        prompt: it.text, options: shuffle([label(ans), ...wrong]), answer: label(ans),
        note: school && d ? { en: d.label, ar: d.labelAr ?? '' } : { en: `${b.author_name_en} (d. ${b.death_year_hijri ?? '—'} AH)`, ar: `${b.author_name_ar}، ${b.book_title_ar}` },
        explanation: cite(it), source,
      }, `${it.text}\n— ${school ? 'whose position?' : 'which mufassir?'} (${rangeOf(it.surah, it.ayah_from ?? 1, it.ayah_to)})`,
         `${label(ans)}\n${cite(it)}`, 'tafsir'));
    } else if (it.ask === 'tafsir_where') {
      const b = book.get(it.source_slug ?? '');
      const opt = (k: string) => { const t = ayahText.get(k); return t ? `${short(t)} (${k})` : null; };
      const answer = opt(it.answer ?? '');
      const wrong = parseJson<string[]>(it.others_json, []).map(opt).filter((x): x is string => !!x).slice(0, 3);
      if (!answer || !b || wrong.length < 2) continue;
      const [s, ay] = (it.answer ?? '').split(':').map(Number);
      out.push(card({
        id: `tafsir:${it.id}`, kind: 'grammar', ask: it.ask, script: 'quran',
        prompt: it.text, options: shuffle([answer, ...wrong]), answer,
        note: { en: `${b.author_name_en} — ${b.book_title_en}`, ar: it.tag ?? '' },
        explanation: `﴿${ayahText.get(it.answer ?? '')}﴾ (${it.answer})\n${b.author_name_ar}، ${b.book_title_ar}${it.page ? `، ص ${it.page}` : ''}`,
        source: { workId: `QR:SURAH:${s}`, title: `${surahOf.get(s)?.name_en ?? 'Surah'} ${s}:${ay}`, level: null },
      }, `${it.text}\n— which āyah?`, `${answer}\n${cite(it)}`, 'tafsir'));
    } else if (it.ask === 'tafsir_reading') {
      const ans = it.answer ?? '';
      if (!a || !book.has(ans)) continue;
      const range = rangeOf(it.surah, it.ayah_from ?? 1, it.ayah_to);
      out.push(card({
        id: `tafsir:${it.id}`, kind: 'feature', ask: it.ask, ...heard, span: [],
        prompt: `Whose reading of ${range} is this? “${it.text}”`,
        options: shuffle([nameOf(ans), ...otherBooks(it, ans).map(nameOf)]), answer: nameOf(ans),
        note: { en: nameOf(ans), ar: book.get(ans)?.author_name_ar ?? '' },
        explanation: `${it.context ? `${it.context}\n` : ''}— the curated reading of ${range} (${it.tag})`, source,
      }, `“${it.text}”\n— whose reading of ${range}?`, `${nameOf(ans)}\n${it.context ?? ''}`, 'tafsir'));
    } else if (it.ask === 'tafsir_section') {
      const wrong = shuffle(parseJson<string[]>(it.others_json, []).filter((h) => h !== it.answer)).slice(0, 3);
      if (!a || !it.answer || wrong.length < 2) continue;
      const b = book.get(it.source_slug ?? '');
      out.push(card({
        id: `tafsir:${it.id}`, kind: 'idiom', ask: it.ask, ...heard, span: [],
        prompt: it.text, options: shuffle([it.answer, ...wrong]), answer: it.answer,
        note: { en: b ? `${b.author_name_en} — ${b.book_title_en}` : it.source_name ?? '', ar: it.tag ?? '' },
        explanation: `${it.context ? `${it.context}\n` : ''}— ${b ? `${b.author_name_en}, ${b.book_title_en}` : it.source_name}, on ${rangeOf(it.surah, it.ayah_from ?? 1, it.ayah_to)} (curated reading)`,
        source,
      }, `${it.text}\n— which step of ${b?.author_name_en ?? it.source_name}'s argument?`, `${it.answer}\n${it.tag ?? ''}`, 'tafsir'));
    }
  }
  return out;
}

export async function tafsirCount(env: QuranEnv): Promise<number> {
  const r = await query<{ n: number }>(env.DB_QR, `SELECT COUNT(*) AS n FROM qr_tafsir_drill_item`);
  return r[0]?.n ?? 0;
}
