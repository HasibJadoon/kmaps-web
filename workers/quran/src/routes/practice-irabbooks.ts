import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import type { Label } from '../lib/labels';
import { loadAyat, withCard, levelOf, interleave, shuffle, uniq, cap, parseJson, type Drill, type Scope } from './practice-kit';

// ── the iʿrāb books, side by side ─────────────────────────────────────────────
// Every book's parse of a word, placed on the word (qr_irab_book_word, built by kmaps-resources
// scripts/quran/irab_book_drills.py from qr_irab_book_entry — al-Muyassar, al-Jadwal, al-Darwīsh,
// al-ʿUkbarī's Tibyān — and al-Daʿʿās from qr_irab_drill_item): the role its parse opens with,
// the other readings it allows, and every role it names at all (which is never a wrong answer).
// The book titles and the roles to choose among are the skill's extra_json (books, roles).
//
//   irab_muyassar    al-Muyassar's parse of the marked word                         L1
//   irab_which_book  the books part ways on the word — which gives this parse        L2
//   irab_allowed     a reading the book also allows the word                         L3
//   irab_who_allows  which book allows the word this reading                         L3
//
// A row whose word_to runs past its word_index is a phrase the book parses whole (al-ʿUkbarī's «(من لدنه)»,
// al-Jadwal's «(في الأرض)»): the whole span is marked, and it is set only against the books' parses of the same span.

type Row = { rid: number; id: string; surah: number; ayah: number; word_index: number; word_to: number | null; word_text: string; source_slug: string;
             role_gt: string | null; alt_roles_json: string | null; named_json: string | null; parse_ar: string; alt_ar: string | null;
             entry_id: string; n_books: number; n_roles: number };
type BookName = { en: string; ar: string };

const MUYASSAR = 'qul_irab_muyassar';

