import type {
  WvRhetoricDevice, WvRhetoricTerm, WvRhetoricUsage,
} from '../repositories/rhetoric.repo';

/**
 * WGRT → SRS.
 *
 * A rhetoric entry is turned into cards that pull in three different
 * directions, because knowing a figure means three different things:
 *
 *   recognition  you meet it on the page and know what it is doing
 *   production   you have the thought and the phrase comes to hand
 *   critique     you can say what the figure took off the table
 *
 * Two more are emitted when the data supports them — the figure/balāgha
 * pairing, and a cloze on an attested quotation.
 *
 * Cards are module `EN`: this is English study material, whatever domain owns
 * the underlying row. `resource_ref` keeps the typed WV reference, so a card
 * can always be walked back to the entry it came from.
 */

export const RHETORIC_NOTE_TYPE = 'NT:kmaps:rhetoric:v1';

export const RHETORIC_TEMPLATES = [
  'rhetoric.recognition',
  'rhetoric.production',
  'rhetoric.critique',
  'rhetoric.device',
  'rhetoric.attestation',
] as const;

export type RhetoricTemplate = typeof RHETORIC_TEMPLATES[number];

export interface RhetoricCard {
  card_template: RhetoricTemplate;
  card_kind: string;
  module: 'EN';
  resource_type: 'vocabulary';
  resource_ref: string;
  note_type_id: string;
  front_text: string;
  back_text: string;
  fields: Record<string, string>;
  tags: string[];
}

const slug = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Joins the parts that are actually present, so a sparse entry has no blank lines. */
const lines = (...parts: Array<string | null | undefined | false>) =>
  parts.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).join('\n\n');

const quoted = (s: string) => `“${s}”`;

/**
 * A term rarely appears in a quotation exactly as it is stored — "melting pot"
 * shows up as "Melting-Pot". Match on letters and digits only, letting any
 * punctuation or spacing stand between them.
 */
function termPattern(term: string): RegExp | null {
  const words = term.match(/[A-Za-z0-9]+/g);
  if (!words || !words.length) return null;
  return new RegExp(words.join('[^A-Za-z0-9]+'), 'i');
}

