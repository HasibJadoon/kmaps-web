import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { BackendApiResponse } from '../backend-api.service';

export interface WvSourceRow {
  id: string;
  slug: string | null;
  title: string;
  title_ar: string | null;
  source_type: string | null;
  source_domain: string | null;
  tradition_id: string | null;
  language: string | null;
  published_year: number | null;
  publisher: string | null;
  doi: string | null;
  url: string | null;
  description_md: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WvUnitRow {
  id: string;
  source_id: string;
  parent_id: string | null;
  unit_type: string | null;
  title: string | null;
  unit_index: number | null;
  page_start: number | null;
  page_end: number | null;
  text_excerpt: string | null;
  description_md: string | null;
  created_at: string | null;
}

export interface WvUnitDetailRow extends WvUnitRow {
  locatorLabel?: string | null;
  readingMinutes?: number | null;
  readingSchema?: string | null;
  readingBody?: unknown;
  readingBlocks?: unknown;
  documentId?: string | null;
  documentTitle?: string | null;
  documentSummary?: string | null;
  documentJson?: unknown;
  documentText?: string | null;
  documentBlocks?: unknown;
  children?: unknown[];
}

export interface WvSourceWithUnits extends WvSourceRow {
  units: WvUnitRow[];
}

export interface WvAnnotationsBundle {
  unit_id: string;
  annotations: unknown[];
  highlights: unknown[];
  notes: unknown[];
  wv: unknown[];
  wv_node_edges: unknown[];
  wv_evidence_links: unknown[];
}

export interface WvReadingSession {
  id: string;
  source_id: string;
  source_unit_id: string | null;
  title: string | null;
  session_type: string;
  status: 'active' | 'paused' | 'completed' | string;
  focus_mode: string | null;
  started_at: string;
  ended_at: string | null;
  last_position: string | null;
  duration_secs: number | null;
  summary_md: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvReadingSessionCreate {
  source_id: string;
  source_unit_id?: string | null;
  title?: string | null;
  focus_mode?: string | null;
  last_position?: string | null;
}

export interface WvReadingSessionPatch {
  id: string;
  source_unit_id?: string | null;
  status?: 'active' | 'paused' | 'completed';
  focus_mode?: string | null;
  last_position?: string | null;
  ended_at?: string | null;
  summary_md?: string | null;
}

export interface WvIllustration {
  id: string;
  source_unit_id: string;
  source_id: string | null;
  slug: string | null;
  order_index: number;
  title: string | null;
  caption: string | null;
  theme: string;
  html_content: string;
  meta_json: string | null;
  reading_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export type WvIllustrationSummary = Omit<WvIllustration, 'html_content'>;

export interface WvIllustrationCreate {
  source_unit_id: string;
  html_content: string;
  source_id?: string | null;
  slug?: string | null;
  order_index?: number | null;
  title?: string | null;
  caption?: string | null;
  theme?: string;
  meta_json?: string | null;
  reading_session_id?: string | null;
}

export interface WvIllustrationPatch {
  id: string;
  html_content?: string;
  slug?: string | null;
  order_index?: number | null;
  title?: string | null;
  caption?: string | null;
  theme?: string;
  meta_json?: string | null;
  reading_session_id?: string | null;
}

@Injectable({ providedIn: 'root' })
export class WorldviewLibraryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase.replace(/\/+$/, '');

  listSources(limit = 100): Observable<WvSourceRow[]> {
    return this.http
      .get<BackendApiResponse<WvSourceRow[]>>(`${this.base}/worldview/sources`, {
        params: { limit },
      })
      .pipe(map((res) => (res?.ok ? res.data ?? [] : [])));
  }

  getSource(id: string): Observable<WvSourceWithUnits> {
    return this.http
      .get<BackendApiResponse<WvSourceWithUnits>>(`${this.base}/worldview/sources/${id}`)
      .pipe(map((res) => ({ ...res?.data, units: res?.data?.units ?? [] }) as WvSourceWithUnits));
  }

