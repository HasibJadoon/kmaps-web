import { query, queryOne } from '../../../shared/src/db';
import { str, num } from '../../../shared/src/shaping';
import type {
  DisplaySpec, DsBlock, DsForm, DsSection, DsReading, DsPlane, DsRecord, DsBar,
  DsChapter,
} from '../../../shared/src/contracts/ds';
import type { CoreEnv } from '../env';
import { cardSections, type CardForm } from './card-ds.repo';

const AL_DS = '/al/ds/root';

const CORE_CHAPTERS: { chapter: DsChapter; after: string }[] = [
  {
    after: 'relations',
    chapter: {
      key: 'quran',
      title: 'Where it lives',
      title_ar: 'في القرآن',
      question: 'Its spread across the muṣḥaf.',
    },
  },
];

function mergeChapters(fromDomain: DsChapter[], sections: { chapter: string }[]): DsChapter[] {
  const out = [...fromDomain];
  const announced = new Set(out.map((c) => c.key));
  const used = new Set(sections.map((s) => s.chapter));

  for (const { chapter, after } of CORE_CHAPTERS) {
    if (announced.has(chapter.key) || !used.has(chapter.key)) continue;
    const at = out.findIndex((c) => c.key === after);
    if (at >= 0) out.splice(at + 1, 0, chapter);
    else out.push(chapter);
    announced.add(chapter.key);
  }
  return out;
}

const CAP: Record<DsForm, number> = { desktop: 8, mobile: 3 };

interface CardRow {
  id: string; card_kind: string | null; resource_type: string;
  front_text: string; back_text: string; card_state: string;
  next_review_at: string | null; reps: number; lapses: number;
  note_type_id: string | null; fields_json: string | null;
}

