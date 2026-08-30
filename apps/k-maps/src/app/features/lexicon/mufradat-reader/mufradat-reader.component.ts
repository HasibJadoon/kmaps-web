import {
  ChangeDetectionStrategy, Component, computed, EventEmitter, Output, input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  MufradatReadView, MufradatParagraph, MufradatProseToken,
} from '../../../shared/services/al-dictionary-api.service';
import { SafeHtmlPipe } from '../../../shared/pipes/safe-html.pipe';

@Component({
  selector: 'km-mufradat-reader',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  templateUrl: './mufradat-reader.component.html',
  styleUrl: './mufradat-reader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MufradatReaderComponent {
  view = input.required<MufradatReadView>();

  trans = input<'both' | 'ar'>('both');

  readonly showTrans = computed(() => this.trans() === 'both');

  @Output() openAyahEvent = new EventEmitter<{ surah: number; ayah: number }>();
  @Output() openFootnoteEvent = new EventEmitter<{
    num: number; printed_page: number | null;
  }>();

  trackParagraph = (i: number, _p: MufradatParagraph) => i;
  trackToken = (i: number, _t: MufradatProseToken) => i;

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

  fnTooltip(t: Extract<MufradatProseToken, { kind: 'footnote' }>): string {
    if (t.text) {
      const pageHint = t.printed_page ? ` (ص ${t.printed_page})` : '';
      return `حاشية ${t.num}${pageHint}: ${t.text}`;
    }
    return `حاشية ${t.num} (لا يوجد نص)`;
  }

  onQuranClick(t: Extract<MufradatProseToken, { kind: 'quran' }>) {
    if (t.surah_num && t.ayah) {
      this.openAyahEvent.emit({ surah: t.surah_num, ayah: t.ayah });
    }
  }

  onFootnoteClick(t: Extract<MufradatProseToken, { kind: 'footnote' }>) {
    this.openFootnoteEvent.emit({ num: t.num, printed_page: t.printed_page });
  }
}
