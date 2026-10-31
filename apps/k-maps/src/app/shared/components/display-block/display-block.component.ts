import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import type {
  QrTafsirDisplayBlock,
  QrIraabDisplayBlock,
  QrDisplayMadhab,
  QrDisplayQuranRef,
} from '../../models/quran/qr.models';

export type AnyDisplayBlock = QrTafsirDisplayBlock | QrIraabDisplayBlock;

interface MadhabChip { label: string; color: string; }
const MADHAB_COLORS: Record<QrDisplayMadhab, string> = {
  sunni: '#4A6E8A', maliki: '#2F7A5C', shafii: '#8E6E1E', hanbali: '#6E4A3A',
  hanafi: '#7A4A8E', mutazili: '#6E588E', ashari: '#B0533A', athari: '#3F6E5A',
};

@Component({
  selector: 'km-display-block',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './display-block.component.html',
  styleUrl: './display-block.component.scss',
})
export class DisplayBlockComponent {
  private readonly router = inject(Router);

  readonly block = input.required<AnyDisplayBlock>();
  readonly compact = input<boolean>(false);
  readonly allowHtml = input<boolean>(false);

  readonly expanded = signal(false);

  readonly madhabChip = computed<MadhabChip | null>(() => {
    const b = this.block() as QrTafsirDisplayBlock;
    if (!b.madhab) return null;
    return { label: b.madhab_label_ar ?? b.madhab, color: MADHAB_COLORS[b.madhab] ?? '#6E665A' };
  });

  readonly previewText = computed(() => {
    const b = this.block();
    const text = b.text_ar ?? '';
    if (this.expanded() || !b.is_long_form || text.length < 800) return text;
    return text.slice(0, 600).trimEnd() + '…';
  });

  /** Review-status chip text, labelled by the QR worker. */
  readonly statusChipLabel = computed(() => {
    const b = this.block();
    return b.review_status_label_ar ?? b.review_status;
  });

  toggleExpand(): void { this.expanded.update(v => !v); }

  onRefClick(ref: QrDisplayQuranRef): void {
    if (ref.surah && ref.ayah) {
      this.router.navigate(['/quran/tafseer'], { queryParams: { surah: ref.surah, ayah: ref.ayah } });
    }
  }

  readonly hasGrammarTags = computed(() => (this.block().grammar_tags ?? []).length > 0);
  readonly hasNarrationTags = computed(() => (this.block() as QrTafsirDisplayBlock).narration_tags?.length > 0);
  readonly hasTheologyTags = computed(() => (this.block() as QrTafsirDisplayBlock).theology_tags?.length > 0);
  readonly isnadLinks = computed(() => {
    const meta = this.block().meta as { isnad?: { links?: Array<{ narrator_text: string; position?: number }> } } | undefined;
    return meta?.isnad?.links ?? [];
  });
  readonly externalSvgUrl = computed(() => {
    const er = this.block().external_resource;
    if (!er || er.kind !== 'svg') return null;
    const b = this.block();
    if (b.surah_no && b.ayah_no) return `/api/qr/irab/dep-graph/${b.surah_no}/${b.ayah_no}`;
    return null;
  });
}
