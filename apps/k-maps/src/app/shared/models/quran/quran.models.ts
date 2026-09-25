export interface QuranSurahListItemDto {
  id: string;
  surahNumber: number;
  slug: string;
  arabicName: string;
  transliteratedName: string;
  englishName: string;
  ayahCount: number;
  revelationType: 'makki' | 'madani' | null;
  juz: number | null;
}

export interface QuranAyahWord {
  id?: number;
  text?: string | null;
  simple?: string | null;
  lemma?: string | null;
  root?: string | null;
  lemma_text?: string | null;
  lemma_text_clean?: string | null;
  ar_u_token?: string | null;
  token_index?: number;
  word_simple?: string | null;
  word_diacritic?: string | null;
}

export interface QuranAyah {
  id?: number;
  surah: number;
  ayah: number;
  text: string;
  text_uthmani?: string | null;
  text_uthmani_clean?: string | null;
  text_simple?: string | null;
  text_bare?: string | null;
  verse_mark?: string | null;
  translation?: string | null;
  word_count?: number | null;
  page_number?: number | null;
  juz_number?: number | null;
  words?: QuranAyahWord[];
}

export interface AyahsSurah {
  surah: number;
  name_ar: string;
  name_en: string | null;
  ayah_count: number | null;
}

export interface TranslationPassage {
  id: number;
  source_key: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  passage_index: number;
  page_pdf: number | null;
  page_book: number | null;
  text: string | null;
}

export interface AyahsResponse {
  ok: boolean;
  surah?: AyahsSurah;
  translation_passages?: TranslationPassage[];
  total: number;
  page: number;
  pageSize: number;
  results?: QuranAyah[];
  verses?: QuranAyah[];
}

export interface PassagesResponse {
  ok: boolean;
  surah?: AyahsSurah;
  source_key?: string;
  passages: TranslationPassage[];
  passage?: TranslationPassage | null;
}
