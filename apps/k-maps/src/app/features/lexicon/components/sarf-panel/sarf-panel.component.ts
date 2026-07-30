// ─── Ṣarf family panel ──────────────────────────────────────────────────────
//
// The morphological paradigm a book draws for one root, ported from the native
// iOS `LexSarfPanel`. It sits directly under the headword and above the prose:
// the shape of the root is what the article then explains, so arriving at it
// after eight sections of commentary reads backwards.
//
// The tree is per book, never universal. al-Rāghib reduces بين to one interval-
// sense over five bābs; al-Jawharī names the aḍdād outright and gets nine forms
// across four poles. `distinctive_note` is the book's signature on its own
// reading, which is why it sits at the top rather than in a footnote.
//
// Everything here is drawn on the shared lexicon tokens (`--ink`, `--accent`,
// `--paper-2`, `--kw`, …), so the panel follows the shell into either theme
// without a second set of colours.

import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LexV2SarfFamily, LexV2SarfForm, LexV2TermLabel, LexV2Tri,
} from '../../../../shared/services/al-dictionary-api.service';

/**
 * Which script the *prose* renders in. The books' own terms ignore it.
 * `all` stacks the three so they can be read against each other.
 */
export type SarfReadingMode = 'all' | 'ar' | 'en' | 'ur';

/**
 * Semantic hues a pole can take, in order. The design colours two poles —
 * separation gold, clarity blue — and the books run to four (al-Jawharī splits
 * بين into aḍdād, faḍl, wuḍūḥ and firāq), so the list cycles.
 */
const POLE_COLOURS = ['accent', 'clarity', 'verse', 'kw', 'ref'] as const;

/** One pole and the forms filed under it. */
export interface SarfPoleGroup {
  key: string | null;
  titleAr: string | null;
  titleEn: string | null;
  /** CSS custom-property name — `accent`, `clarity`, … */
  colour: string;
  forms: LexV2SarfForm[];
}

