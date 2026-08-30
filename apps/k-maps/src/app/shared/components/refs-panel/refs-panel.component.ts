import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import type {
  QrIraabGroupDisplayPayload,
  QrTafsirGroupDisplayPayload,
  QrIraabDisplayBlock,
  QrTafsirDisplayBlock,
} from '../../models/quran/qr.models';

interface RefGroup<T> { label_ar: string; label_en: string; key: string; items: T[]; }
interface QuranRefItem { ayah_key: string; count: number; }
interface HadithRefItem { book: string; volume_page?: string; count: number; }
interface ScholarRefItem { scholar_id: string; label: string; count: number; }
interface ParadigmItem { label: string; count: number; }
interface GrammarTagItem { label: string; count: number; }
interface FootnoteItem { id: string; text_ar: string; kind: string; from_block_id: string | null; }
interface RelatedSourceItem { source_slug: string; label: string; ayah_key: string; }

@Component({
  selector: 'km-refs-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './refs-panel.component.html',
  styleUrl: './refs-panel.component.scss',
})
export class RefsPanelComponent {
  private readonly router = inject(Router);

  readonly payload = input<QrIraabGroupDisplayPayload | QrTafsirGroupDisplayPayload | null>(null);

  readonly mode = input<'iraab' | 'tafsir'>('iraab');

  readonly currentAyahKey = input<string | null>(null);

  readonly quranRefs = computed<QuranRefItem[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const self = this.currentAyahKey();
    const counts = new Map<string, number>();
    for (const b of p.blocks as Array<QrIraabDisplayBlock | QrTafsirDisplayBlock>) {
      for (const r of (b.quran_refs ?? [])) {
        const key = r.ayah_key ?? (r.surah && r.ayah ? `${r.surah}:${r.ayah}` : null);
        if (!key) continue;

        if (self && (key === self || (p.ayah_keys ?? []).includes(key))) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([ayah_key, count]) => ({ ayah_key, count }))
      .sort((a, b) => b.count - a.count);
  });

  readonly hadithRefs = computed<HadithRefItem[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, HadithRefItem>();
    const add = (book: string, vol?: string) => {
      const k = vol ? `${book} (${vol})` : book;
      const cur = counts.get(k);
      if (cur) cur.count++;
      else counts.set(k, { book, volume_page: vol, count: 1 });
    };
    for (const b of p.blocks as Array<QrTafsirDisplayBlock>) {

      for (const t of (b.narration_tags ?? [])) add(t);

      if (b.block_type === 'hadith_source_chip') {
        const meta = (b.meta ?? {}) as { hadith_book?: string; volume_page?: string };
        if (meta.hadith_book) add(meta.hadith_book, meta.volume_page);
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  });

  readonly scholarRefs = computed<ScholarRefItem[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, ScholarRefItem>();
    for (const b of p.blocks as Array<QrTafsirDisplayBlock>) {
      for (const s of (b.scholar_refs ?? [])) {
        const cur = counts.get(s.scholar_id);
        if (cur) cur.count++;
        else counts.set(s.scholar_id, { scholar_id: s.scholar_id, label: s.label ?? s.scholar_id, count: 1 });
      }
    }

    for (const r of ((p.refs ?? []) as Array<{ ref_kind?: string; typed_ref?: string; label?: string }>)) {
      if (r.ref_kind === 'scholar' && r.typed_ref) {
        const cur = counts.get(r.typed_ref);
        if (cur) cur.count++;
        else counts.set(r.typed_ref, { scholar_id: r.typed_ref, label: r.label ?? r.typed_ref, count: 1 });
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  });

  readonly paradigmRefs = computed<ParadigmItem[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, number>();
    for (const b of p.blocks) {
      if (b.block_type === 'paradigm_chip' && b.text_ar) {
        counts.set(b.text_ar, (counts.get(b.text_ar) ?? 0) + 1);
      }
    }
    return [...counts.entries()].map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  });

  readonly grammarTags = computed<GrammarTagItem[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, number>();
    for (const b of p.blocks) {
      for (const t of (b.grammar_tags ?? [])) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return [...counts.entries()].map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  });

  readonly footnotes = computed<FootnoteItem[]>(() => {
    const p = this.payload();
    if (!p) return [];
    return ((p.notes ?? []) as Array<{ id: string; block_id: string | null; note_kind: string; note_text_ar: string | null; review_status?: string }>)
      .filter(n => n.note_text_ar && n.review_status !== 'rejected')
      .map(n => ({ id: n.id, text_ar: n.note_text_ar!, kind: n.note_kind, from_block_id: n.block_id }));
  });

  readonly relatedSources = computed<RelatedSourceItem[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const slugs = new Set<string>();
    for (const b of p.blocks) slugs.add(b.source_slug);
    if (slugs.size <= 1) return [];
    const myAyah = this.currentAyahKey() ?? (p.ayah_keys?.[0] ?? '');
    return [...slugs].map(slug => {
      const src = p.sources.find(s => s.source_slug === slug);
      return { source_slug: slug, label: src?.book_title_ar ?? slug, ayah_key: myAyah };
    });
  });

  readonly collapsedSections = signal<Set<string>>(new Set());
  isCollapsed(key: string): boolean { return this.collapsedSections().has(key); }
  toggle(key: string): void {
    this.collapsedSections.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  readonly panelOpen = signal(true);
  togglePanel(): void { this.panelOpen.update(v => !v); }

  readonly hasAnyContent = computed(() => {
    return this.quranRefs().length > 0
      || this.hadithRefs().length > 0
      || this.scholarRefs().length > 0
      || this.paradigmRefs().length > 0
      || this.grammarTags().length > 0
      || this.footnotes().length > 0
      || this.relatedSources().length > 1;
  });

  goToAyah(ayahKey: string): void {
    const [s, a] = ayahKey.split(':').map(Number);
    if (!s || !a) return;
    const segment = this.mode() === 'tafsir' ? '/quran/tafseer' : '/quran/uloom';
    this.router.navigate([segment], { queryParams: { surah: s, ayah: a } });
  }
}
