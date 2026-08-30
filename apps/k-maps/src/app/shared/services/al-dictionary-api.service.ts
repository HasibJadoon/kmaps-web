import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BackendApiService } from './backend-api.service';

export interface AlDictSource {
  slug: string;
  title_ar: string;
  title_en: string;
  author: string;
  period: string;
  total: number;
  roots: number;
}

export interface AlDictEntry {
  id: string;
  source_slug: string;
  heading_norm: string | null;
  text_ar: string;
  text_en: string | null;
  page_no: number | null;
  volume_no: number | null;
  is_bilingual?: boolean;
}

export interface AlRootSourceResult {
  slug: string;
  title_ar: string;
  title_en: string;
  author: string;
  entries: AlDictEntry[];
  entry_count: number;
}

export interface AlRootResult {
  root: {
    text_ar: string;
    letters: string | null;
    meaning_ar: string | null;
    meaning_en: string | null;
    frequency_quran: number | null;
  };
  sources: AlRootSourceResult[];
  source_count: number;
  lemma_count: number;
}

export interface LaneGroupedRow {
  entry_id: string;
  display_heading_ar: string | null;
  lemma_text: string | null;
  heading_norm: string | null;
  page_no: number | null;
  source_entry_seq: number | null;
  definition_en: string | null;
  status: string | null;
  ui_json: string | null;
  cleaner_json: string | null;
  heading_block_ar: string | null;
  definition_block_en: string | null;
  arabic_forms_text: string | null;
  page_label: string | null;
  raw_label: string | null;
  block_count: number;
}

export interface LaneTableResult {
  root: string;
  total: number;
  entries: LaneGroupedRow[];
}

@Injectable({ providedIn: 'root' })
export class AlDictionaryApiService {
  private readonly api = inject(BackendApiService);

  getSources(): Observable<{ sources: AlDictSource[]; total: number }> {
    return this.api.getData('al', ['lexicon', 'dict', 'sources']);
  }

  getRootEntries(root: string, limit = 10): Observable<AlRootResult> {
    const params = new HttpParams().set('limit', String(limit));
    return this.api.getData('al', ['lexicon', 'dict', 'root', root], { params });
  }

  getLaneTableEntries(root: string, limit = 100): Observable<LaneTableResult> {
    const params = new HttpParams().set('limit', String(limit));
    return this.api.getData<LaneTableResult>('al', ['lexicon', 'entries', 'lane', root], { params });
  }

  getV2Sources(): Observable<LexV2SourcesResult> {
    return this.api.getData<LexV2SourcesResult>('al', ['lex', 'v2', 'sources']);
  }

  getV2Roots(opts: { source?: string; prefix?: string; page?: number; limit?: number } = {}):
    Observable<LexV2RootsResult> {
    let p = new HttpParams();
    if (opts.source) p = p.set('source', opts.source);
    if (opts.prefix) p = p.set('prefix', opts.prefix);
    if (opts.page)   p = p.set('page', String(opts.page));
    if (opts.limit)  p = p.set('limit', String(opts.limit));
    return this.api.getData<LexV2RootsResult>('al', ['lex', 'v2', 'roots'], { params: p });
  }

  getV2RootCompare(root_norm: string): Observable<LexV2RootCompare> {
    return this.api.getData<LexV2RootCompare>('al', ['lex', 'v2', 'roots', root_norm]);
  }

  getV2Entry(source_slug: string, root_norm: string): Observable<LexV2EntryDetail> {
    return this.api.getData<LexV2EntryDetail>('al', ['lex', 'v2', 'entry', source_slug, root_norm]);
  }

  getSarfFamily(source_slug: string, root_norm: string): Observable<LexV2SarfFamily | null> {
    return this.getV2Entry(source_slug, root_norm).pipe(
      map(e => {
        const families = e?.sarf_families ?? [];
        const filled = families.find(f => (f.forms?.length ?? 0) > 0 || f.core);
        return filled ?? families[0] ?? null;
      }),
      catchError(() => of(null)),
    );
  }

  getMufradatRead(root_norm: string): Observable<MufradatReadView> {
    return this.api.getData<MufradatReadView>(
      'al',
      ['lex', 'v2', 'read', 'raghib_mufradat', root_norm],
    );
  }

