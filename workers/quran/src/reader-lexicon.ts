// The app's one reader (owner, 2026-11-18: "one universal reader — the same for the lexicons"): a root's page and a
// lemma's page served as ReaderDocuments — head + reader markdown (kmaps-ios KMReader: `##` bands with `:icon:`, `>`
// panels, `|` tables, numbered steps, `::door[label | sub](url)` cards, `::word[word](url)` tiles, `- ` bullets whose links open the dictionaries).

export interface ReaderAddress { title: string; module: string; path: string }
export interface ReaderDocument {
  docId: string; title: string; titleAr?: string | null; kicker?: string | null; kickerAr?: string | null;
  badge?: string | null; facts?: string[]; body: string; siblings?: ReaderAddress[]; siblingsLabel?: string | null;
  marks?: { ref: string; domain: string } | null; cite?: string | null;
}

type Src = { book: string; page?: number | null; source: string; root: string; block?: string | null };
type Any = Record<string, any>;

const strip = (s: unknown): string =>
  typeof s === 'string' ? s.replace(/[‎‏⁦-⁩]/g, '').replace(/\s*\n+\s*/g, ' ').trim() : '';
const lexLink = (s: Src) => `com.kmaps.app://lexicon/reader/${encodeURIComponent(s.source)}/${encodeURIComponent(s.root)}`;
/// The books a line rests on, each a link to its entry: "[al-Rāghib 609](…) · [Ṣiḥāḥ 1528](…)".
export const cites = (ss: Src[] | null | undefined): string =>
  (ss ?? []).map((s) => `[${s.book}${s.page ? ` ${s.page}` : ''}](${lexLink(s)})`).join(' · ');
const withCites = (line: string, ss?: Src[] | null) => (ss?.length ? `${line} — ${cites(ss)}` : line);

const lemmaTile = (l: Any) => `::word[${strip(l.lemma)}](com.kmaps.app://reader/qr/reader/lemma/${encodeURIComponent(l.id)})`;

function constructionsMd(cs: Any[]): string[] {
  const out: string[] = [];
  for (const c of cs) {
    out.push(`### ${strip(c.construction)}${c.count != null ? ` · ${c.count}×` : ''}`);
    if (c.line) out.push(strip(c.line));
    if (c.lineAr) out.push(strip(c.lineAr));
    if (c.note) out.push(withCites(strip(c.note), c.sources));
    if (c.quote) out.push(`> ${strip(c.quote)}${c.quoteEn ? `\n> *${strip(c.quoteEn)}*` : ''}`);
  }
  return out;
}

function opposites(os: Any[]): string[] {
  return os.map((o) => `- **${strip(o.ar)}** — ${strip(o.en)}${o.kind ? ` (${strip(o.kind)})` : ''}${o.note ? `. ${strip(o.note)}` : ''}${o.quote ? ` ${strip(o.quote)}` : ''}${o.sources?.length ? ` — ${cites(o.sources)}` : ''}`);
}

function prepsMd(ps: Any[]): string[] {
  return ps.map((p) => `- **${strip(p.usage ?? p.prep)}** — ${strip(p.meaning)}${p.name ? ` (${strip(p.name)})` : ''}${p.quote ? ` ${strip(p.quote)}` : ''}${p.sources?.length ? ` — ${cites(p.sources)}` : ''}`);
}

/// One verb table: its chips as a line, then label | value rows.
function tableMd(t: Any): string[] {
  const out = [`### ${strip(t.title)}${t.meaning ? ` — ${strip(t.meaning)}` : ''}`];
  if (Array.isArray(t.chips) && t.chips.length) out.push(t.chips.map(strip).join(' · '));
  const rows: string[][] = [];
  for (const row of t.table ?? []) for (const cell of row ?? []) if (cell?.label) rows.push([strip(cell.label), strip(cell.value)]);
  if (rows.length) out.push(rows.map((r) => `| ${r.join(' | ')} |`).join('\n'));
  return out;
}