  getUnit(id: string): Observable<WvUnitDetailRow> {
    return this.http
      .get<BackendApiResponse<WvUnitDetailRow>>(`${this.base}/worldview/units/${id}`)
      .pipe(map((res) => res?.data));
  }

  getUnitAnnotations(id: string): Observable<WvAnnotationsBundle> {
    return this.http
      .get<BackendApiResponse<WvAnnotationsBundle>>(`${this.base}/worldview/units/${id}/annotations`)
      .pipe(map((res) => res?.data));
  }

  getActiveSession(sourceId: string): Observable<WvReadingSession | null> {
    return this.http
      .get<BackendApiResponse<WvReadingSession | null>>(
        `${this.base}/worldview/reading-sessions/active`,
        { params: { source_id: sourceId } },
      )
      .pipe(map((res) => (res?.ok ? res.data ?? null : null)));
  }

  listSessions(sourceId: string): Observable<WvReadingSession[]> {
    return this.http
      .get<BackendApiResponse<WvReadingSession[]>>(`${this.base}/worldview/reading-sessions`, {
        params: { source_id: sourceId, limit: 100 },
      })
      .pipe(map((res) => (res?.ok ? res.data ?? [] : [])));
  }

  createSession(input: WvReadingSessionCreate): Observable<WvReadingSession> {
    return this.http
      .post<BackendApiResponse<WvReadingSession>>(`${this.base}/worldview/reading-session`, input)
      .pipe(map((res) => res?.data));
  }

  updateSession(input: WvReadingSessionPatch): Observable<WvReadingSession | null> {
    return this.http
      .put<BackendApiResponse<WvReadingSession>>(`${this.base}/worldview/reading-session`, input)
      .pipe(map((res) => (res?.ok ? res.data ?? null : null)));
  }

  listUnitIllustrations(unitId: string): Observable<WvIllustrationSummary[]> {
    return this.http
      .get<BackendApiResponse<WvIllustrationSummary[]>>(
        `${this.base}/worldview/units/${unitId}/illustrations`,
      )
      .pipe(map((res) => (res?.ok ? res.data ?? [] : [])));
  }

  listReadingSessionIllustrations(sessionId: string): Observable<WvIllustrationSummary[]> {
    return this.http
      .get<BackendApiResponse<WvIllustrationSummary[]>>(
        `${this.base}/worldview/reading-sessions/${sessionId}/illustrations`,
      )
      .pipe(map((res) => (res?.ok ? res.data ?? [] : [])));
  }

  listSourceIllustrations(sourceId: string): Observable<WvIllustrationSummary[]> {
    return this.http
      .get<BackendApiResponse<WvIllustrationSummary[]>>(
        `${this.base}/worldview/sources/${sourceId}/illustrations`,
      )
      .pipe(map((res) => (res?.ok ? res.data ?? [] : [])));
  }

  getIllustration(id: string): Observable<WvIllustration | null> {
    return this.http
      .get<BackendApiResponse<WvIllustration>>(`${this.base}/worldview/illustrations/${id}`)
      .pipe(map((res) => (res?.ok ? res.data ?? null : null)));
  }

  illustrationPageUrl(id: string): string {
    return `${this.base}/worldview/illustrations/${id}/page`;
  }

  createIllustration(input: WvIllustrationCreate): Observable<WvIllustration | null> {
    return this.http
      .post<BackendApiResponse<WvIllustration>>(`${this.base}/worldview/illustration`, input)
      .pipe(map((res) => (res?.ok ? res.data ?? null : null)));
  }

  updateIllustration(input: WvIllustrationPatch): Observable<WvIllustration | null> {
    return this.http
      .put<BackendApiResponse<WvIllustration>>(`${this.base}/worldview/illustration`, input)
      .pipe(map((res) => (res?.ok ? res.data ?? null : null)));
  }

  deleteIllustration(id: string): Observable<boolean> {
    return this.http
      .delete<BackendApiResponse<{ deleted: boolean }>>(
        `${this.base}/worldview/illustration/${id}`,
      )
      .pipe(map((res) => !!res?.ok));
  }
}
