import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LexV2SarfFamily, LexV2SarfForm, LexV2TermLabel, LexV2Tri,
} from '../../../../shared/services/al-dictionary-api.service';

export type SarfReadingMode = 'all' | 'ar' | 'en' | 'ur';

const POLE_COLOURS = ['accent', 'clarity', 'verse', 'kw', 'ref'] as const;

export interface SarfPoleGroup {
  key: string | null;
  titleAr: string | null;
  titleEn: string | null;

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

  readonly bookTitle = input<string>('');

  readonly mode = signal<SarfReadingMode>('ar');

  readonly modes: { id: SarfReadingMode; label: string }[] = [
    { id: 'all', label: 'ALL' },
    { id: 'ar',  label: 'AR' },
    { id: 'en',  label: 'EN' },
    { id: 'ur',  label: 'UR' },
  ];

  private readonly open = signal<ReadonlySet<string>>(new Set());

  readonly forms = computed(() => this.family()?.forms ?? []);
  readonly poles = computed(() =>
    (this.family()?.poles ?? []).filter(p => p.ar || p.en || p.ur));

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

        titleAr: null, titleEn: null,
        colour: POLE_COLOURS[colourIndex % POLE_COLOURS.length],
        forms: rest,
      });
    }
    return groups;
  });

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

  tri(v: LexV2Tri | null | undefined, mode = this.mode()): string | null {
    if (!v) return null;
    if (mode === 'en') return v.en ?? v.ar ?? null;
    if (mode === 'ur') return v.ur ?? v.ar ?? null;
    return v.ar ?? null;
  }

  readonly showsAllScripts = computed(() => this.mode() === 'all');

  headword(form: LexV2SarfForm): string | null {
    return form.madi ?? form.lemma ?? null;
  }

  babLabel(form: LexV2SarfForm): LexV2TermLabel | null {
    return form.bab ?? form.form_tier;
  }

  meaning(form: LexV2SarfForm): LexV2Tri | null {
    return form.senses?.[0]?.sense ?? form.gloss ?? null;
  }

  exampleText(form: LexV2SarfForm): LexV2Tri | null {
    return form.senses?.[0]?.example ?? form.shahid ?? null;
  }

  showGlossLine(form: LexV2SarfForm): boolean {
    return !!form.senses?.[0]?.sense && !!this.tri(form.gloss);
  }

  showAyahTag(form: LexV2SarfForm): boolean {
    return !!form.ayah && !this.exampleText(form);
  }

  hasDetail(form: LexV2SarfForm): boolean {
    return !!form.ism_fail
      || (form.senses?.length ?? 0) > 1
      || !!this.exampleText(form)
      || !!form.trans_note
      || (form.bab_alt?.length ?? 0) > 0
      || (!!form.senses?.[0]?.sense && !!form.gloss);
  }

  extraSenses(form: LexV2SarfForm) { return (form.senses ?? []).slice(1); }

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

  bilingualSplit(form: LexV2SarfForm): { en: string | null; ur: string | null } | null {
    if (!form.senses?.[0]?.sense) return null;
    const en = form.gloss?.en ?? null;
    const ur = form.gloss?.ur ?? null;
    return en || ur ? { en, ur } : null;
  }
}
