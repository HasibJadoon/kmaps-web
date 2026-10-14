import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { byKey, type Label } from '../lib/labels';
import { withCard, levelOf, interleave, shuffle, uniq, type Drill, type Scope } from './practice-kit';
import { schemesOf, openingsOf, themeLines, fold, allRings, type Ring } from './atlas-groups';

// ── Surah groups (skill 'groups') ───────────────────────────────────────────────────────────────
// Drawn from the groups as the atlas holds them (qr_nazm_group / _member, the schemes in qr_study_label
// scope 'group'), the muṣḥaf's openings (qr_ayah), the themes layer (Ibn ʿĀshūr's aims) and the rings
// the data records. The kinds per level are the skill's extra_json.levels[band].asks (qr_060):
//
//   group_of        a surah — which group of a scheme is it in                             (basic)
//   makki_madani    a surah — Makkī or Madanī (the surah metadata; Ibn ʿĀshūr's rank said)  (basic)
//   opens_with      which surah of a group opens this way (member table, else āyah 1)       (middle)
//   epithet         which surah carries this epithet pair / which group is called this      (middle)
//   shared_opening  an opening — which of the opening-letter groups shares it                (middle)
//   group_theme     Iṣlāḥī's ʿamūd of a group — which group                                 (advanced)
//   surah_aim       Ibn ʿĀshūr's aim of a surah — which surah of its group                  (advanced)
//   ring_pair       a part of a recorded ring — which part answers it                      (advanced)
//   ring_centre     a recorded ring — what stands at its centre                            (advanced)
//
// A wrong answer is never one that is also right: a group the surah is also in, a surah with the same
// opening or the same epithet, is left out of the options.
//
// Scope: ?surah= (a surah's groups, rings and aims), ?group=<slug> (one group: its members and ring), or
// ?surahs=2,3,29 (a list — practice-groups only; the other skills take one surah). The session route
// passes the request URL through for these.

type G = { id: string; slug: string; name_en: string; name_translit: string | null; name_ar: string | null; member_count: number;
           summary_md: string; epithet_ar: string | null; epithet_attrib: string | null; source_slug: string | null; revelation_type: string | null };
type M = { group_id: string; surah: number; member_index: number; opening_ayah: number | null; opening_text_ar: string | null;
           epithet_pair_ar: string | null };
type S = { id: number; name_ar: string; name_en: string; translit: string | null; revelation: string };

type Pools = {
  groups: G[]; members: M[]; surahs: Map<number, S>; schemes: ReturnType<typeof schemesOf>;
  openings: Map<number, { ayah: number; text: string; first: string }>;
  aims: Map<number, string>; ranks: Map<number, number | null>; rings: Ring[];
};

let memo: { at: number; data: Pools } | null = null;

async function pools(env: QuranEnv, L: Record<string, Label[]>): Promise<Pools> {
  if (memo && Date.now() - memo.at < 5 * 60_000) return memo.data;
  const [groups, members, surahs, ranks, rings] = await Promise.all([
    query<G>(env.DB_QR, `SELECT id, slug, name_en, name_translit, name_ar, member_count, summary_md, epithet_ar, epithet_attrib, source_slug, revelation_type
                           FROM qr_nazm_group`),
    query<M>(env.DB_QR, `SELECT group_id, surah, member_index, opening_ayah, opening_text_ar, epithet_pair_ar FROM qr_nazm_group_member ORDER BY member_index`),
    query<S>(env.DB_QR, `SELECT id, name_ar, name_en, name_transliteration AS translit, revelation_type AS revelation FROM qr_surah`),
    query<{ surah: number; rank: number | null }>(env.DB_QR, `SELECT surah, rank FROM qr_surah_revelation_rank`),
    allRings(env, L),
  ]);
  const all = surahs.map((s) => s.id);
  const [openings, lines] = await Promise.all([openingsOf(env, all), themeLines(env, all, L)]);
  const aims = new Map<number, string>();
  for (const [s, l] of lines) if (l.aim) aims.set(s, l.aim.text);
  const data: Pools = { groups, members, surahs: new Map(surahs.map((s) => [s.id, s])), schemes: schemesOf(L), openings, aims,
                        ranks: new Map(ranks.map((r) => [r.surah, r.rank])), rings };
  memo = { at: Date.now(), data };
  return data;
}

