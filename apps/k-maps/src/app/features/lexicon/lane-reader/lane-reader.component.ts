import {
  ChangeDetectionStrategy, Component, EventEmitter, Output, input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  LaneReadView, LaneVerbForm, LaneSense, LaneToken,
} from '../../../shared/services/al-dictionary-api.service';

@Component({
  selector: 'km-lane-reader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lane-reader.component.html',
  styleUrl: './lane-reader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaneReaderComponent {
  view = input.required<LaneReadView>();

  @Output() openAyahEvent      = new EventEmitter<{ surah: number; ayah: number }>();
  @Output() openAuthorityEvent = new EventEmitter<{ code: string }>();
  @Output() openCrossRefEvent  = new EventEmitter<{ target: string }>();

  trackForm  = (i: number, _f: LaneVerbForm) => i;
  trackSense = (i: number, _s: LaneSense)    => i;
  trackToken = (i: number, _t: LaneToken)    => i;

  // Roman numerals for verb form labels (I, II, III, …). Lane numbers
  // forms 1-15; everything beyond X is shown as the literal number.
  formNumeral(n: number | null): string {
    if (!n) return '';
    const r = ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
    return r[n] ?? `${n}`;
  }

  sigTitle(t: Extract<LaneToken, { kind: 'siglum' }>): string {
    return `${t.code} — ${t.name_en} (${t.name_ar})`;
  }

  // ── Reference marks on Arabic tokens ──────────────────────────────────────
  //
  // Lane marks a word that has its own entry further down with a trailing ↓ (and
  // ↑ for one above). The ingested token carries that mark inside its Arabic
  // value — «كتّبهُ↓» — and a mark is bidi-neutral, so at the end of an RTL run it
  // resolves to the run's *left* edge and paints before the word instead of after
  // it. Splitting it out lets the Arabic keep its own RTL run while the mark sits
  // in the surrounding English flow, where it reads as the trailing mark it is.

  /** The Arabic itself, with any trailing reference mark removed. */
  formText(value: string): string {
    return value.replace(/[↓↑]+\s*$/u, '');
  }

  /** The trailing reference mark, or '' when the token carries none. */
  formMark(value: string): string {
    return (/([↓↑]+)\s*$/u.exec(value)?.[1]) ?? '';
  }

  onQuranClick(t: Extract<LaneToken, { kind: 'quran' }>) {
    if (t.surah && t.ayah) this.openAyahEvent.emit({ surah: t.surah, ayah: t.ayah });
  }
  onSiglumClick(t: Extract<LaneToken, { kind: 'siglum' }>) {
    this.openAuthorityEvent.emit({ code: t.code });
  }
  onCrossRefClick(t: Extract<LaneToken, { kind: 'cross_ref' }>) {
    this.openCrossRefEvent.emit({ target: t.target });
  }
}