export async function irabBookDrills(env: QuranEnv, n: number, scope: Scope, lv: Record<string, unknown>, L: Record<string, Label[]>): Promise<Drill[]> {
  const { band, asks, extra } = levelOf(L, 'irabbooks', lv);
  const books = (extra.books ?? {}) as Record<string, BookName>;
  const roleKeys = ((extra.roles ?? []) as string[]).map((r) => `GT:irab_role:${r}`);
  const where = scope.surah === null ? { sql: '1=1', args: [] as number[] }
    : scope.from && scope.to ? { sql: 'surah = ? AND ayah BETWEEN ? AND ?', args: [scope.surah, scope.from, scope.to] }
    : { sql: 'surah = ?', args: [scope.surah] };
  const pick: Record<string, string> = {
    // high end only: a word the books parse more than one way, never a plain role
    irab_muyassar: `source_slug = '${MUYASSAR}' AND role_gt IS NOT NULL AND (n_roles >= 2 OR alt_roles_json IS NOT NULL)`,
    irab_which_book: 'n_roles >= 2 AND role_gt IS NOT NULL',
    irab_allowed: 'alt_roles_json IS NOT NULL',
    irab_who_allows: 'alt_roles_json IS NOT NULL',
  };
  const piles = await Promise.all(asks.filter((a) => pick[a]).map(async (ask) => (await query<{ rid: number }>(env.DB_QR,
    `SELECT rowid AS rid FROM qr_irab_book_word WHERE ${pick[ask]} AND ${where.sql} ORDER BY random() LIMIT ?`, [...where.args, n * 3]))
    .map((r) => ({ rid: r.rid, ask }))));
  const chosen = interleave(piles, n * 3);
  if (!chosen.length) return [];
  const askOf = new Map(chosen.map((c) => [c.rid, c.ask]));
  const picked = await query<Row>(env.DB_QR, `SELECT rowid AS rid, * FROM qr_irab_book_word WHERE rowid IN (${chosen.map(() => '?').join(',')})`, chosen.map((c) => c.rid));
  // one word per āyah, in the order drawn
  const order = new Map(chosen.map((c, i) => [c.rid, i]));
  picked.sort((a, b) => (order.get(a.rid) ?? 0) - (order.get(b.rid) ?? 0));
  const seen = new Set<string>();
  const rows = picked.filter((r) => { const k = `${r.surah}:${r.ayah}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, n);
  if (!rows.length) return [];
  const pairs = rows.map((r) => [r.surah, r.ayah]);
  const [ayat, peers, names] = await Promise.all([
    loadAyat(env, pairs),
    // every book on the same āyāt: the other parses of the word, and the roles standing in the āyah
    query<Row>(env.DB_QR, `SELECT rowid AS rid, * FROM qr_irab_book_word WHERE (surah, ayah) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`, [JSON.stringify(pairs)]),
    query<{ id: string; name_ar: string; name_en: string | null }>(env.DB_QR, `SELECT id, name_ar, name_en FROM ar_ling_gram_term WHERE id LIKE 'GT:irab_role:%'`),
  ]);
  const term = new Map(names.map((t) => [t.id, t]));
  const roleName = (gt: string) => { const t = term.get(gt); return t ? (t.name_en ? `${cap(t.name_en)} · ${t.name_ar}` : t.name_ar) : gt.split(':').pop()!; };
  const bookName = (slug: string) => books[slug]?.en ?? slug;
  const clip = (s: string, k = 140) => (s.length > k ? `${s.slice(0, s.lastIndexOf(' ', k) > k / 2 ? s.lastIndexOf(' ', k) : k)} …` : s);
  const endOf = (r: Row) => (r.word_to && r.word_to > r.word_index ? r.word_to : r.word_index);
  const onWord = (r: Row) => peers.filter((p) => p.surah === r.surah && p.ayah === r.ayah && p.word_index === r.word_index && endOf(p) === endOf(r));
  const named = (r: Row) => new Set(parseJson<string[]>(r.named_json, []));
  const roleOptions = (answer: string, avoid: Set<string>, r: Row) => {
    const inAyah = peers.filter((p) => p.surah === r.surah && p.ayah === r.ayah).map((p) => p.role_gt).filter((x): x is string => !!x);
    return uniq([...shuffle(inAyah), ...shuffle(roleKeys)]).filter((g) => g !== answer && !avoid.has(g) && roleKeys.includes(g)).slice(0, 3);
  };
  const allBooks = Object.keys(books);

  const out: Drill[] = [];
  for (const r of rows) {
    const a = ayat.get(`${r.surah}:${r.ayah}`);
    if (!a) continue;
    const idx = a.ws.findIndex((w) => w.word_index === r.word_index);
    const end = a.ws.findIndex((w) => w.word_index === endOf(r));
    if (idx < 0 || end < idx) continue;
    const wk = endOf(r) > r.word_index ? `${r.word_index}-${endOf(r)}` : `${r.word_index}`;
    const ask = askOf.get(r.rid) ?? 'irab_muyassar';
    const line = a.ws.map((w) => w.word_text).join(' ');
    const base = { kind: 'feature', ask, script: 'quran', audio: a.audio, words: a.words, en: a.en, span: Array.from({ length: end - idx + 1 }, (_, k) => idx + k),
                   source: { workId: `QR:SURAH:${r.surah}`, title: a.title, level: null } };
    const card = (d: Drill, key: string, front: string, back: string) =>
      withCard(d, { ref: `QR:irabbooks:${key}`, type: 'grammar', kind: 'irabbooks', band, front, back,
                    surah: r.surah, ayah: r.ayah, series: a.surahName });
    const others = onWord(r).filter((p) => p.source_slug !== r.source_slug);
    const parses = (rs: Row[]) => rs.map((p) => `${bookName(p.source_slug)}: ${clip(p.parse_ar)}`).join('\n');

    if (ask === 'irab_muyassar' || ask === 'irab_which_book') {
      const role = r.role_gt!;
      if (ask === 'irab_muyassar') {
        const wrong = roleOptions(role, named(r), r).map(roleName);
        if (wrong.length < 3) continue;
        out.push(card({
          ...base, id: `irabbooks:muyassar:${a.key}:${wk}`, prompt: `How does al-Iʿrāb al-Muyassar parse ${r.word_text}?`,
          options: shuffle([roleName(role), ...wrong]), answer: roleName(role),
          note: { en: cap(term.get(role)?.name_en), ar: term.get(role)?.name_ar ?? '' },
          explanation: `${r.parse_ar} — ${bookName(r.source_slug)}${others.length ? `\n${parses(others)}` : ''}`,
        }, `muyassar:${a.key}:${wk}`, `${line}\n${r.word_text} — al-Muyassar?`, `${roleName(role)}\n${r.parse_ar}`));
      } else {
        // the right book is the only one among the options whose parse names this role at all
        const against = others.filter((p) => !named(p).has(role));
        if (!against.length) continue;
        const wrong = uniq([...shuffle(against.map((p) => p.source_slug)),
                            ...shuffle(allBooks.filter((b) => b !== r.source_slug && !onWord(r).some((p) => p.source_slug === b)))]).slice(0, 3);
        if (wrong.length < 2) continue;
        out.push(card({
          ...base, id: `irabbooks:which:${a.key}:${wk}:${r.source_slug}`,
          prompt: `The books part ways on ${r.word_text}. Which one parses it as ${roleName(role)}?`,
          options: shuffle([bookName(r.source_slug), ...wrong.map(bookName)]), answer: bookName(r.source_slug),
          note: { en: cap(term.get(role)?.name_en), ar: term.get(role)?.name_ar ?? '' },
          explanation: parses([r, ...others]),
        }, `which:${a.key}:${wk}:${r.source_slug}`, `${line}\n${r.word_text} as ${roleName(role)} — which book?`,
           `${bookName(r.source_slug)}\n${parses([r, ...others])}`));
      }
    } else {
      const alts = parseJson<string[]>(r.alt_roles_json, []).filter((g) => roleKeys.includes(g));
      if (!alts.length) continue;
      const alt = shuffle(alts)[0];
      const cited = `${r.alt_ar ? `${r.alt_ar}\n` : ''}${r.parse_ar} — ${bookName(r.source_slug)}`;
      if (ask === 'irab_allowed') {
        const wrong = roleOptions(alt, named(r), r).map(roleName);
        if (wrong.length < 3) continue;
        const first = r.role_gt ? `Besides ${roleName(r.role_gt)}, which` : 'Which';
        out.push(card({
          ...base, id: `irabbooks:allowed:${a.key}:${wk}:${r.source_slug}`,
          prompt: `${first} reading does ${bookName(r.source_slug)} allow ${r.word_text}?`,
          options: shuffle([roleName(alt), ...wrong]), answer: roleName(alt),
          note: { en: cap(term.get(alt)?.name_en), ar: term.get(alt)?.name_ar ?? '' },
          explanation: cited,
        }, `allowed:${a.key}:${wk}:${r.source_slug}`, `${line}\n${r.word_text} — ${bookName(r.source_slug)} also allows?`,
           `${roleName(alt)}\n${cited}`));
      } else {
        // which book allows it: the others on this word that never name the reading, then books silent on the word
        const allowing = onWord(r).filter((p) => named(p).has(alt)).map((p) => p.source_slug);
        const against = others.filter((p) => !named(p).has(alt)).map((p) => p.source_slug);
        const silent = allBooks.filter((b) => !onWord(r).some((p) => p.source_slug === b));
        const wrong = uniq([...shuffle(against), ...shuffle(silent)]).filter((b) => !allowing.includes(b)).slice(0, 3);
        if (!against.length || wrong.length < 2) continue;
        out.push(card({
          ...base, id: `irabbooks:allows:${a.key}:${wk}:${r.source_slug}`,
          prompt: `Which book allows ${r.word_text} to be read as ${roleName(alt)}?`,
          options: shuffle([bookName(r.source_slug), ...wrong.map(bookName)]), answer: bookName(r.source_slug),
          note: { en: cap(term.get(alt)?.name_en), ar: term.get(alt)?.name_ar ?? '' },
          explanation: `${cited}${others.length ? `\n${parses(others)}` : ''}`,
        }, `allows:${a.key}:${wk}:${r.source_slug}`, `${line}\n${r.word_text} as ${roleName(alt)} — which book allows it?`,
           `${bookName(r.source_slug)}\n${cited}`));
      }
    }
  }
  return out;
}

export async function irabBookCount(env: QuranEnv): Promise<number> {
  const r = await query<{ n: number }>(env.DB_QR, `SELECT COUNT(*) AS n FROM qr_irab_book_word`);
  return r[0]?.n ?? 0;
}