const surahLabel = (s: S) => `${s.id} · ${s.translit ?? s.name_en} · ${s.name_ar}`;
const groupLabel = (g: G) => g.slug.startsWith('islahi_') ? `${g.name_en} (${g.name_translit})` : g.name_translit ? `${g.name_translit} — ${g.name_en}` : g.name_en;
const groupName = (g: G) => g.slug.startsWith('islahi_') ? `${g.name_en} (${g.name_translit})` : g.name_translit ?? g.name_en;
const amudOf = (g: G) => (/ʿ?Amud[^:]*:\s*([^.]+\.)/i.exec(g.summary_md)?.[1] ?? null);

/// The drills a skill can draw, by kind: a key and a builder (options drawn fresh each time).
function candidates(P: Pools, L: Record<string, Label[]>, scope: { surahs: Set<number> | null; group: string | null }) {
  const gById = new Map(P.groups.map((g) => [g.id, g]));
  const gBySlug = new Map(P.groups.map((g) => [g.slug, g]));
  const groupsOfSurah = new Map<number, G[]>();
  for (const m of P.members) { const g = gById.get(m.group_id); if (g) groupsOfSurah.set(m.surah, [...(groupsOfSurah.get(m.surah) ?? []), g]); }
  const membersOf = (g: G) => P.members.filter((m) => m.group_id === g.id);
  const inScope = (s: number) => !scope.surahs || scope.surahs.has(s);
  const groupInScope = (g: G) => (!scope.group || g.slug === scope.group) && (!scope.surahs || membersOf(g).some((m) => scope.surahs!.has(m.surah)));
  const schemeOf = (g: G) => P.schemes.find((sc) => (sc.slugs ? sc.slugs.includes(g.slug) : sc.sourceSlug === g.source_slug) && sc.key !== 'revelation');
  const classGroups = new Set(['makki', 'madani']);
  const skill = byKey(L.skill).get('groups');
  const openingSlugs = (skill?.extra?.opening_groups as string[] | undefined) ?? ['muqattaat', 'alif_lam_mim', 'alif_lam_ra', 'hawamim', 'tawasin', 'musabbihat', 'muawwidhatan'];
  const src = byKey(L.group_source);
  const cite = (slug: string | null) => src.get(slug ?? '')?.label ?? slug ?? '';
  const openingOf = (m: M | undefined, s: number) => m?.opening_text_ar ? { text: m.opening_text_ar, ayah: m.opening_ayah ?? 1 }
                                                    : P.openings.get(s) ? { text: P.openings.get(s)!.text, ayah: 1 } : null;
  const base = (s: number | null) => s ? { source: { workId: `QR:SURAH:${s}`, title: P.surahs.get(s)?.translit ?? `Surah ${s}`, level: null } } : {};
  type C = { key: string; ask: string; build: (band: 'basic' | 'middle' | 'advanced' | 'all') => Drill | null };
  const out: Record<string, C[]> = {};
  const add = (ask: string, key: string, build: C['build']) => (out[ask] ??= []).push({ key, ask, build });
  const card = (d: Drill, a: { ref: string; front: string; back: string; surah?: number | null; series?: string | null; type?: string; band: any }) =>
    withCard(d, { ref: a.ref, type: a.type ?? 'surah', kind: 'groups', front: a.front, back: a.back, surah: a.surah ?? null, ayah: null,
                  series: a.series ?? null, band: a.band });

  // group_of — each surah in each group of a scheme (the classes Makkī / Madanī have their own ask)
  for (const m of P.members) {
    const g = gById.get(m.group_id);
    const s = P.surahs.get(m.surah);
    if (!g || !s || classGroups.has(g.slug) || !inScope(s.id) || (scope.group && g.slug !== scope.group)) continue;
    const sc = schemeOf(g);
    add('group_of', `${g.slug}:${s.id}`, (band) => {
      const mine = new Set((groupsOfSurah.get(s.id) ?? []).map((x) => x.id));
      const same = P.groups.filter((x) => !mine.has(x.id) && !classGroups.has(x.slug) && schemeOf(x)?.key === sc?.key);
      const rest = P.groups.filter((x) => !mine.has(x.id) && !classGroups.has(x.slug) && schemeOf(x)?.key !== sc?.key);
      const wrong = [...shuffle(same), ...shuffle(rest)].slice(0, 3).map(groupLabel);
      if (wrong.length < 2) return null;
      const answer = groupLabel(g);
      return card({
        id: `groups:group_of:${g.slug}:${s.id}`, kind: 'gist', ask: 'group_of', ...base(s.id),
        prompt: `Sūrat ${s.translit ?? s.name_en} (${s.id}) · ${s.name_ar}${sc ? ` — in ${sc.label.label}` : ''}`,
        options: shuffle([answer, ...wrong]), answer,
        explanation: `${groupName(g)}: ${g.summary_md.split(/(?<=\.)\s/)[0]}\n— ${cite(g.source_slug)}`,
      }, { ref: `QR:groups:group_of:${g.slug}:${s.id}`, front: `${s.translit ?? s.name_en} (${s.id}) — which group${sc ? ` (${sc.label.label})` : ''}?`,
           back: `${groupName(g)}\n${cite(g.source_slug)}`, surah: s.id, series: groupName(g), band });
    });
  }

  // makki_madani — every surah
  const makki = gBySlug.get('makki'), madani = gBySlug.get('madani');
  const scopeGroup = scope.group ? gBySlug.get(scope.group) ?? null : null;
  if (makki && madani) {
    for (const s of P.surahs.values()) {
      if (!inScope(s.id) || (scopeGroup && !membersOf(scopeGroup).some((m) => m.surah === s.id))) continue;
      const g = s.revelation === 'madani' ? madani : makki;
      add('makki_madani', `${s.id}`, (band) => {
        const r = P.ranks.get(s.id);
        const opts = [makki, madani].map((x) => `${x.name_translit} — ${x.name_en}`);
        const answer = `${g.name_translit} — ${g.name_en}`;
        return card({
          id: `groups:makki_madani:${s.id}`, kind: 'gist', ask: 'makki_madani', ...base(s.id),
          prompt: `Sūrat ${s.translit ?? s.name_en} (${s.id}) · ${s.name_ar}`, options: opts, answer,
          explanation: `${g.name_translit} — ${cite(g.source_slug)}${r ? `\nIbn ʿĀshūr counts it ${r}${r % 10 === 1 && r !== 11 ? 'st' : r % 10 === 2 && r !== 12 ? 'nd' : r % 10 === 3 && r !== 13 ? 'rd' : 'th'} in the order of revelation.` : ''}`,
        }, { ref: `QR:groups:makki_madani:${s.id}`, front: `${s.translit ?? s.name_en} (${s.id}) — Makkī or Madanī?`, back: `${g.name_translit}\n${cite(g.source_slug)}`,
             surah: s.id, series: g.name_en, band });
      });
    }
  }

  // opens_with — a member's opening, among its group's members (whose openings differ)
  for (const g of P.groups) {
    if (classGroups.has(g.slug) || g.member_count > 30 || !groupInScope(g)) continue;
    const ms = membersOf(g);
    for (const m of ms) {
      const s = P.surahs.get(m.surah);
      const o = openingOf(m, m.surah);
      if (!s || !o || !inScope(s.id)) continue;
      add('opens_with', `${g.slug}:${s.id}`, (band) => {
        const wrong = shuffle(ms.filter((x) => x.surah !== m.surah && fold(openingOf(x, x.surah)?.text) !== fold(o.text)))
          .slice(0, 3).map((x) => P.surahs.get(x.surah)).filter((x): x is S => !!x).map(surahLabel);
        if (wrong.length < 2) return null;
        return card({
          id: `groups:opens_with:${g.slug}:${s.id}`, kind: 'gist', ask: 'opens_with', ...base(s.id),
          prompt: `${groupName(g)} — which surah opens: ﴿${o.text}﴾?`, options: shuffle([surahLabel(s), ...wrong]), answer: surahLabel(s),
          explanation: `﴿${o.text}﴾ (${s.id}:${o.ayah}) — Sūrat ${s.translit ?? s.name_en}, in ${groupName(g)}`,
        }, { ref: `QR:groups:opens_with:${g.slug}:${s.id}`, front: `﴿${o.text}﴾\n— which surah of ${groupName(g)}?`, back: `${surahLabel(s)} (${s.id}:${o.ayah})`,
             surah: s.id, series: groupName(g), band });
      });
    }
  }

  // epithet — an epithet pair a member's opening carries (member table), and a group's own epithet
  for (const m of P.members.filter((x) => x.epithet_pair_ar)) {
    const g = gById.get(m.group_id); const s = P.surahs.get(m.surah);
    if (!g || !s || !groupInScope(g) || !inScope(s.id)) continue;
    const ms = membersOf(g);
    if (ms.filter((x) => fold(x.epithet_pair_ar) === fold(m.epithet_pair_ar)).length > 1) continue;   // shared: not a question
    add('epithet', `${g.slug}:${s.id}`, (band) => {
      const wrong = shuffle(ms.filter((x) => x.surah !== m.surah && fold(x.epithet_pair_ar) !== fold(m.epithet_pair_ar)))
        .slice(0, 3).map((x) => P.surahs.get(x.surah)).filter((x): x is S => !!x).map(surahLabel);
      if (wrong.length < 2) return null;
      return card({
        id: `groups:epithet:${g.slug}:${s.id}`, kind: 'gist', ask: 'epithet', ...base(s.id),
        prompt: `${groupName(g)} — whose opening names Him ﴿${m.epithet_pair_ar}﴾?`, options: shuffle([surahLabel(s), ...wrong]), answer: surahLabel(s),
        explanation: `﴿${m.opening_text_ar ?? m.epithet_pair_ar}﴾ (${s.id}:${m.opening_ayah ?? ''})`,
      }, { ref: `QR:groups:epithet:${g.slug}:${s.id}`, front: `﴿${m.epithet_pair_ar}﴾ — which surah of ${groupName(g)}?`, back: surahLabel(s), surah: s.id, series: groupName(g), band });
    });
  }
  for (const g of P.groups.filter((x) => x.epithet_ar)) {
    if (!groupInScope(g)) continue;
    add('epithet', g.slug, (band) => {
      const wrong = shuffle(P.groups.filter((x) => x.id !== g.id && !classGroups.has(x.slug) && !x.slug.startsWith('islahi_') && x.slug !== 'farrin_central'))
        .slice(0, 3).map(groupLabel);
      return card({
        id: `groups:epithet:${g.slug}`, kind: 'gist', ask: 'epithet',
        prompt: `Which group is called «${g.epithet_ar}»${g.epithet_attrib ? ` (${g.epithet_attrib})` : ''}?`,
        options: shuffle([groupLabel(g), ...wrong]), answer: groupLabel(g),
        explanation: `${groupName(g)} — «${g.epithet_ar}», ${g.epithet_attrib ?? ''}`,
      }, { ref: `QR:groups:epithet:${g.slug}`, front: `«${g.epithet_ar}» — which group?`, back: `${groupName(g)}\n${g.epithet_attrib ?? ''}`, type: 'group', series: groupName(g), band });
    });
  }

  // shared_opening — a surah's opening; the answer is the smallest opening group it is in
  const openingGroups = openingSlugs.map((x) => gBySlug.get(x)).filter((x): x is G => !!x);
  for (const s of P.surahs.values()) {
    if (!inScope(s.id)) continue;
    const mine = openingGroups.filter((g) => membersOf(g).some((m) => m.surah === s.id)).sort((a, b) => a.member_count - b.member_count);
    const g = mine[0];
    const o = P.openings.get(s.id);
    if (!g || !o || (scope.group && !mine.some((x) => x.slug === scope.group))) continue;
    add('shared_opening', `${s.id}`, (band) => {
      const wrong = shuffle(openingGroups.filter((x) => !mine.includes(x))).slice(0, 3).map(groupLabel);
      if (wrong.length < 2) return null;
      return card({
        id: `groups:shared_opening:${g.slug}:${s.id}`, kind: 'gist', ask: 'shared_opening', ...base(s.id),
        prompt: `﴿${o.text}﴾ — the opening of Sūrat ${s.translit ?? s.name_en} (${s.id}). Which group shares it?`,
        options: shuffle([groupLabel(g), ...wrong]), answer: groupLabel(g),
        explanation: `${groupName(g)}: ${g.summary_md.split(/(?<=\.)\s/)[0]}`,
      }, { ref: `QR:groups:shared_opening:${g.slug}:${s.id}`, front: `﴿${o.text}﴾ — which group shares this opening?`, back: `${groupName(g)} (${s.id})`, surah: s.id, series: groupName(g), band });
    });
  }

  // group_theme — Iṣlāḥī's ʿamūd of each of his groups
  const islahi = P.groups.filter((g) => g.slug.startsWith('islahi_') && amudOf(g)).sort((a, b) => a.slug.localeCompare(b.slug));
  for (const g of islahi) {
    if (!groupInScope(g)) continue;
    add('group_theme', g.slug, (band) => {
      const wrong = shuffle(islahi.filter((x) => x.id !== g.id)).slice(0, 3).map(groupLabel);
      return card({
        id: `groups:group_theme:${g.slug}`, kind: 'gist', ask: 'group_theme',
        prompt: `Iṣlāḥī's ʿamūd (central theme): “${amudOf(g)}” — which group?`, options: shuffle([groupLabel(g), ...wrong]), answer: groupLabel(g),
        explanation: `${g.summary_md}\n— ${cite(g.source_slug)} (paraphrased)`,
      }, { ref: `QR:groups:group_theme:${g.slug}`, front: `“${amudOf(g)}” — which of Iṣlāḥī's groups?`, back: `${groupLabel(g)}\n${cite(g.source_slug)}`, type: 'group', series: g.name_en, band });
    });
  }

  // surah_aim — Ibn ʿĀshūr's aims of a surah, among the members of its Iṣlāḥī group (else its smallest group of four or more)
  for (const s of P.surahs.values()) {
    const aim = P.aims.get(s.id);
    if (!aim || !inScope(s.id)) continue;
    const name = fold(s.name_ar).replace(/^ال/, '');
    if (name.length >= 3 && fold(aim).includes(name)) continue;   // the aim names its surah: no question
    const gs = (groupsOfSurah.get(s.id) ?? []).filter((g) => !classGroups.has(g.slug) && membersOf(g).filter((m) => P.aims.has(m.surah)).length >= 4);
    const g = (scope.group ? gs.find((x) => x.slug === scope.group) : null) ?? gs.find((x) => x.slug.startsWith('islahi_')) ?? gs.sort((a, b) => a.member_count - b.member_count)[0];
    if (!g || (scope.group && g.slug !== scope.group)) continue;
    add('surah_aim', `${g.slug}:${s.id}`, (band) => {
      const wrong = shuffle(membersOf(g).filter((m) => m.surah !== s.id && P.aims.has(m.surah))).slice(0, 3)
        .map((m) => P.surahs.get(m.surah)).filter((x): x is S => !!x).map(surahLabel);
      if (wrong.length < 2) return null;
      return card({
        id: `groups:surah_aim:${g.slug}:${s.id}`, kind: 'gist', ask: 'surah_aim', ...base(s.id),
        prompt: `Ibn ʿĀshūr on the aims of one surah of ${groupName(g)}:\n“${aim}”`, options: shuffle([surahLabel(s), ...wrong]), answer: surahLabel(s),
        explanation: `${surahLabel(s)} — ${cite('ibn_ashur')}, the surah's aims (aghrāḍ)`,
      }, { ref: `QR:groups:surah_aim:${g.slug}:${s.id}`, front: `“${aim}”\n— which surah of ${groupName(g)}?`, back: `${surahLabel(s)}\n${cite('ibn_ashur')}`, surah: s.id, series: groupName(g), band });
    });
  }

  // ring_pair / ring_centre — only where a ring is recorded
  for (const r of P.rings) {
    const touches = (x: { surah?: number }) => x.surah != null && inScope(x.surah);
    if (scope.group && r.group !== scope.group) continue;
    if (scope.surahs && !(r.surah != null ? scope.surahs.has(r.surah) : r.sequence.some(touches))) continue;
    const sideText = (x: { ref: string; text: string | null }) => `${x.text ?? ''} (${x.ref})`.trim();
    const all = [...r.pairs.flatMap((p) => [p.left, p.right]), ...(r.centre ? [r.centre] : [])];
    const series = r.title;
    const srcLine = `${r.source.title ?? ''}${r.confidence ? ` · ${r.confidence}` : ''}`;
    for (const p of r.pairs) {
      add('ring_pair', `${r.id}:${p.label}`, (band) => {
        const flip = Math.random() < 0.5;
        const [from, to] = flip ? [p.right, p.left] : [p.left, p.right];
        const wrong = shuffle(all.filter((x) => x !== p.left && x !== p.right)).slice(0, 3).map(sideText);
        if (wrong.length < 2) return null;
        return card({
          id: `groups:ring_pair:${r.id}:${p.label}`, kind: 'gist', ask: 'ring_pair', ...base(r.surah),
          prompt: `${r.title}${r.notation ? ` (${r.notation})` : ''}\nWhich part answers ${from.label}: “${sideText(from)}”?`,
          options: shuffle([sideText(to), ...wrong]), answer: sideText(to),
          explanation: `${p.left.label} ${sideText(p.left)} ↔ ${p.right.label} ${sideText(p.right)}${p.evidence ? `\n${p.evidence}` : p.basis ? `\n${p.basis}` : ''}\n— ${srcLine}`,
        }, { ref: `QR:groups:ring_pair:${r.id}:${p.label}`, front: `${r.title}\n“${sideText(p.left)}” — its answer in the ring?`,
             back: `${sideText(p.right)}\n${srcLine}`, surah: r.surah, series, type: 'passage', band });
      });
    }
    if (r.centre && r.pairs.length >= 2) {
      add('ring_centre', r.id, (band) => {
        const wrong = shuffle(r.pairs.flatMap((p) => [p.left, p.right])).slice(0, 3).map(sideText);
        return card({
          id: `groups:ring_centre:${r.id}`, kind: 'gist', ask: 'ring_centre', ...base(r.surah),
          prompt: `${r.title}${r.notation ? ` (${r.notation})` : ''}\nWhat stands at its centre?`,
          options: shuffle([sideText(r.centre!), ...wrong]), answer: sideText(r.centre!),
          explanation: `${r.summary ?? ''}\n— ${srcLine}`.trim(),
        }, { ref: `QR:groups:ring_centre:${r.id}`, front: `${r.title} — its centre?`, back: `${sideText(r.centre!)}\n${srcLine}`, surah: r.surah, series, type: 'passage', band });
      });
    }
  }
  return out;
}

