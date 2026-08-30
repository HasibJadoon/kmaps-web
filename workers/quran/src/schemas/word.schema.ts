export interface WordOccurrence {
  id: string;
  surah: number;
  ayah: number;
  word_index: number;
  word_text: string;
  word_text_bare: string | null;
  root: string | null;
  lemma: string | null;
  pos: string | null;
  morphology_tag: string | null;
  morphology_tag_json: string | null;
}

export interface WordQuery {
  surah?: number;
  ayah?: number;
  lemma?: string;
  root?: string;
}