/// A root's page: the picture behind it, its first meaning book by book, every dictionary that files it (doors into
/// the one reader's entries), its family in the Qurʾān with prepositions, how it is used, its arcs, near words,
/// opposites, and its words (doors to their lemma pages).
export function rootReaderDoc(page: Any, dictionaries: Array<{ slug: string; title: string; key: string; author?: string | null; death?: number | null }>): ReaderDocument {
  const md: string[] = [];
  if (page.picture?.en) md.push(strip(page.picture.en));
  if (page.picture?.ar) md.push(strip(page.picture.ar));

  const asl = page.asl;
  if (asl?.primary || asl?.books?.length) {
    md.push('## :lightbulb: Its first meaning · الأصل {#asl}');
    if (asl.primary) {
      md.push(`> ${strip(asl.primary.ar)}\n> *${strip(asl.primary.en)}*\n> **${cites([asl.primary.source])}**`);
    }
    for (const b of asl.books ?? []) md.push(`- ${strip(b.ar)} — *${strip(b.en)}*${b.source ? ` — ${cites([b.source])}` : ''}`);
  }

  if (dictionaries.length) {
    md.push('## :books.vertical: In every dictionary · المعاجم {#books}');
    for (const d of dictionaries) {
      md.push(`::door[${d.title} | ${[d.author, d.death ? `ت ${d.death}هـ` : null].filter(Boolean).join(' · ')}](com.kmaps.app://reader/al/reader/entry/${encodeURIComponent(d.slug)}/${encodeURIComponent(d.key)})`);
    }
  }

  for (const f of page.families ?? []) {
    if (!f.lines?.length) continue;
    md.push('## :point.3.connected.trianglepath.dotted: Same root in the Qurʾān · الأسرة {#family}');
    if (f.gloss) md.push(strip(f.gloss));
    for (const l of f.lines) {
      md.push(`### ${l.form ? `Form ${strip(l.form)} · ` : ''}${strip(l.line)}`);
      md.push(`${strip(l.meaning)}${l.inQuran != null ? ` — ${l.inQuran}× in the Qurʾān` : ''}`);
      if (l.quote) md.push(`> ${strip(l.quote)}`);
      md.push(...prepsMd(l.preps ?? []));
    }
  }
  if (page.preps?.length) md.push('## :arrow.triangle.branch: Prepositions · حروف الجر {#preps}', ...prepsMd(page.preps));
  if (page.constructions?.length) md.push('## :text.word.spacing: How it is used · التراكيب {#uses}', ...constructionsMd(page.constructions));

  const arcs = (page.arcs ?? []).filter((a: Any) => a.steps?.length);
  if (arcs.length) {
    md.push('## :arrow.right.circle: How the meaning moves · المسار {#arcs}');
    for (const a of arcs) {
      md.push(`### ${strip(a.lemma)}${a.count != null ? ` · ${a.count}×` : ''}`);
      a.steps.forEach((s: string, i: number) => md.push(`${i + 1}. ${strip(s)}`));
    }
  }
  for (const n of page.nearOverview ?? []) {
    md.push(`## :circle.grid.cross: Near in meaning · ${strip(n.titleAr ?? n.title)} {#near}`);
    md.push(['| Word | What it says |', ...(n.members ?? []).map((m: Any) => `| ${strip(m.ar)} | ${strip(m.en)} |`)].join('\n'));
  }
  if (page.opposites?.length) md.push('## :arrow.left.arrow.right: Opposites · الأضداد {#opposites}', ...opposites(page.opposites));
  for (const l of page.layers ?? []) md.push(`- ${strip(l.en ?? l.title ?? '')}${l.ar ? ` — ${strip(l.ar)}` : ''}`);
  // the words as small tiles, only the word on each (owner, 2026-11-18: "6 cards, tiny, word only"); its page has the rest
  if (page.lemmas?.length) md.push('## :character.book.closed: Its words · الكلمات {#words}', ...page.lemmas.map(lemmaTile));

  const root = strip(page.root);
  return {
    docId: `QR:ROOT:${root}`,
    title: root,
    kicker: 'Root',
    kickerAr: 'الجذر',
    badge: page.count != null ? `${page.count}× in the Qurʾān` : null,
    facts: [dictionaries.length ? `${dictionaries.length} dictionaries` : null, page.lemmas?.length ? `${page.lemmas.length} words` : null]
      .filter((x): x is string => !!x),
    body: md.join('\n\n'),
    marks: { ref: `QRROOT:${root}`, domain: 'lexicon' },
  };
}

