import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BackendApiService } from './backend-api.service';

// ── Response shapes (mirror /ar/toc/* and /ar/sources worker responses) ───────
// The three domains of Arabic linguistics. NH and SF are the foundation, BL
// builds on both — the order the worker returns them in is the teaching order.
export type DisciplineCode = 'NH' | 'SF' | 'BL';

export interface ArCourse {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  level: string | null;
  description_md: string | null;
  is_published: number;
}

export interface ArDiscipline {
  code: DisciplineCode;
  slug: string;
  name_ar: string;
  name_en: string;
  name_ur: string | null;
  tagline_en: string | null;
  root_node_id: string | null;
  container_id: string | null;
  accent: string | null;
  sort_order: number;
  course: ArCourse | null;
  counts: { modules: number; topics: number; sources: number; minutes: number };
}

/**
 * A node of the classical hierarchy — fann, qism, bāb, faṣl or masʾala — with
 * its own children nested inside it. The tree arrives already nested; the UI
 * never has to rebuild it from a flat list.
 */
export interface ArTocNode {
  id: string;
  parent_id: string | null;
  discipline: DisciplineCode | string;
  node_type: string;
  name_ar: string;
  name_en: string | null;
  name_ur: string | null;
  definition_ar: string | null;
  depth: number;
  path: string | null;
  sort_order: number;
  status: string;
  unit_id: string | null;
  source_count: number;
  children: ArTocNode[];
}

export interface ArTocModule {
  id: string;
  parent_id: string | null;
  title: string;
  title_ar: string | null;
  unit_type: string;
  unit_index: number;
  description_md: string | null;
  estimated_mins: number | null;
  skill_focus: string | null;
  gn_node_id: string | null;
  lessons: ArTocModule[];
  topics: ArTocNode[];
}

export interface ArCurriculum {
  discipline: ArDiscipline;
  course: (ArCourse & { container_type: string; discipline: string }) | null;
  modules: ArTocModule[];
  /** Topics of the discipline that no module teaches — the reference tree. */
  unassigned: ArTocNode[];
}

export interface ArSource {
  id: string;
  source_kind: string;      // book | video | …
  title_ar: string | null;
  title_en: string | null;
  author_ar: string | null;
  author_en: string | null;
  death_year: string | null;
  url: string | null;
  platform: string | null;
  edition: string | null;
  locator: string | null;
  lang: string | null;
  discipline: string | null;
  authority: string;        // classical | matn | primary_modern | pedagogical
  al_source_slug: string | null;
  notes_md: string | null;
  cited_by: number;
}

export interface ArSourceGroup {
  discipline: string | null;
  name_ar: string | null;
  name_en: string;
  accent: string | null;
  sources: ArSource[];
}

export interface ArSourceCitation {
  id: string;
  name_ar: string;
  name_en: string | null;
  node_type: string;
  depth: number;
  path: string | null;
  discipline: string;
  unit_id: string | null;
  unit_title: string | null;
  locator: string | null;
  role: string;
  timestamp_s: number | null;
  note_ar: string | null;
}

export interface ArNodeDetail {
  node: ArTocNode;
  ancestors: ArTocNode[];
  unit: Record<string, unknown> | null;
  sources: (ArSource & { locator: string | null; role: string; timestamp_s: number | null })[];
}

@Injectable({ providedIn: 'root' })
export class ArabicCurriculumApiService {
  private readonly api = inject(BackendApiService);

  /** The three domains, each with its course and live counts. */
  getDisciplines(): Observable<{ disciplines: ArDiscipline[] }> {
    return this.api.getData<{ disciplines: ArDiscipline[] }>('ar', ['toc']);
  }

  /** One domain's whole table of contents, already nested. Code or slug. */
  getCurriculum(discipline: string): Observable<ArCurriculum> {
    return this.api.getData<ArCurriculum>('ar', ['toc', discipline]);
  }

  getNode(id: string): Observable<ArNodeDetail> {
    return this.api.getData<ArNodeDetail>('ar', ['toc', 'node', id]);
  }

  /** Every source the curriculum leans on, grouped by the domain it serves. */
  getSources(): Observable<{ groups: ArSourceGroup[] }> {
    return this.api.getData<{ groups: ArSourceGroup[] }>('ar', ['sources']);
  }

  getSourcesFiltered(opts: { discipline?: string; kind?: string } = {}): Observable<{ sources: ArSource[] }> {
    let p = new HttpParams();
    if (opts.discipline) p = p.set('discipline', opts.discipline);
    if (opts.kind) p = p.set('kind', opts.kind);
    return this.api.getData<{ sources: ArSource[] }>('ar', ['sources'], { params: p });
  }

  getSource(id: string): Observable<{ source: ArSource; cited_at: ArSourceCitation[] }> {
    return this.api.getData<{ source: ArSource; cited_at: ArSourceCitation[] }>('ar', ['sources', id]);
  }
}
