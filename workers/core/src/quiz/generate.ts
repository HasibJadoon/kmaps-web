export interface Draft {
  prompt: string;
  options: string[];
  correctIndex: number;

  kind: 'vocabulary' | 'expression' | 'sentence_structure' | 'reading';
  fromCardId: string;
  explanation?: string | null;
}

export interface SourceCard {
  id: string;
  module: string;
  resource_type: string | null;
  resource_ref: string | null;
  card_kind: string | null;
  front_text: string | null;
  back_text: string | null;
  note_type_id: string | null;
  fields_json: string | null;
}

function parse(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch { return null; }
}

const clean = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length ? s : null;
};

function seededOrder(n: number, seed: string): number[] {
  let h = 2166136261;
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    const j = Math.abs(h) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function assemble(correct: string, distractors: string[], seed: string) {
  const pool = [correct, ...distractors];
  const order = seededOrder(pool.length, seed);
  const options = order.map((i) => pool[i]);
  return { options, correctIndex: options.indexOf(correct) };
}

function distractorsFrom(pool: string[], correct: string, want = 3): string[] {
  const seen = new Set([correct.trim().toLowerCase()]);
  const out: string[] = [];
  for (const candidate of pool) {
    const key = candidate.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
    if (out.length === want) break;
  }
  return out;
}

function fromPlainCard(card: SourceCard, siblings: SourceCard[]): Draft | null {
  const front = clean(card.front_text);
  const back = clean(card.back_text);
  if (!front || !back) return null;

  const pool = siblings
    .filter((s) => s.id !== card.id && s.card_kind === card.card_kind)
    .map((s) => clean(s.back_text))
    .filter((s): s is string => !!s);

  const distractors = distractorsFrom(pool, back);
  if (distractors.length < 3) return null;

  const { options, correctIndex } = assemble(back, distractors, card.id);
  return {
    prompt: front,
    options,
    correctIndex,
    kind: card.card_kind === 'translation' ? 'reading'
        : card.card_kind === 'expression' ? 'expression'
        : card.resource_type === 'ayah' ? 'sentence_structure' : 'vocabulary',
    fromCardId: card.id,
  };
}

interface Radical { l?: string; name?: string; makhraj?: string; sifa?: string }

function fromRootCard(card: SourceCard, siblings: SourceCard[]): Draft[] {
  const fields = parse(card.fields_json);
  const root = clean(fields?.['Root']);
  const radicals = Array.isArray(fields?.['Radicals'])
    ? (fields!['Radicals'] as Radical[]) : [];
  if (!root || radicals.length === 0) return [];

  const allMakharij: string[] = [];
  for (const s of siblings) {
    const f = parse(s.fields_json);
    for (const r of (Array.isArray(f?.['Radicals']) ? f!['Radicals'] as Radical[] : [])) {
      const m = clean(r.makhraj);
      if (m) allMakharij.push(m);
    }
  }

  const drafts: Draft[] = [];
  for (const r of radicals) {
    const letter = clean(r.l);
    const makhraj = clean(r.makhraj);
    if (!letter || !makhraj) continue;
    const distractors = distractorsFrom(
      allMakharij.filter((m) => m !== makhraj), makhraj);
    if (distractors.length < 3) continue;
    const { options, correctIndex } = assemble(makhraj, distractors, `${card.id}:${letter}`);
    drafts.push({
      prompt: `في الجذر ${root} — ما مخرج حرف ${letter}؟`,
      options,
      correctIndex,
      kind: 'sentence_structure',
      fromCardId: `${card.id}:makhraj:${letter}`,
      explanation: clean(r.name) ? `${r.name} · ${makhraj}` : makhraj,
    });
  }
  return drafts;
}

function fromLemmaCard(card: SourceCard, siblings: SourceCard[]): Draft[] {
  const fields = parse(card.fields_json);
  const lemma = clean(fields?.['Lemma']) ?? clean(fields?.['Word']);
  const wazn = clean(fields?.['Wazn']) ?? clean(fields?.['WaznAr']);
  if (!lemma || !wazn) return [];

  const pool: string[] = [];
  for (const s of siblings) {
    if (s.id === card.id) continue;
    const f = parse(s.fields_json);
    const w = clean(f?.['Wazn']) ?? clean(f?.['WaznAr']);
    if (w) pool.push(w);
  }
  const distractors = distractorsFrom(pool, wazn);
  if (distractors.length < 3) return [];

  const { options, correctIndex } = assemble(wazn, distractors, card.id);
  return [{
    prompt: `${lemma} — على أي وزن؟`,
    options,
    correctIndex,
    kind: 'vocabulary',
    fromCardId: `${card.id}:wazn`,
  }];
}

export function generateDrafts(cards: SourceCard[]): {
  drafts: Draft[]; skipped: number;
} {
  const drafts: Draft[] = [];
  let skipped = 0;

  for (const card of cards) {
    let made: Draft[] = [];
    switch (card.note_type_id) {
      case 'NT:kmaps:root:v1':
        made = fromRootCard(card, cards);
        break;
      case 'NT:kmaps:lemma:sarf:v9':
        made = fromLemmaCard(card, cards);
        break;
      default: {
        const one = fromPlainCard(card, cards);
        made = one ? [one] : [];
      }
    }
    if (made.length === 0) skipped++;
    drafts.push(...made);
  }
  return { drafts, skipped };
}
