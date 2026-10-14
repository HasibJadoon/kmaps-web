import type { WvRhetoricDevice, WvRhetoricTerm, WvRhetoricUsage } from '../repositories/rhetoric.repo';
import { clozeQuote } from './rhetoric-cards';

/**
 * Worldview drills — what the learner practises in WV, each carrying the review card it files once answered
 * (module WV; core files it on the first answer, and SRS reviews it from then on). Nothing goes to review that was
 * not practised: these replace the rhetoric cards that were pushed to SRS unpractised.
 *
 *   rhetoric   recognise (the figure → what it says) · reach for it (the sense → the figure) ·
 *              what it hides (the figure → what it takes off the table) · which figure (balāgha pairing) ·
 *              in the wild (an attested quotation, the figure blanked)
 *   arc        a phase's links: the concept asks, the passage that carries it is chosen among the phase's others
 *
 * Wrong options are always other real entries of the same kind, never made up.
 */

export type Drill = Record<string, unknown>;

const shuffle = <T>(xs: T[], seed = '') => {
  const a = [...xs];
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  for (let i = a.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const clip = (t: string, n = 140) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + ' …' : t);
const lines = (...xs: Array<string | null | undefined | false>) => xs.filter((x): x is string => !!x && !!x.trim()).join('\n');

/** n others, distinct from the answer and each other, the closest in length first. */
function others(answer: string, pool: Array<string | null | undefined>, seed: string, n = 3): string[] {
  const seen = new Set([answer.trim().toLowerCase()]);
  const xs = shuffle(pool.filter((x): x is string => !!x && !!x.trim()).map((x) => clip(x.trim())), seed)
    .filter((x) => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  return xs.sort((a, b) => Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length)).slice(0, n);
}

/** The review card a drill files when it is answered: the drill itself kept to replay. */
function filed(d: Drill, ref: string, kind: string, front: string, back: string, group: Record<string, unknown>): Drill {
  const { srs: _s, ...drill } = d;
  return { ...d, srs: { module: 'WV', resource_type: 'concept', resource_ref: ref, card_kind: kind, card_template: String(d.kind),
                        front_text: front, back_text: back, extra: { drill, group } } };
}

function choose(id: string, prompt: string, answer: string, wrong: string[], extra: Drill): Drill | null {
  if (wrong.length < 2) return null;
  return { id, kind: 'feature', interaction: 'choose', script: 'english', prompt, answer,
           options: shuffle([clip(answer), ...wrong], id), ...extra, ...(extra.answer ? {} : { answer: clip(answer) }) };
}

export function rhetoricDrills(terms: WvRhetoricTerm[], pool: WvRhetoricTerm[], devices: WvRhetoricDevice[],
                               usages: WvRhetoricUsage[]): Drill[] {
  const dev = new Map(devices.map((d) => [d.id, d]));
  const name = (d: WvRhetoricDevice | undefined) => (d ? (d.title_ar && d.title_ar.replace(/[—\-\s]/g, '') ? `${d.title} (${d.title_ar})` : d.title) : null);
  const out: Drill[] = [];
  for (const t of terms) {
    const d = t.device_id ? dev.get(t.device_id) : undefined;
    const group = { skill: 'rhetoric', series: name(d) ?? 'Rhetoric', workId: `WV:rhetoric:${t.id}`, work: t.term, band: null, episode: null, scene: null };
    const badge = [{ label: 'Rhetoric', labelAr: 'بلاغة الخطاب', color: '#B388EB' }];
    const push = (x: Drill | null, tpl: string, front: string, back: string) => {
      if (x) out.push(filed({ ...x, badges: badge }, `WV:rhetoric:${tpl}:${t.id}`, `rhetoric_${tpl}`, front, back, group));
    };
    const fig = clip(t.figurative_sense ?? '');
    if (t.figurative_sense) {
      push(choose(`wv:rhetoric:recognise:${t.id}`, `“${t.term}”`, fig,
        others(fig, pool.filter((p) => p.id !== t.id).map((p) => p.figurative_sense), t.id), {
          promptEn: t.target_domain ? `a figure used in ${t.target_domain} — what is it saying?` : 'What is it saying?',
          instruction: 'Choose what the figure is saying', explanation: lines(t.figurative_sense, name(d) && `Figure: ${name(d)}`,
            t.literal_sense && `Picture: ${t.literal_sense}`, t.highlights && `Foregrounds: ${t.highlights}`) }),
        'recognition', t.term, t.figurative_sense);
      push(choose(`wv:rhetoric:reach:${t.id}`, `“${fig}”`, t.term,
        others(t.term, pool.filter((p) => p.id !== t.id && p.device_id === t.device_id).map((p) => p.term)
          .concat(pool.filter((p) => p.id !== t.id).map((p) => p.term)), t.id + 'r'), {
          promptEn: 'Which figure says this?', instruction: 'Reach for the figure that says it',
          explanation: lines(t.term, t.literal_sense, t.origin_note, t.counter_term && `Counter-move: ${t.counter_term}`) }),
        'production', t.figurative_sense, t.term);
    }
    if (t.hides) {
      const hid = clip(t.hides);
      push(choose(`wv:rhetoric:hides:${t.id}`, `“${t.term}”`, hid, others(hid, pool.filter((p) => p.id !== t.id).map((p) => p.hides), t.id + 'h'), {
        promptEn: 'What does this figure take off the table?', instruction: 'Choose what the figure hides',
        explanation: lines(t.hides, t.highlights && `It puts forward instead: ${t.highlights}`, t.counter_term && `Counter-move: ${t.counter_term}`) }),
        'critique', t.term, t.hides);
    }
    if (d) {
      const nm = name(d)!;
      push(choose(`wv:rhetoric:device:${t.id}`, `“${t.term}”`, nm, others(nm, devices.filter((x) => x.id !== d.id).map(name), t.id + 'd'), {
        promptEn: 'Which figure is at work?', instruction: 'Name the figure — and its balāgha counterpart',
        explanation: lines(nm, d.definition_en, d.balagha_fit && `Fit against the classical term: ${d.balagha_fit}`, d.divergence_en) }),
        'device', t.term, nm);
    }
    for (const u of usages.filter((x) => x.rhetoric_term_id === t.id)) {
      const cloze = clozeQuote(u.quote, t.term);
      const who = [u.speaker ?? 'unattributed', u.venue, u.said_on].filter(Boolean).join(', ');
      push(choose(`wv:rhetoric:wild:${u.id}`, cloze ? `“${clip(cloze, 260)}”` : `“${clip(u.quote, 260)}”`, t.term,
        others(t.term, pool.filter((p) => p.id !== t.id).map((p) => p.term), u.id), {
          promptEn: `— ${who}${cloze ? '' : ' · which figure does this attest?'}`, instruction: cloze ? 'Fill the figure the speaker used' : 'Which figure does this attest?',
          explanation: lines(t.term, u.function_note) }),
        'attestation', u.quote, t.term);
    }
  }
  return out;
}

export type ArcItem = { id: string; prompt: string; prompt_ar: string | null; hint: string; answer_cite: string;
                        answer_greek: string | null; quote: string | null; note: string | null; en: string | null };

export function arcDrills(arcId: string, phase: string, title: string | null, items: ArcItem[]): Drill[] {
  const passage = (x: ArcItem) => clip((x.quote || x.answer_greek || x.en || x.answer_cite).trim(), 160);
  const out: Drill[] = [];
  for (const it of items) {
    const answer = passage(it);
    const wrong = others(answer, items.filter((x) => x.id !== it.id && x.prompt !== it.prompt).map(passage), it.id);
    const d = choose(`wv:arc:${phase}:${it.id}`, it.prompt_ar ? `${it.prompt} · ${it.prompt_ar}` : it.prompt, answer, wrong, {
      promptEn: `Which passage carries it? (${it.hint})`, instruction: 'Choose the passage that carries the concept',
      explanation: lines(it.answer_cite, it.answer_greek, it.en && clip(it.en, 300), it.note),
      badges: [{ label: title ?? 'Arc', labelAr: null, color: '#B388EB' }] });
    if (d) out.push(filed(d, `WV:arc:${it.id}`, 'arc_review', it.prompt, `${answer}\n${it.answer_cite}`,
      { skill: 'arc', series: title ?? arcId, workId: `WV:arc:${arcId}`, work: phase, band: null, episode: null, scene: null }));
  }
  return out;
}