  getLisanRead(root_norm: string): Observable<LisanReadView> {
    return this.getClassicalRead('ibn_manzur_lisan_arab', root_norm);
  }

  getClassicalRead(source_slug: string, root_norm: string): Observable<LisanReadView> {
    return this.api.getData<LisanReadView>(
      'al',
      ['lex', 'v2', 'read', source_slug, root_norm],
    );
  }

  getLaneRead(root_norm: string): Observable<LaneReadView> {
    return this.api.getData<LaneReadView>(
      'al', ['lex', 'v2', 'read', 'lane_lexicon', root_norm],
    );
  }

  searchV2(q: string, mode: 'root' | 'word' | 'fts' = 'root',
           opts: { sources?: string[]; limit?: number } = {}):
    Observable<LexV2SearchResult> {
    let p = new HttpParams().set('q', q).set('mode', mode);
    if (opts.sources?.length) p = p.set('sources', opts.sources.join(','));
    if (opts.limit) p = p.set('limit', String(opts.limit));
    return this.api.getData<LexV2SearchResult>('al', ['lex', 'v2', 'search'], { params: p });
  }

  getScholarshipSources(): Observable<{ sources: ScholarshipSource[]; total: number }> {
    return this.api.getData('al', ['scholarship', 'sources']);
  }
  getRootScholarship(root_norm: string): Observable<RootScholarshipResult> {
    return this.api.getData<RootScholarshipResult>(
      'al', ['scholarship', 'root', root_norm],
    );
  }

  getScholarshipRoots(slug: string): Observable<{ slug: string; rows: ScholarshipRootRow[]; total: number }> {
    return this.api.getData('al', ['scholarship', 'roots', slug]);
  }

  getScholarshipBySource(slug: string, root_norm: string): Observable<ScholarshipShellView> {
    return this.api.getData<ScholarshipShellView>(
      'al', ['scholarship', 'by-source', slug, root_norm],
    );
  }
}

export interface LexV2SourceMeta {
  slug: string;
  title_ar: string;
  title_en: string;
  author: string;
  period: string;
  origin: 'thahabi' | 'ketabonline' | 'saaid' | 'qomra' | 'lane';
  bilingual?: boolean;
  roots: number;
  author_death_ah?: number | null;
  author_death_ce?: number | null;
}

export interface LexV2SourcesResult { sources: LexV2SourceMeta[]; total: number; }

export interface LexV2RootRow {
  id: string;
  source_slug: string;
  root_text: string;
  root_norm: string;
  root_id: string | null;
  page_start: number | null;
  page_end: number | null;
  volume_no: number | null;
}

