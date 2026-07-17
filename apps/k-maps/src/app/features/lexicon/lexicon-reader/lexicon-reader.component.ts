import {
  ChangeDetectionStrategy, Component, EventEmitter, Output, input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  LisanReadView, LisanParagraph, LisanProseToken,
} from '../../../shared/services/al-dictionary-api.service';

@Component({
  selector: 'km-lexicon-reader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lexicon-reader.component.html',
  styleUrl: './lexicon-reader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconReaderComponent {
  view = input.required<LisanReadView>();

  @Output() openAyahEvent     = new EventEmitter<{ surah: number; ayah: number }>();
  @Output() openFootnoteEvent = new EventEmitter<{ num: number }>();
  @Output() openAuthorityEvent = new EventEmitter<{ name: string }>();

  trackParagraph = (i: number, _p: LisanParagraph) => i;
  trackToken     = (i: number, _t: LisanProseToken) => i;

  // Split a plain-text token on ornate ayah brackets ﴿…﴾ so quoted verse runs
  // tint verse-green (`.qq`) inline while exposition stays in the reading ink.
  splitQuoted(value: string): { q: boolean; t: string }[] {
    const parts: { q: boolean; t: string }[] = [];
    const re = /﴿[^﴾]*﴾/gu;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(value)) != null) {
      if (m.index > last) parts.push({ q: false, t: value.slice(last, m.index) });
      parts.push({ q: true, t: m[0] });
      last = m.index + m[0].length;
    }
    if (last < value.length) parts.push({ q: false, t: value.slice(last) });
    return parts.length ? parts : [{ q: false, t: value }];
  }

  fnTooltip(t: Extract<LisanProseToken, { kind: 'footnote' }>): string {
    const pivot = t.pivot ? ` — ${t.pivot}` : '';
    if (t.text) return `حاشية ${t.num}${pivot}: ${t.text}`;
    return `حاشية ${t.num}${pivot} (لا يوجد نص)`;
  }

  onQuranClick(t: Extract<LisanProseToken, { kind: 'quran' }>) {
    if (t.surah && t.ayah) this.openAyahEvent.emit({ surah: t.surah, ayah: t.ayah });
  }
  onFootnoteClick(t: Extract<LisanProseToken, { kind: 'footnote' }>) {
    this.openFootnoteEvent.emit({ num: t.num });
  }
  onAuthorityClick(t: Extract<LisanProseToken, { kind: 'authority' }>) {
    this.openAuthorityEvent.emit({ name: t.name });
  }
}