/** `"domino theory / domino effect"` is two names for one figure; try each. */
function variantsOf(term: string): string[] {
  return term.split('/').map(v => v.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
}

/** Blanks the term where it stands, keeping the rest of the quotation intact. */
export function clozeQuote(quote: string, term: string): string | null {
  for (const variant of variantsOf(term)) {
    const re = termPattern(variant);
    if (re && re.test(quote)) return quote.replace(re, '[ … ]');
  }
  return null;
}

function attribution(u: WvRhetoricUsage): string {
  const where = [u.venue, u.said_on].filter(Boolean).join(', ');
  const who   = u.speaker ?? 'unattributed';
  return where ? `— ${who}, ${where}` : `— ${who}`;
}

function tagsFor(term: WvRhetoricTerm, device: WvRhetoricDevice | null): string[] {
  return [
    'wgrt',
    'rhetoric',
    device ? `figure-${device.slug}` : null,
    term.source_domain ? `from-${slug(term.source_domain)}` : null,
    term.target_domain ? `about-${slug(term.target_domain)}` : null,
    `stance-${term.stance}`,
    `register-${term.register}`,
  ].filter((t): t is string => t !== null);
}

/** The structured payload every card carries, for renderers that read fields. */
function baseFields(term: WvRhetoricTerm, device: WvRhetoricDevice | null): Record<string, string> {
  const f: Record<string, string> = { Term: term.term, Slug: term.slug };
  if (device?.title)          f['Device'] = device.title;
  if (device?.title_ar)       f['DeviceAr'] = device.title_ar;
  if (term.literal_sense)     f['LiteralSense'] = term.literal_sense;
  if (term.figurative_sense)  f['FigurativeSense'] = term.figurative_sense;
  if (term.highlights)        f['Highlights'] = term.highlights;
  if (term.hides)             f['Hides'] = term.hides;
  if (term.counter_term)      f['CounterTerm'] = term.counter_term;
  if (term.origin_note)       f['OriginNote'] = term.origin_note;
  if (term.source_domain)     f['SourceDomain'] = term.source_domain;
  if (term.target_domain)     f['TargetDomain'] = term.target_domain;
  f['Register'] = term.register;
  f['Stance']   = term.stance;
  return f;
}

function card(
  term: WvRhetoricTerm,
  device: WvRhetoricDevice | null,
  template: RhetoricTemplate,
  kind: string,
  title: string,
  front: string,
  back: string,
  resourceRef = term.id,
  extraFields: Record<string, string> = {},
): RhetoricCard {
  return {
    card_template: template,
    card_kind: kind,
    module: 'EN',
    resource_type: 'vocabulary',
    resource_ref: resourceRef,
    note_type_id: RHETORIC_NOTE_TYPE,
    front_text: front,
    back_text: back,
    fields: { ...baseFields(term, device), ...extraFields, Title: title, Front: front, Back: back },
    tags: tagsFor(term, device),
  };
}

export function buildRhetoricCards(
  term: WvRhetoricTerm,
  device: WvRhetoricDevice | null,
  usages: WvRhetoricUsage[] = [],
): RhetoricCard[] {
  const out: RhetoricCard[] = [];
  const figure = device ? (device.title_ar ? `${device.title} (${device.title_ar})` : device.title) : null;

  // 1. Recognition — you meet it on the page.
  if (term.figurative_sense) {
    out.push(card(term, device, 'rhetoric.recognition', 'rhetoric_recognition',
      'Recognise',
      lines(
        quoted(term.term),
        term.target_domain ? `a figure used in ${term.target_domain}` : null,
        'What is it saying?',
      ),
      lines(
        term.figurative_sense,
        figure && `Figure: ${figure}`,
        term.literal_sense && `Picture: ${term.literal_sense}`,
        term.highlights && `Foregrounds: ${term.highlights}`,
      ),
    ));
  }

  // 2. Production — you have the thought and want the phrase. This is the card
  //    that does the work for articulation: prompt is the meaning, answer is
  //    the expression.
  if (term.figurative_sense) {
    out.push(card(term, device, 'rhetoric.production', 'rhetoric_production',
      'Reach for it',
      lines(
        'Which English figure says this?',
        quoted(term.figurative_sense),
        [
          term.register !== 'general' ? `${term.register} register` : null,
          term.source_domain ? `borrowed from ${term.source_domain}` : null,
        ].filter(Boolean).join(' · ') || null,
      ),
      lines(
        term.term,
        term.literal_sense,
        term.origin_note,
        term.counter_term && `Counter-move: ${term.counter_term}`,
      ),
    ));
  }

  // 3. Critique — the worldview card, and the reason the entry is stored here
  //    rather than in a phrasebook.
  if (term.hides) {
    out.push(card(term, device, 'rhetoric.critique', 'rhetoric_critique',
      'What it hides',
      lines(quoted(term.term), 'What does this figure take off the table?'),
      lines(
        term.hides,
        term.highlights && `It puts forward instead: ${term.highlights}`,
        term.counter_term && `Counter-move: ${term.counter_term}`,
      ),
    ));
  }

  // 4. The figure itself, paired with its balāgha counterpart.
  if (device) {
    out.push(card(term, device, 'rhetoric.device', 'rhetoric_device',
      'Which figure',
      lines(quoted(term.term), 'Which figure is at work, and what is its balāgha counterpart?'),
      lines(
        figure ?? device.title,
        device.definition_en,
        device.balagha_fit && `Fit against the classical term: ${device.balagha_fit}`,
        device.divergence_en,
      ),
      term.id,
      device.classical_name ? { DeviceClassical: device.classical_name } : {},
    ));
  }

  // 5. One card per attestation. Cloze where the phrase actually stands in the
  //    quotation; otherwise ask which figure the passage attests.
  for (const u of usages) {
    const cloze = clozeQuote(u.quote, term.term);
    out.push(card(term, device, 'rhetoric.attestation', 'rhetoric_attestation',
      'In the wild',
      cloze
        ? lines(quoted(cloze), attribution(u))
        : lines(quoted(u.quote), attribution(u), 'Which figure does this attest?'),
      lines(term.term, u.function_note),
      u.id,
      { Quote: u.quote, ...(u.speaker ? { Speaker: u.speaker } : {}) },
    ));
  }

  return out;
}