export interface LexV2RootsResult {
  rows: LexV2RootRow[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface LexV2RootCompare {
  root_norm: string;
  canonical: {
    id: string; root_text: string; root_letters: string;
    root_type: string; weak_pattern: string | null;
    frequency_quran: number | null;
    meaning_core_en: string | null; meaning_core_ar: string | null;
  } | null;
  sources: (LexV2RootRow & LexV2SourceMeta & {
    sections: number; blocks: number; quran_refs: number;
    snippet: string | null;
  })[];
}

export interface LexV2Block {
  id: string;
  section_id: string | null;
  book_page_id: string | null;
  parent_block_id: string | null;
  block_path: string;
  block_seq: number;
  depth: number;
  block_type: string;
  lang: string | null;
  title_ar: string | null;
  text_plain: string | null;
  text_html: string | null;
  data_json: string;
  origin: string;
  origin_ref: string | null;
  printed_page: number | null;
}

export interface LexV2SectionBody {
  text: string;
  paragraphs: string[];

  footnote_refs: number[];

  marker_nums?: number[];

  footnote_marks?: LexV2FootnoteMark[];
}

export interface LexV2Section {
  id: string;
  section_seq: number;
  heading_ar: string | null;
  heading_norm: string | null;
  heading_bare: string | null;
  section_type: string;
  text_ar: string | null;
  page_no: number | null;
  source_native_section_id: string | null;
  body?: LexV2SectionBody;
}

export interface LexV2Footnote {
  num: number;
  text: string;
  block_id: string;
  section_id: string | null;

  ordinal?: number | null;

  printed_page?: number | null;
}

export interface LexV2FootnoteMark {
  num: number;
  ordinal: number | null;
  printed_page: number | null;
  resolved: boolean;
}

export interface LexV2Link {
  id: string;
  from_block_id: string;
  link_kind: string;
  to_root_norm: string | null;
  to_surah: number | null;
  to_ayah: number | null;
  to_ayah_to: number | null;
  to_block_id: string | null;
  to_url: string | null;
  label: string | null;
  weight: number | null;
  position_offset: number | null;
}

export interface LexV2Tag { block_id: string; tag: string; source: string; weight: number; }

export interface LexV2QuranRef {
  id: string; block_id: string | null; section_id: string | null;
  surah: number; ayah: number; raw_ref: string; context_snippet: string | null;
}

export interface LexV2TermLabel {
  id: string; ar: string; en: string; ur: string; short_ar: string | null;
}

export interface LexV2Tri { ar: string | null; en: string | null; ur: string | null; }

export interface LexV2SarfPole {
  key: string | null; ar: string | null; en: string | null; ur: string | null;
}

export interface LexV2SarfSense { sense: LexV2Tri | null; example: LexV2Tri | null; }

export interface LexV2SarfForm {
  form_id: string | null;
  roman: string;

  lemma: string | null;
  section_id: string | null;

  block_ids: string[];

  bab: LexV2TermLabel | null;
  bab_alt: LexV2TermLabel[];
  form_tier: LexV2TermLabel | null;
  root_type: LexV2TermLabel | null;
  madi: string | null;
  mudari: string | null;
  voice: string | null;
  passive_form: string | null;
  masdar_term: LexV2TermLabel | null;
  masadir: string[];
  ism_fail: string | null;
  ism_fail_term: LexV2TermLabel | null;
  ism_maf: string | null;
  ism_maf_term: LexV2TermLabel | null;
  trans: LexV2TermLabel[];
  trans_note: LexV2Tri | null;
  pole: string | null;
  pole_family: string | null;
  levels_with: string[];
  gloss: LexV2Tri | null;
  senses: LexV2SarfSense[];
  ayah: string | null;
  shahid: LexV2Tri | null;
}

export interface LexV2SarfLevellingGroup {
  key: string | null; members: string[];
  claim: LexV2Tri | null; qualifier: LexV2Tri | null;
}

export interface LexV2SarfFamily {
  block_id: string;
  section_id: string | null;
  title_ar: string | null;
  scope: string;
  root_type: LexV2TermLabel | null;
  core: LexV2Tri | null;

  distinctive_note: LexV2Tri | null;
  authors_own_words: LexV2Tri | null;
  poles: LexV2SarfPole[];
  forms: LexV2SarfForm[];
  levelling_groups: LexV2SarfLevellingGroup[];
  note: string | null;
}

export interface LexV2EntryDetail {
  meta: LexV2SourceMeta;
  entry: {
    id: string; source_slug: string; root_text: string; root_norm: string;
    root_id: string | null; raw_text: string;
    page_start: number | null; page_end: number | null; volume_no: number | null;
    source_url: string | null; source_native_id: string | null;
    status: string;
  };
  canonical: {
    id: string; root_text: string; root_letters: string;
    root_type: string; weak_pattern: string | null;
    frequency_quran: number | null; frequency_hadith: number | null;
    meaning_core_en: string | null;
  } | null;
  sections: LexV2Section[];
  blocks: LexV2Block[];
  links: LexV2Link[];
  tags: LexV2Tag[];
  quran_refs: LexV2QuranRef[];
  footnotes?: LexV2Footnote[];

  sarf_families?: LexV2SarfFamily[];
  sources_of_entry: {
    id: string; source_kind: string; source_native_id: string | null; source_url: string | null;
  }[];
  stats: {
    sections: number; blocks: number; links: number; tags: number; quran_refs: number;
    footnotes?: number;
    sarf_families?: number;
  };
}

export interface LexV2SearchHit {
  id?: string; section_id?: string;
  source_slug: string;
  root_text: string;
  root_norm: string;
  section_seq?: number;
  heading_ar?: string | null;
  page_no?: number | null;
  page_start?: number | null;
  preview?: string;
  snippet?: string;
  meta: LexV2SourceMeta;
}

export interface LexV2SearchResult {
  results: LexV2SearchHit[];
  total: number;
  mode: 'root' | 'word' | 'fts';
  q: string;
}

export type MufradatProseToken =
  | { kind: 'text'; value: string }
  | {
      kind: 'quran';
      surah: string;
      surah_num: number | null;
      ayah: number;
      ayah_to: number | null;
      raw: string;
    }
  | {
      kind: 'footnote';
      num: number;
      has_text: boolean;
      text: string | null;
      printed_page: number | null;
    }
  | { kind: 'paren_quote'; value: string }
  | { kind: 'br' };

export type MufradatParagraph =
  | { kind: 'prose';        tokens: MufradatProseToken[] }
  | { kind: 'poetry';       cue: string | null; verses: string[]; attribution: string | null }
  | { kind: 'hadith';       cue: string | null; tokens: MufradatProseToken[] }
  | { kind: 'qira_variant'; reader: string | null; tokens: MufradatProseToken[] }
  | { kind: 'editorial';    tokens: MufradatProseToken[] };

export interface MufradatSection {
  id: string;
  seq: number;
  heading_ar: string | null;
  page_no: number | null;
  paragraphs: MufradatParagraph[];

  translation_en?: string | null;
  translation_ur?: string | null;
}

export interface MufradatFamilyForm {
  badge: string;
  head_html: string;
  masdar_html?: string | null;
  gloss_en?: string | null;
  gloss_ur?: string | null;
  citation_html?: string | null;
}
export interface MufradatFamilyPole {
  key: 'sep' | 'disc' | string;
  title_ar: string;
  title_en: string;
  forms: MufradatFamilyForm[];
}
export interface MufradatFamilyDerivation {
  quote_ar: string;
  en_html: string;
  ur_html: string;
  inferred_en_html?: string | null;
  inferred_ur_html?: string | null;
}
export interface MufradatFamily {
  meaning_core: { ar: string; en: string; ur: string };
  poles: MufradatFamilyPole[];
  derivation?: MufradatFamilyDerivation | null;
}

export interface MufradatEntryGloss {
  letters_spaced?: string | null;
  letters_dotted?: string | null;
  root_type_ar?: string | null;
  gloss_en?: string | null;
  gloss_ar?: string | null;
  gloss_ur?: string | null;
}

export interface MufradatReadView {
  kind: 'mufradat';
  meta: {
    slug: 'raghib_mufradat';
    title_ar: string;
    title_en: string;
    author: string;
    period: string;
    origin: 'ketabonline';
  };
  entry: {
    id: string;
    root_text: string;
    root_norm: string;
    page_start: number | null;
    page_end: number | null;
    volume_no: number | null;
    source_url: string | null;
    source_native_id: string | null;
  };
  canonical: {
    id: string;
    root_text: string;
    root_letters: string;
    root_type: string;
    frequency_quran: number | null;
    meaning_core_en: string | null;
  } | null;
  sections: MufradatSection[];

  family?: MufradatFamily | null;
  entry_gloss?: MufradatEntryGloss | null;
  footnotes: { num: number; text: string | null; printed_page: number | null }[];
  quran_citations: {
    surah: string;
    surah_num: number | null;
    ayah: number;
    ayah_to: number | null;
    raw: string;
    count: number;
  }[];
  stats: {
    paragraphs: number;
    poetry: number;
    hadith: number;
    qira_variants: number;
    quran_citations: number;
    footnote_markers: number;
  };
}

export type LisanAuthorityKind =
  | 'lexicographer' | 'grammarian' | 'quran_reader'
  | 'hadith_scholar' | 'companion' | 'tabii' | 'poet' | 'prophet';

export type LisanProseToken =
  | { kind: 'text';      value: string }
  | { kind: 'footnote';  num: number; has_text: boolean; text: string | null; pivot: string | null }
  | { kind: 'quran';     surah: number | null; ayah: number | null; raw: string }
  | { kind: 'authority'; name: string; label: string; authority_kind: LisanAuthorityKind }
  | { kind: 'br' };

export type LisanParagraph =
  | { kind: 'prose';  tokens: LisanProseToken[] }
  | { kind: 'quran';  verse_text: string; surah: number | null; ayah: number | null;
                      tokens: LisanProseToken[] }
  | { kind: 'hadith'; cue: string | null; tokens: LisanProseToken[] }
  | { kind: 'poetry'; cue: string | null; verses: string[]; attribution: string | null };

export interface LisanSection {
  id: string;
  seq: number;
  heading_ar: string | null;
  page_no: number | null;
  paragraphs: LisanParagraph[];
}

export interface LisanReadView {
  kind: 'lisan';
  meta: {
    slug: 'ibn_manzur_lisan_arab';
    title_ar: string;
    title_en: string;
    author: string;
    period: string;
    origin: 'ketabonline';
  };
  entry: {
    id: string;
    root_text: string;
    root_norm: string;
    page_start: number | null;
    page_end: number | null;
    volume_no: number | null;
    source_url: string | null;
    source_native_id: string | null;
  };
  canonical: {
    id: string;
    root_text: string;
    root_letters: string;
    root_type: string;
    frequency_quran: number | null;
    meaning_core_en: string | null;
  } | null;
  sections: LisanSection[];
  footnotes: { num: number; text: string; pivot: string | null }[];
  quran_citations: {
    surah: number;
    ayah: number;
    raw: string;
    context_snippet: string | null;
    count: number;
  }[];
  hadith_quotes:    { id: string; text: string; cue: string | null; page: number | null }[];
  poetry_shawahid:  { id: string; verses: string[]; attribution: string | null;
                      cue: string | null; page: number | null }[];
  authorities:      { name: string; name_label: string; kind: LisanAuthorityKind;
                      count: number; first_page: number | null }[];
  stats: {
    paragraphs: number;
    hadith: number;
    poetry: number;
    quran_citations: number;
    footnotes: number;
    authorities: number;
    authority_total: number;
  };
}

export type LaneToken =
  | { kind: 'text';       value: string }
  | { kind: 'arabic';     value: string }
  | { kind: 'headword';   value: string }
  | { kind: 'siglum';     code: string; name_en: string; name_ar: string; raw: string }
  | { kind: 'cross_ref';  target: string }
  | { kind: 'quran';      surah: number; ayah: number; raw: string }
  | { kind: 'figurative' }
  | { kind: 'br' };

export interface LaneSense {
  label: string | null;
  kind: 'signification' | 'dissociation' | 'plain' | null;
  tokens: LaneToken[];
}

export interface LaneVerbForm {
  section_id: string;
  form_num: number | null;
  form_label_ar: string | null;
  page_no: number | null;
  header_tokens: LaneToken[];
  senses: LaneSense[];
}

export interface LaneReadView {
  kind: 'lane';
  meta: {
    slug: 'lane_lexicon';
    title_ar: string;
    title_en: string;
    author: string;
    period: string;
    origin: 'lane';
    bilingual: true;
  };
  entry: {
    id: string;
    root_text: string;
    root_norm: string;
    page_start: number | null;
    page_end: number | null;
    volume_no: number | null;
    source_url: string | null;
    source_native_id: string | null;
  };
  canonical: unknown | null;
  forms: LaneVerbForm[];
  authorities: {
    code: string; name_en: string; name_ar: string; count: number;
  }[];
  quran_citations: {
    surah: number; ayah: number; raw: string;
    context_snippet: string | null; count: number;
  }[];
  cross_refs: { target: string; count: number }[];
  stats: {
    forms: number;
    senses: number;
    authorities: number;
    authority_total: number;
    quran_citations: number;
    cross_refs: number;
  };
}

export interface ScholarshipSource {
  id:          string;
  slug:        string | null;
  title_ar:    string;
  title_en:    string;
  author:      string;
  year:        number | null;
  genre:       string;
  genre_label: { ar: string; en: string };
  url:         string | null;
  count:       number;
}

export interface ScholarshipNote {
  id:            string;
  source_id:     string;
  source:        ScholarshipSource;
  root_norm:     string;
  root_text:     string | null;
  reading_kind:  string;
  reading_label: { ar: string; en: string };
  title_en:      string | null;
  title_ar:      string | null;
  body_md:       string | null;
  body_plain:    string | null;
  page_no:       number | null;
  page_range:    string | null;
  section_label: string | null;
}

export interface RootScholarshipResult {
  root_norm: string;
  notes:     ScholarshipNote[];
  total:     number;
}

export interface ScholarshipRootRow {
  root_norm: string;
  root_text: string | null;
  page_no:   number | null;
  n:         number;
}

export interface ScholarshipShellView {
  slug:      string;
  root_norm: string;
  source:    ScholarshipSource | null;
  notes:     ScholarshipNote[];
  total:     number;
}
