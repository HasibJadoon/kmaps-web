import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { QrIraabGroupDisplayPayload, QrIraabDisplayBlock } from '../../models/quran/qr.models';

interface CountedTag { label: string; count: number; }

@Component({
  selector: 'km-iraab-analysis-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './iraab-analysis-panel.component.html',
  styleUrl: './iraab-analysis-panel.component.scss',
})
export class IraabAnalysisPanelComponent {
  readonly payload = input<QrIraabGroupDisplayPayload | null>(null);

  private readonly CASE_VOCAB = new Set(['مرفوع', 'منصوب', 'مجرور', 'مبني', 'مجزوم']);
  private readonly MAHALL_VOCAB_PREFIX = ['في محل', 'لا محل لها'];
  private readonly ROLE_KEYWORDS = [
    'فاعل', 'مفعول به', 'مبتدأ', 'خبر', 'نعت', 'بدل', 'حال', 'ظرف',
    'جار ومجرور', 'صلة الموصول', 'حرف جر', 'حرف عطف', 'حرف نصب', 'حرف نفي',
    'اسم موصول', 'فعل مضارع', 'فعل ماض', 'فعل أمر', 'ضمير متصل', 'ضمير منفصل',
    'الأفعال الخمسة',
  ];

  readonly cases = computed<CountedTag[]>(() => this.bucketGrammarTags(t => this.CASE_VOCAB.has(t)));
  readonly mahalTypes = computed<CountedTag[]>(() =>
    this.bucketGrammarTags(t => this.MAHALL_VOCAB_PREFIX.some(p => t.startsWith(p))),
  );
  readonly roles = computed<CountedTag[]>(() => this.bucketGrammarTags(t => this.ROLE_KEYWORDS.includes(t)));

  readonly wordCoverage = computed<{ total: number; unique: number; words: string[] }>(() => {
    const p = this.payload();
    if (!p) return { total: 0, unique: 0, words: [] };
    const all: string[] = [];
    const set = new Set<string>();
    for (const b of p.blocks as QrIraabDisplayBlock[]) {
      if (b.block_type !== 'irab_card' || !b.word_text) continue;
      all.push(b.word_text);
      set.add(b.word_text);
    }
    return { total: all.length, unique: set.size, words: [...set].slice(0, 24) };
  });

  /** Sections (iʿrāb, ṣarf, balāgha …) as the QR worker keys, labels and orders them. */
  readonly sectionCoverage = computed<CountedTag[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, CountedTag & { order: number }>();
    for (const b of p.blocks as QrIraabDisplayBlock[]) {
      if (!b.section_key || !b.section_label_ar) continue;
      const cur = counts.get(b.section_key);
      if (cur) cur.count++;
      else counts.set(b.section_key, { label: b.section_label_ar, count: 1, order: b.section_order ?? 99 });
    }
    return [...counts.values()].sort((a, b) => a.order - b.order).map(({ label, count }) => ({ label, count }));
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
    this.cases().length > 0 ||
    this.mahalTypes().length > 0 ||
    this.roles().length > 0 ||
    this.wordCoverage().unique > 0 ||
    this.sectionCoverage().length > 0,
  );

  private bucketGrammarTags(match: (t: string) => boolean): CountedTag[] {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, number>();
    for (const b of p.blocks) {
      for (const t of (b.grammar_tags ?? [])) {
        if (match(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return [...counts.entries()].map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

}
