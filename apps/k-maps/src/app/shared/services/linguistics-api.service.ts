import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BackendApiService } from './backend-api.service';

export type Discipline = 'SF' | 'NH' | 'BL';
export interface DiscLabel { ar: string; en: string; }

export interface GramBookCard {
  slug: string;
  title_ar: string;
  author: string;
  death_ah: number | null;
  discipline: Discipline;
  discipline_label: DiscLabel;
  bab_count: number;
  page_count: number;
  volumes: number | null;
}
export interface GramGroup {
  discipline: Discipline;
  label: DiscLabel;
  books: GramBookCard[];
  book_count: number;
  page_count: number;
}
export interface GramBooksResult { groups: GramGroup[]; total_books: number; }

export interface GramBab {
  id: string;
  child_count?: number;
  parent_id: string | null;
  title_ar: string;
  depth: number;
  matn_order: number;
  volume_no: number | null;
  page_start: number | null;
  discipline: Discipline;
  children: GramBab[];
}
export interface GramBookMeta {
  slug: string; title_ar: string; author_name: string | null;
  author_death_ah: number | null; genre: string | null;
  edition_label: string | null; betaka: string | null; page_count: number;
}
export interface GramBookResult {
  book: GramBookMeta; spine: GramBab[]; bab_count: number;
  /// A long table of contents arrives a level and a page at a time.
  lazy?: boolean; level_count?: number; offset?: number; has_more?: boolean;
}

export interface GramPage {
  id: string; bab_id: string | null; volume_no: number | null;
  part_label: string | null; page_no: number | null; seq: number;
  text_ar: string; footnotes_ar: string | null;
}
export interface GramPagesResult { pages: GramPage[]; page: number; limit: number; total: number; has_more: boolean; }

export interface GramSearchHit {
  id: string; source_slug: string; discipline: Discipline; discipline_label: DiscLabel;
  title_ar: string; bab_id: string | null; page_no: number | null; volume_no: number | null; snippet: string;
}
export interface GramSearchResult { query: string; count: number; results: GramSearchHit[]; }

@Injectable({ providedIn: 'root' })
export class LinguisticsApiService {
  private readonly api = inject(BackendApiService);

  getBooks(): Observable<GramBooksResult> {
    return this.api.getData<GramBooksResult>('al', ['gram', 'books']);
  }

  getBook(slug: string, opts: { parent?: string; offset?: number; limit?: number } = {}): Observable<GramBookResult> {
    let p = new HttpParams();
    if (opts.parent) p = p.set('parent', opts.parent);
    if (opts.offset) p = p.set('offset', String(opts.offset));
    if (opts.limit) p = p.set('limit', String(opts.limit));
    return this.api.getData<GramBookResult>('al', ['gram', 'book', slug], { params: p });
  }

  getPages(slug: string, opts: { bab?: string; page?: number; limit?: number } = {}): Observable<GramPagesResult> {
    let p = new HttpParams();
    if (opts.bab) p = p.set('bab', opts.bab);
    if (opts.page) p = p.set('page', String(opts.page));
    if (opts.limit) p = p.set('limit', String(opts.limit));
    return this.api.getData<GramPagesResult>('al', ['gram', 'pages', slug], { params: p });
  }

  search(q: string, opts: { discipline?: Discipline; source?: string; limit?: number } = {}): Observable<GramSearchResult> {
    let p = new HttpParams().set('q', q);
    if (opts.discipline) p = p.set('discipline', opts.discipline);
    if (opts.source) p = p.set('source', opts.source);
    if (opts.limit) p = p.set('limit', String(opts.limit));
    return this.api.getData<GramSearchResult>('al', ['gram', 'search'], { params: p });
  }
}