/// A lemma's page: what it is (form, pattern, origin), how its meaning moves, its plurals, its verb tables, its
/// prepositions, its ranges across the Qurʾān, how it is used, near words, opposites, and a door to its root.
export function lemmaReaderDoc(page: Any): ReaderDocument {
  const md: string[] = [];
  const o = page.origin;
  if (o) md.push([o.verb && `**${strip(o.verb)}**`, strip(o.meaning ?? ''), o.family && strip(o.family), o.derivation && strip(o.derivation)].filter(Boolean).join(' — '));
  if (page.arcSteps?.length) {
    md.push('## :arrow.right.circle: How the meaning moves · المسار {#arc}');
    page.arcSteps.forEach((s: Any, i: number) => md.push(`${i + 1}. ${strip(typeof s === 'string' ? s : s.en ?? s.label ?? '')}`));
  }
  const plurals = [...(page.plurals ?? []), ...(page.otherPlurals ?? [])];
  if (plurals.length) {
    md.push('## :square.stack.3d.up: Plurals · الجموع {#plurals}');
    for (const p of plurals) md.push(`- **${strip(p.ar ?? p.plural ?? p.form ?? '')}**${p.pattern ? ` (${strip(p.pattern)})` : ''}${p.count != null ? ` — ${p.count}×` : ''}${p.note ? ` — ${strip(p.note)}` : ''}`);
  }
  if (page.tables?.length) md.push('## :tablecells: The verb tables · الصرف الصغير {#tables}', ...page.tables.flatMap(tableMd));
  if (page.preps?.length) md.push('## :arrow.triangle.branch: Prepositions · حروف الجر {#preps}', ...prepsMd(page.preps));
  if (page.ranges?.length) {
    md.push('## :scope: Its meanings in the Qurʾān · المعاني {#ranges}');
    for (const r of page.ranges) md.push(withCites(`- **${strip(r.en ?? r.meaning ?? '')}**${r.ar ? ` — ${strip(r.ar)}` : ''}${r.count != null ? ` · ${r.count}×` : ''}${r.quote ? ` ${strip(r.quote)}` : ''}`, r.sources));
  }
  if (page.constructions?.length) md.push('## :text.word.spacing: How it is used · التراكيب {#uses}', ...constructionsMd(page.constructions));
  for (const n of page.near ?? []) {
    md.push(`## :circle.grid.cross: Near in meaning · ${strip(n.titleAr ?? n.title)} {#near}`);
    if (n.contrast) md.push(withCites(strip(n.contrast), n.sources));
  }
  if (page.opposites?.length) md.push('## :arrow.left.arrow.right: Opposites · الأضداد {#opposites}', ...opposites(page.opposites));
  const root = strip(page.root);
  if (root) md.push(`::door[${root} | The root, in every dictionary](com.kmaps.app://reader/qr/reader/root/${encodeURIComponent(root)})`);

  return {
    docId: `QR:LEMMA:${page.id}`,
    title: strip(page.lemma),
    kicker: 'Word',
    kickerAr: 'اللفظة',
    badge: page.count != null ? `${page.count}× in the Qurʾān` : null,
    facts: [page.form, page.pattern, root ? `root ${root}` : null].filter(Boolean).map(strip),
    body: md.join('\n\n') || 'This word has no page yet.',
    marks: { ref: `QRLEMMA:${page.id}`, domain: 'lexicon' },
  };
}
