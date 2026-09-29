import { Injectable, Injector, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DocEditorService } from './doc-editor.service';

@Injectable({ providedIn: 'root' })
export class DocExtractService {
  private http     = inject(HttpClient);
  private injector = inject(Injector);

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
    // the server needs a module, a type and a ref: a card from a doc points back to
    // the doc and the passage it was cut from (the same selection makes the same card)
    let h = 0;
    for (const ch of selectedText) h = (h * 31 + ch.codePointAt(0)!) | 0;
    this.http.post('/api/core/srs/cards', {
      module: 'other',
      resource_type: 'passage',
      resource_ref: `DOC:${this.docId ?? 'loose'}:${(h >>> 0).toString(36)}`,
      front_text: selectedText,
      back_text: '',
      card_kind: 'note',
    }).subscribe();
  }
}
