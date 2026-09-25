export interface Tri { ar: string | null; en: string | null; ur: string | null; }

export interface FamilyLemmaVm {
  lemma_ar: string; pos: string | null; pos_icon: string; is_quran_word: boolean;
}

export interface FamilyGroupVm {
  key: string; order: number; tier: string; icon: string;
  arabic_name: string | null; english_name: string | null; urdu_name: string | null;
  lemmas: FamilyLemmaVm[];
}

export interface FamilyTierVm {
  tier: string; icon: string;
  arabic_name: string | null; english_name: string | null; urdu_name: string | null;
  groups: FamilyGroupVm[];
}
export interface LensVm {
  key: string; label: string; icon: string; on: boolean;
  author?: string | null;
  slug?: string | null; root?: string | null;
  heading?: string | null; summary?: string | null;
  text?: string | null; page?: number | null;
  dir?: 'rtl' | 'ltr';
}

export interface RootDisplay {
  root: string;
  root_display: string | null;
  root_type: string | null;
  frequency_quran: number | null;
  meaning_core: Tri;
  hook: Tri;
  family: FamilyTierVm[];
  lenses: LensVm[];
  senses: string[];
  section_icons: Record<string, string>;
  semantic_field: string | null;
  is_anchor: boolean;
}