/// The scope a session asks for: ?surah (and ?from/?to are ignored here), ?group=<slug>, ?surahs=a,b,c.
function scopeOf(scope: Scope, u: URL | null) {
  const list = (u?.searchParams.get('surahs') ?? '').split(',').map(Number).filter((n) => n >= 1 && n <= 114);
  const surahs = list.length ? new Set(list) : scope.surah ? new Set([scope.surah]) : null;
  return { surahs, group: u?.searchParams.get('group')?.replace(/^QR:NZ:/, '') || null };
}

export async function groupDrills(env: QuranEnv, n: number, scope: Scope, lv: Record<string, unknown>, L: Record<string, Label[]>, u: URL | null = null): Promise<Drill[]> {
  const { band, asks } = levelOf(L, 'groups', lv);
  const P = await pools(env, L);
  const C = candidates(P, L, scopeOf(scope, u));
  const piles = asks.map((a) => shuffle(C[a] ?? []));
  const out: Drill[] = [];
  const seen = new Set<string>();
  // taken in turn across the level's kinds; a candidate that cannot fill its options is passed over
  for (const c of interleave(piles, n * 3)) {
    if (out.length >= n) break;
    if (seen.has(`${c.ask}:${c.key}`)) continue;
    seen.add(`${c.ask}:${c.key}`);
    const d = c.build(band);
    if (d) out.push(d);
  }
  return out;
}

/// How many drills the skill can draw across the Qurʾān (every kind's candidates).
export async function groupsCount(env: QuranEnv, L: Record<string, Label[]>): Promise<number> {
  const C = candidates(await pools(env, L), L, { surahs: null, group: null });
  return uniq(Object.values(C).flat().map((c) => `${c.ask}:${c.key}`)).length;
}