function fieldsOf(card: CardRow): Record<string, unknown> | null {
  if (!card.fields_json) return null;
  try {
    const parsed: unknown = JSON.parse(card.fields_json);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export class CoreDsRepo {
  constructor(private db: D1Database, private env: CoreEnv) {}

  async root(root: string, form: DsForm = 'desktop'): Promise<DisplaySpec> {
    const cap = CAP[form] ?? CAP.desktop;

    const [layers, plane, cards, spread] = await Promise.all([
      this.layerSpec(root, form),
      this.plane(root),
      this.cards(root, cap, form),
      this.distribution(root),
    ]);

    const sections: DsSection[] = [
      ...(layers?.sections ?? [{
        chapter: 'identity',
        code: '00-CORE', band: 'CORE', title: 'Layers', state: 'unknown' as const,
        total_rows: 0, carriers: [], accent: null,
        blocks: [{
          kind: 'note' as const, note_kind: 'unknown' as const,
          text: 'The linguistics worker did not answer, so this root\'s layers could not be read. This is a reachability problem, not an empty root.',
        }],
      }]),
      ...(cards ?? []),
      ...(spread ? [spread] : []),
    ];

    const chapters = mergeChapters(layers?.chapters ?? [], sections);
    const order = new Map(chapters.map((c, i) => [c.key, i]));
    sections.sort((a, b) => (order.get(a.chapter) ?? 99) - (order.get(b.chapter) ?? 99));

    return {
      chapters: chapters.filter((c) => sections.some((s) => s.chapter === c.key)),
      subject: layers?.subject ?? {
        kind: 'root', ref: root,
        display: { text: root.split('').join(' '), script: 'ar' },
      },
      scope: 'root',
      form,
      sections,
      plane,
      summary: {
        filled: sections.filter((s) => s.state === 'filled').length,
        empty: sections.filter((s) => s.state === 'empty').length,
        unknown: sections.filter((s) => s.state === 'unknown').length,
        rows: sections.reduce((a, s) => a + s.total_rows, 0),
      },
    };
  }

  private async layerSpec(root: string, form: DsForm): Promise<DisplaySpec | null> {
    const al = this.env.AR_LINGUISTICS;
    if (!al) return null;
    try {
      const res = await al.fetch(new Request(
        `http://internal.k-maps.local${AL_DS}/${encodeURIComponent(root)}?form=${form}`,
      ));
      if (!res.ok) return null;
      const body = await res.json<{ data?: DisplaySpec }>();
      return body?.data ?? null;
    } catch {
      return null;
    }
  }

  private async plane(root: string): Promise<DsPlane> {
    const node = await queryOne<{ id: string }>(
      this.db,
      `SELECT id FROM cyb_node
        WHERE scale = 'root'
          AND (json_extract(meta_json, '$.root_ar') = ? OR target_ref = ?)
        ORDER BY CASE WHEN json_extract(meta_json, '$.root_ar') = ? THEN 0 ELSE 1 END
        LIMIT 1`,
      [root, root, root],
    ).catch(() => null);

    if (!node) return { node_id: null, readings: [] };

    const rows = await query<{
      axis: string; pct: number; measured: number; stale: number;
      sensors: number; read_sensors: number;
    }>(
      this.db,
      `SELECT axis, pct, measured, stale, sensors, read_sensors
         FROM v_cyb_node_reading WHERE node_id = ? ORDER BY axis`,
      [node.id],
    ).catch(() => []);

    const readings: DsReading[] = rows.map((r) => ({
      axis: r.axis,
      pct: num(r.pct),

      measured: num(r.measured) === 1,
      stale: num(r.stale) === 1,
      sensors: num(r.sensors),
      read_sensors: num(r.read_sensors),
    }));
    return { node_id: node.id, readings };
  }

  private async cards(root: string, cap: number, form: DsForm): Promise<DsSection[]> {
    const rows = await query<CardRow>(
      this.db,
      `SELECT id, card_kind, resource_type, front_text, back_text, card_state,
              next_review_at, reps, lapses, note_type_id, fields_json
         FROM core_srs_card
        WHERE root_norm = ? OR resource_ref = ?
        ORDER BY CASE resource_type WHEN 'root' THEN 0 WHEN 'lemma' THEN 1 ELSE 2 END,
                 datetime(next_review_at) IS NULL, datetime(next_review_at)`,
      [root, root],
    ).catch(() => [] as CardRow[]);

    if (!rows.length) {
      return [this.noteSection('remember', '90-CARD', 'LEARN', 'Cards', 'البطاقات',
        'empty', 'No card has been built for this root yet.')];
    }

    const records: DsRecord[] = rows.slice(0, cap).map((c): DsRecord => ({
      id: c.id,
      badges: [
        ...(c.card_kind ? [{ label: '', value: c.card_kind, tone: 'plain' as const }] : []),
        { label: '', value: c.card_state, tone: (c.card_state === 'review' ? 'ok' : 'warn') as 'ok' | 'warn' },

        ...(c.note_type_id ? [{ label: 'note type', value: c.note_type_id, tone: 'strong' as const }] : []),
        ...(c.lapses > 0 ? [{ label: 'lapses', value: String(c.lapses), tone: 'warn' as const }] : []),
      ],
      ar: c.front_text ? { text: c.front_text, script: 'ar' as const } : undefined,
      en: c.back_text ? { text: c.back_text, script: 'latin' as const } : undefined,
      facts: [
        ...(c.next_review_at ? [{ label: 'due', value: { text: c.next_review_at.slice(0, 10), script: 'latin' as const } }] : []),
        ...(c.reps ? [{ label: 'reviews', value: { text: String(c.reps), script: 'latin' as const } }] : []),
      ],
    }));

    const richest = rows
      .map((c) => ({ card: c, fields: fieldsOf(c) }))
      .filter((x): x is { card: CardRow; fields: Record<string, unknown> } => x.fields !== null)
      .sort((a, b) => Object.keys(b.fields).length - Object.keys(a.fields).length)[0];

    const authored: DsSection[] = richest
      ? cardSections(richest.fields, form as CardForm).map((group) => ({
          chapter: group[0].chapter,
          code: group[0].code,
          band: 'LEARN',
          title: group[0].title,
          title_ar: group[0].title_ar,
          accent: null,
          state: 'filled' as const,
          total_rows: group.length,
          carriers: ['core_srs_card', 'core_srs_note_type'],

          blocks: group.map((p) =>
            p.block.title === group[0].title
              ? { ...p.block, title: undefined }
              : p.block),
        }))
      : [];

    return [
      ...authored,
      {
        chapter: 'remember',
        code: '90-CARD', band: 'LEARN', title: 'Cards', title_ar: 'البطاقات',
        icon: '🃏', accent: null, state: 'filled',
        total_rows: rows.length, carriers: ['core_srs_card'],
        blocks: [{
          kind: 'card_list',
          title: 'Scheduling',
          hint: `${rows.length} card${rows.length === 1 ? '' : 's'} · soonest due first`,
          records, overflow_count: Math.max(0, rows.length - cap),
        }],
      },
    ];
  }

  private async distribution(root: string): Promise<DsSection | null> {
    const rows = await query<{ surah: number; n_occur: number; is_intro: number }>(
      this.db,
      `SELECT s.surah,
              MAX(s.n_occur)  AS n_occur,
              MAX(s.is_intro) AS is_intro
         FROM core_srs_card_surah s
         JOIN core_srs_card c ON c.id = s.card_id
        WHERE c.root_norm = ? OR c.resource_ref = ?
        GROUP BY s.surah
        ORDER BY s.surah`,
      [root, root],
    ).catch(() => [] as { surah: number; n_occur: number; is_intro: number }[]);

    if (!rows.length) return null;

    const total = rows.reduce((a, r) => a + num(r.n_occur), 0);
    const top = Math.max(1, ...rows.map((r) => num(r.n_occur)));
    const intro = rows.find((r) => num(r.is_intro) === 1);

    const bars: DsBar[] = rows
      .slice()
      .sort((a, b) => num(b.n_occur) - num(a.n_occur))
      .map((r) => ({
        id: `surah-${r.surah}`,
        label: { text: `Sūra ${r.surah}`, script: 'latin' as const },
        sublabel: num(r.is_intro) === 1 ? 'first met here' : undefined,
        value: String(num(r.n_occur)),
        fraction: num(r.n_occur) / top,
      }));

    return {
      chapter: 'quran',
      code: '91-QURAN', band: 'SRC', title: 'Qurʾānic distribution',
      title_ar: 'التوزيع القرآني', icon: '📜', accent: null, state: 'filled',
      total_rows: rows.length, carriers: ['core_srs_card_surah'],
      blocks: [{
        kind: 'bars',
        title: 'Across the muṣḥaf',
        hint: `${rows.length} sūras · ${total} occurrences`
          + (intro ? ` · first met in ${intro.surah}` : ''),
        bars,
      } as DsBlock],
    };
  }

  private noteSection(
    chapter: string, code: string, band: string, title: string, titleAr: string,
    state: 'empty' | 'unknown', text: string,
  ): DsSection {
    return {
      chapter,
      code, band, title, title_ar: titleAr, accent: null, state,
      total_rows: 0, carriers: [],
      blocks: [{ kind: 'note', note_kind: state, text }],
    };
  }
}
