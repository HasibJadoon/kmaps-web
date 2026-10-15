// The Table, dealt from what the learner studied (drill-engine plan §2.3c): each passage they are in
// or have studied, latest first, with the prompts to talk over — the table packs' prompts kept for
// that passage (core_bank_item passage_ref) and the passage's own reflections (QR study questions
// kept with no options). Nothing is scored. Each prompt is shaped as a bank item, so the Table draws
// both alike.

export interface TableClass { scope: string; status: string; lastAt: string | null }
export interface QrPrompt { id: string; en: string; ar: string | null; kind: string; from: number; to: number }
export interface QrPassage { title: string | null; titleAr: string | null; label: string | null; surah: number }

/** A QR reflection as the Table's bank item. */
export function promptAsItem(p: QrPrompt, surah: number, scope: string): Record<string, unknown> {
  return {
    id: p.id, slug: p.id, promptEn: p.en, promptAr: p.ar, promptUr: null, stimulusMd: null,
    interaction: 'open_prompt', scoring: 'none', responseJson: null, seconds: null, difficulty: 3,
    module: 'QR', surah, ayahFrom: p.from, ayahTo: p.to, stepKey: null, passageRef: scope, options: [],
  };
}

/** The passages with something to talk over, in the order given (latest first), each with its deck:
 *  the pack's prompts, then the passage's reflections, a prompt met in both kept once (by its English). */
export function tableDeck(classes: TableClass[], bank: Array<Record<string, unknown>>,
                          qr: Map<string, { passage: QrPassage; prompts: QrPrompt[] }>) {
  return classes.flatMap((c) => {
    const own = bank.filter((b) => b.passageRef === c.scope);
    const q = qr.get(c.scope);
    const seen = new Set(own.map((b) => String(b.promptEn ?? '').trim().toLowerCase()));
    const reflections = (q?.prompts ?? []).filter((p) => !seen.has(p.en.trim().toLowerCase()))
      .map((p) => promptAsItem(p, q!.passage.surah, c.scope));
    const cards = [...own, ...reflections];
    return cards.length ? [{ scope: c.scope, status: c.status, title: q?.passage.title ?? null, titleAr: q?.passage.titleAr ?? null,
                             label: q?.passage.label ?? null, cards }] : [];
  });
}
