import { Injectable, Injector, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DocEditorService } from './doc-editor.service';

@Injectable({ providedIn: 'root' })
export class DocExtractService {
  private http     = inject(HttpClient);
  private injector = inject(Injector);

  // Resolved lazily to break the DocEditorService ↔ DocExtractService cycle.
  private get editorSvc(): DocEditorService {
    return this.injector.get(DocEditorService);
  }

  private get docId() { return this.editorSvc.docId(); }

  extractToWvTopic(selectedText: string): void {
    this.http.post<{ id: number }>('/api/worldview/topics', { name: selectedText })
      .subscribe(({ id }) => {
        if (!this.docId) return;
        this.http.post(`/api/docs/${this.docId}/links/wv`, {
          block_id: crypto.randomUUID(),
          entity_type: 'topic',
          entity_id: id,
          rel_type: 'extracted'
        }).subscribe();
      });
  }

  extractToVocab(selectedText: string): void {
    this.http.post<{ id: number }>('/api/arabic/vocab', { word: selectedText, meanings: '[]' })
      .subscribe(({ id }) => {
        if (!this.docId) return;
        this.http.post(`/api/docs/${this.docId}/links/arabic`, {
          block_id: crypto.randomUUID(),
          entity_type: 'vocab',
          entity_id: id,
        }).subscribe();
      });
  }


  createSrsCard(selectedText: string): void {
    // POST to SRS endpoint — entity_type='note', entity_id is the doc's row id
    this.http.post('/api/quran/srs', {
      entity_type: 'note',
      front: selectedText,
      back: '',
    }).subscribe();
  }
}
