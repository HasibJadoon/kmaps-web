import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { QrTafsirGroupDisplayPayload, QrTafsirDisplayBlock } from '../../models/quran/qr.models';

interface CountedTag { label: string; count: number; meta?: string; }

@Component({
  selector: 'km-tafsir-analysis-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tafsir-analysis-panel.component.html',
  styleUrl: './tafsir-analysis-panel.component.scss',
})
export class TafsirAnalysisPanelComponent {
  readonly payload = input<QrTafsirGroupDisplayPayload | null>(null);

  /** Block types in the worker's order (block_type_order), labelled by the worker. */
  readonly blockTypes = computed<CountedTag[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, CountedTag & { order: number }>();
    for (const b of p.blocks) {
      const cur = counts.get(b.block_type);
      if (cur) { cur.count++; continue; }
      if (b.block_type_order == null) continue;
      counts.set(b.block_type, {
        label: b.block_type_label_ar ?? b.block_type, count: 1, meta: b.block_type, order: b.block_type_order,
      });
    }
    return [...counts.values()].sort((a, b) => a.order - b.order)
      .map(({ label, count, meta }) => ({ label, count, meta }));
  });

  readonly scholarsPresent = computed<CountedTag[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, { count: number; label: string }>();
    for (const b of p.blocks as QrTafsirDisplayBlock[]) {
      if (!b.scholar_id) continue;
      const key = b.scholar_id;
      const cur = counts.get(key);
      const label = b.scholar_name_ar ?? b.scholar_id;
      if (cur) cur.count++;
      else counts.set(key, { count: 1, label });
    }
    return [...counts.values()]
      .map(x => ({ label: x.label, count: x.count }))
      .sort((a, b) => b.count - a.count);
  });

  readonly madhabs = computed<CountedTag[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, CountedTag>();
    for (const b of p.blocks as QrTafsirDisplayBlock[]) {
      if (!b.madhab) continue;
      const cur = counts.get(b.madhab);
      if (cur) cur.count++;
      else counts.set(b.madhab, { label: b.madhab_label_ar ?? b.madhab, count: 1, meta: b.madhab });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  });

  readonly eras = computed<CountedTag[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, CountedTag>();
    for (const b of p.blocks as QrTafsirDisplayBlock[]) {
      if (!b.era) continue;
      const cur = counts.get(b.era);
      if (cur) cur.count++;
      else counts.set(b.era, { label: b.era_label_ar ?? b.era, count: 1 });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  });

  readonly longFormCoverage = computed<{ count: number; paragraphs: number; scholars: string[] } | null>(() => {
    const p = this.payload();
    if (!p) return null;
    let longCount = 0;
    let paragraphs = 0;
    const scholars = new Set<string>();
    for (const b of p.blocks as QrTafsirDisplayBlock[]) {
      if (b.is_long_form && b.block_type === 'tafsir_card') {
        longCount++;
        if (b.scholar_name_ar) scholars.add(b.scholar_name_ar);
      }
      if (b.block_type === 'paragraph_section') paragraphs++;
    }
    if (longCount === 0 && paragraphs === 0) return null;
    return { count: longCount, paragraphs, scholars: [...scholars] };
  });

  readonly collapsed = signal<Set<string>>(new Set());
  isCollapsed(key: string): boolean { return this.collapsed().has(key); }
  toggle(key: string): void {
    this.collapsed.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  readonly hasAnyContent = computed(() =>
    this.blockTypes().length > 0 ||
    this.scholarsPresent().length > 0 ||
    this.madhabs().length > 0 ||
    this.eras().length > 0 ||
    this.longFormCoverage() !== null,
  );
}