@Component({
  selector: 'km-lex-sarf-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sarf-panel.component.html',
  styleUrl: './sarf-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SarfPanelComponent {
  readonly family    = input<LexV2SarfFamily | null>(null);
  /** Spine name of the book whose reading this is — stamped on the note card. */
  readonly bookTitle = input<string>('');

  readonly mode = signal<SarfReadingMode>('ar');

  readonly modes: { id: SarfReadingMode; label: string }[] = [
    { id: 'all', label: 'ALL' },
    { id: 'ar',  label: 'AR' },
    { id: 'en',  label: 'EN' },
    { id: 'ur',  label: 'UR' },
  ];

  /** Form ids whose detail is expanded. Each card opens independently. */
  private readonly open = signal<ReadonlySet<string>>(new Set());

  readonly forms = computed(() => this.family()?.forms ?? []);
  readonly poles = computed(() =>
    (this.family()?.poles ?? []).filter(p => p.ar || p.en || p.ur));

  /**
   * Forms grouped under the pole each one is filed against — the shape the
   * refined design reads by. Poles keep the book's own order, and a pole with no
   * forms is dropped rather than printed as an empty heading.
   *
   * Lane files one form of كتب against no pole at all, so anything unmatched
   * collects in a trailing group: dropping those would silently lose a form.
   */
  readonly poleGroups = computed<SarfPoleGroup[]>(() => {
    const fam = this.family();
    if (!fam) return [];

    const groups: SarfPoleGroup[] = [];
    let colourIndex = 0;

    for (const pole of fam.poles ?? []) {
      const forms = (fam.forms ?? []).filter(f => f.pole && f.pole === pole.key);
      if (!forms.length) continue;
      groups.push({
        key: pole.key,
        titleAr: pole.ar,
        titleEn: pole.en,
        colour: POLE_COLOURS[colourIndex++ % POLE_COLOURS.length],
        forms,
      });
    }

    const claimed = new Set(groups.flatMap(g => g.forms));
    const rest = (fam.forms ?? []).filter(f => !claimed.has(f));
    if (rest.length) {
      groups.push({
        key: null,
        // No heading text: the book didn't assign these a sense, and inventing
        // one ("other") would read as the author's own grouping.
        titleAr: null, titleEn: null,
        colour: POLE_COLOURS[colourIndex % POLE_COLOURS.length],
        forms: rest,
      });
    }
    return groups;
  });

  /** A family with no forms and no core is a data gap, not a panel. */
  readonly isEmpty = computed(() => {
    const f = this.family();
    return !f || (this.forms().length === 0 && !f.core);
  });

  setMode(m: SarfReadingMode) { this.mode.set(m); }

  formId(form: LexV2SarfForm): string {
    return form.form_id ?? `${form.roman}${form.madi ?? form.lemma ?? ''}`;
  }
  isOpen(form: LexV2SarfForm): boolean { return this.open().has(this.formId(form)); }

  toggle(form: LexV2SarfForm) {
    const id   = this.formId(form);
    const next = new Set(this.open());
    next.has(id) ? next.delete(id) : next.add(id);
    this.open.set(next);
  }

  /** Falls back to Arabic — the books are Arabic-primary. */
  tri(v: LexV2Tri | null | undefined, mode = this.mode()): string | null {
    if (!v) return null;
    if (mode === 'en') return v.en ?? v.ar ?? null;
    if (mode === 'ur') return v.ur ?? v.ar ?? null;
    return v.ar ?? null;
  }

  /** `all` stacks the three scripts; the others print one line. */
  readonly showsAllScripts = computed(() => this.mode() === 'all');

  /** The headword. Every one of Lane's 14,155 forms has a null `madi`, so
   *  without the `lemma` fallback those cards show a bare form number. */
  headword(form: LexV2SarfForm): string | null {
    return form.madi ?? form.lemma ?? null;
  }

  /** Form I carries `bab`; derived and nominal-only rows carry `form_tier`. */
  babLabel(form: LexV2SarfForm): LexV2TermLabel | null {
    return form.bab ?? form.form_tier;
  }

  /** What the form *means*. The books split on where they put it: al-Jawharī
   *  authors `senses`, al-Rāghib authors only `gloss`. */
  meaning(form: LexV2SarfForm): LexV2Tri | null {
    return form.senses?.[0]?.sense ?? form.gloss ?? null;
  }

  /** The shāhid, where the book gives one. An āyah *reference* with no text is
   *  a pointer, not a shāhid, so it rides the collapsed row instead. */
  exampleText(form: LexV2SarfForm): LexV2Tri | null {
    return form.senses?.[0]?.example ?? form.shahid ?? null;
  }

  /** Suppressed when the meaning row has already fallen back to this same
   *  gloss — otherwise it prints twice. */
  showGlossLine(form: LexV2SarfForm): boolean {
    return !!form.senses?.[0]?.sense && !!this.tri(form.gloss);
  }

  /** A bare `ayah` is a tag on the collapsed row. Once there is shāhid text the
   *  reference belongs to the example box instead. */
  showAyahTag(form: LexV2SarfForm): boolean {
    return !!form.ayah && !this.exampleText(form);
  }

  /** Whether opening the card shows anything the collapsed row does not.
   *  Deliberately ignores a bare `ayah`: al-Rāghib's forms carry a reference and
   *  nothing else, and counting it made every one of them open an empty box. */
  hasDetail(form: LexV2SarfForm): boolean {
    return !!form.ism_fail
      || (form.senses?.length ?? 0) > 1
      || !!this.exampleText(form)
      || !!form.trans_note
      || (form.bab_alt?.length ?? 0) > 0
      || (!!form.senses?.[0]?.sense && !!form.gloss);
  }

  /** Senses past the first — the first is already in the meaning row. */
  extraSenses(form: LexV2SarfForm) { return (form.senses ?? []).slice(1); }

  /** `اسم الفاعل · كاتب` and any alternate bābs, as one row of derivations. */
  derivations(form: LexV2SarfForm): { label: string; value: string }[] {
    const out: { label: string; value: string }[] = [];
    if (form.ism_fail) {
      out.push({ label: form.ism_fail_term?.ar ?? 'اسم الفاعل', value: form.ism_fail });
    }
    if (form.ism_maf) {
      out.push({ label: form.ism_maf_term?.ar ?? 'اسم المفعول', value: form.ism_maf });
    }
    for (const alt of form.bab_alt ?? []) out.push({ label: 'باب', value: alt.ar });
    return out;
  }

  /** The gloss's other two scripts, shown side by side under a sense that
   *  already carries the Arabic. */
  bilingualSplit(form: LexV2SarfForm): { en: string | null; ur: string | null } | null {
    if (!form.senses?.[0]?.sense) return null;
    const en = form.gloss?.en ?? null;
    const ur = form.gloss?.ur ?? null;
    return en || ur ? { en, ur } : null;
  }
}
