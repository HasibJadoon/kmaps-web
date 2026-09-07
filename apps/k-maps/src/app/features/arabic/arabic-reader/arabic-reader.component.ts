import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Page {
  id: string; seq: number; part_no: number | null; page_no: number | null;
  title_ar: string | null; text_ar: string; word_count: number;
}
interface Work {
  id: string; title_ar: string | null; title_en: string | null; author: string | null;
  died: string | null; genre_ref: string | null; register: string | null;
  shape: 'prose' | 'diwan' | 'maqama' | 'amthal' | null; playUrl: string | null;
}
interface Bounds { minSeq: number; maxSeq: number; pages: number }
interface Lemma {
  id: string; lemma_ar: string; pos: string | null; frequency: number | null;
  root_id: string; root_text: string; root_normalized: string;
  root_en: string | null; root_ar_gloss: string | null; root_type: string | null;
}
interface Envelope<T> { ok: boolean; data?: T; }

/// One reader, four readings. The shape is not a theme switch — a bayt is two
/// hemistichs on one line and a proverb is a whole utterance in eight words;
/// laying either out as running prose destroys the thing being read.
@Component({
  selector: 'km-arabic-reader',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arabic-reader.component.html',
  styleUrl: './arabic-reader.component.scss',
})
export class ArabicReaderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private base = environment.apiBase;

  readonly loading = signal(true);
  readonly work = signal<Work | null>(null);
  readonly pages = signal<Page[]>([]);
  readonly bounds = signal<Bounds | null>(null);
  readonly shape = signal<string>('prose');

  /// The sharḥ is a second register, not part of the poem. Worldview does the
  /// same with Rumi's translations: present, and off until asked for.
  readonly showSharh = signal(true);

  readonly picked = signal<string | null>(null);
  readonly lookup = signal<{ found: boolean; matchedAs: string | null; tried: string[]; lemmas: Lemma[] } | null>(null);
  readonly looking = signal(false);

  readonly seq = computed(() => this.pages()[0]?.seq ?? 1);
  readonly atStart = computed(() => this.seq() <= (this.bounds()?.minSeq ?? 1));
  readonly atEnd = computed(() => {
    const last = this.pages()[this.pages().length - 1];
    return !last || last.seq >= (this.bounds()?.maxSeq ?? 0);
  });

  /// How many pages to fetch at once, by shape. A dīwān page is a handful of
  /// lines, so one at a time would be all navigation and no reading; a page of
  /// al-Jāḥiẓ is already a sitting.
  private span(): number {
    const s = this.shape();
    if (s === 'diwan') return 4;
    if (s === 'amthal') return 3;
    return 1;   // prose, maqama, series, dialogue: one page is already a sitting
  }

  /// How many baytayn are on the page — worth saying, because a page of a
  /// commented dīwān can carry two lines of poetry and a column of prose.
  baytCount(p: Page): number {
    return this.lines(p).filter((l) => this.kind(l) === 'verse').length;
  }

  toggleSharh(): void { this.showSharh.update((v) => !v); }

  /// Arabic-Indic numerals, because that is how the editions number their lines.
  arabicNum(n: string | number): string {
    return String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
  }

  /// A transcript line that opens with a speaker — "مقدم:" — is dialogue, and
  /// reads as an exchange rather than as prose.
  speaker(line: string): string | null {
    const m = /^([\u0600-\u06FF\w .'\u2019-]{2,28})\s*[:：]\s*(.+)$/.exec(line);
    return m ? m[1].trim() : null;
  }
  said(line: string): string {
    const m = /^[\u0600-\u06FF\w .'\u2019-]{2,28}\s*[:：]\s*(.+)$/.exec(line);
    return m ? m[1] : line;
  }

  /// Shamela separates lines with a carriage return, not a newline. Splitting
  /// on \n alone leaves a whole page as one line — or, on a title page, one
  /// word per line, which is how this was first wrong.
  lines(p: Page): string[] {
    return p.text_ar.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  }

  /// What actually goes on the page.
  ///
  /// Two kinds of source reach this reader and they need opposite treatment.
  /// A scanned book breaks a line when the sentence ends. A transcript breaks
  /// it when the caption box runs out — and Notion's export then puts a blank
  /// line between every one of those, so "blank line means new paragraph" is
  /// exactly wrong there and produced a page of one-line fragments.
  ///
  /// So the wrapping is measured rather than assumed: short lines that mostly
  /// do not end in terminal punctuation are hard-wrapped, and get rejoined into
  /// paragraphs. Anything else is left as the source set it.
  private hardWrapped(raw: string[]): boolean {
    if (raw.length < 4) return false;
    const avg = raw.reduce((n, l) => n + l.length, 0) / raw.length;
    const ended = raw.filter((l) => /[.!?؟।:،؛"»]$/.test(l)).length / raw.length;
    return avg < 72 && ended < 0.3;
  }

  blocks(p: Page): { kind: 'verse' | 'prose'; text: string }[] {
    const raw = p.text_ar.split(/\r\n|[\r\n]/).map((l) => l.trim());
    const wrapped = this.hardWrapped(raw.filter(Boolean));

    const out: { kind: 'verse' | 'prose'; text: string }[] = [];
    let buf: string[] = [];
    const flush = () => {
      if (buf.length) { out.push({ kind: 'prose', text: buf.join(' ') }); buf = []; }
    };

    for (const line of raw) {
      if (!line) { if (!wrapped) flush(); continue; }
      if (this.kind(line) === 'verse') { flush(); out.push({ kind: 'verse', text: line }); continue; }
      if (this.speaker(line) && buf.length) flush();   // a new speaker is a new block
      buf.push(line);
      /// With no punctuation to break on — common in these transcripts — break
      /// on length instead, so the reader gets paragraphs rather than one wall.
      if (wrapped && buf.join(' ').length > 340 && /[.!?؟।،؛]$/.test(line)) flush();
      else if (wrapped && buf.join(' ').length > 520) flush();
    }
    flush();
    return out;
  }

  /// The dīwāns on this shelf are commented editions: mostly the commentator's
  /// prose, with the poem's own lines numbered inside it —
  ///   ٢٨ - فجئت وقد نضت لنوم ثيابها ... لدى الستر
  /// So a line is verse when it is numbered AND carries the hemistich break.
  /// Both, because a numbered line without the break is a heading, and a break
  /// without a number is an ellipsis in prose.
  /// Two conventions, because the editions use two. A dīwān numbers its lines:
  ///     ٢٨ - فجئت وقد نضت لنوم ثيابها ... لدى الستر
  /// A prose book parenthesises the verse it quotes:
  ///     (إذا تخازرت وما بي من خزر ... ثم كسرت العين من غير عور)
  /// Both require the hemistich break, which is what makes it a bayt at all.
  private static readonly NUMBERED = /^([٠-٩0-9]+)\s*[-–]\s*(.+?)\s*(?:\.{3}|…)\s*(.+)$/;
  private static readonly QUOTED   = /^[(（]\s*(.+?)\s*(?:\.{3}|…)\s*(.+?)\s*[)）]$/;

  /// Applied in every shape, not only the dīwāns: a poem quoted in a book of
  /// proverbs is still a poem, and setting it as running prose loses the metre
  /// that is the whole reason it was quoted.
  kind(line: string): 'verse' | 'prose' {
    return ArabicReaderComponent.NUMBERED.test(line) || ArabicReaderComponent.QUOTED.test(line)
      ? 'verse' : 'prose';
  }

  /// The bayt's number where the edition gives one — it is how a line of
  /// poetry is cited. A quoted verse has none, and gets none invented.
  baytNo(line: string): string {
    return ArabicReaderComponent.NUMBERED.exec(line)?.[1] ?? '';
  }

  /// Its two hemistichs. Where neither pattern holds the line comes back whole
  /// rather than cut at an invented midpoint.
  hemistichs(line: string): string[] {
    const n = ArabicReaderComponent.NUMBERED.exec(line);
    if (n) return [n[2], n[3]];
    const q = ArabicReaderComponent.QUOTED.exec(line);
    if (q) return [q[1], q[2]];
    return [line];
  }

  /// Words, kept as words so each can be tapped. Punctuation rides along with
  /// the token it follows rather than becoming a tappable nothing.
  words(text: string): string[] {
    return text.split(/(\s+)/).filter((t) => t.trim().length > 0);
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      this.shape.set(p.get('shape') ?? 'prose');
      this.load(p.get('workId')!, Number(p.get('seq') ?? 1));
    });
  }

  private load(workId: string, from: number): void {
    this.loading.set(true);
    this.http
      .get<Envelope<{ work: Work; pages: Page[]; bounds: Bounds }>>(
        `${this.base}/ar/text/works/${workId}/pages?from=${from}&limit=${this.span()}`,
      )
      .subscribe({
        next: (r) => {
          this.work.set(r?.data?.work ?? null);
          this.pages.set(r?.data?.pages ?? []);
          this.bounds.set(r?.data?.bounds ?? null);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private go(seq: number): void {
    const w = this.work(); if (!w) return;
    this.picked.set(null); this.lookup.set(null);
    this.router.navigate(['/arabic/read', w.id, this.shape(), seq]);
  }

  next(): void {
    const last = this.pages()[this.pages().length - 1];
    if (last) this.go(last.seq + 1);
  }
  prev(): void { this.go(Math.max((this.bounds()?.minSeq ?? 1), this.seq() - this.span())); }

  /// Tapping a word asks the lexicon, which does the folding — the page prints
  /// `الأسدُ` and the root is `اسد`, and that gap is not the reader's problem.
  tap(word: string): void {
    const clean = word.replace(/[^ء-يً-ْ]/g, '');
    if (!clean) return;
    if (this.picked() === word) { this.picked.set(null); this.lookup.set(null); return; }
    this.picked.set(word);
    this.looking.set(true);
    this.http
      .get<Envelope<{ found: boolean; matchedAs: string | null; tried: string[]; lemmas: Lemma[] }>>(
        `${this.base}/al/lookup?w=${encodeURIComponent(clean)}`,
      )
      .subscribe({
        next: (r) => { this.lookup.set(r?.data ?? null); this.looking.set(false); },
        error: () => { this.lookup.set(null); this.looking.set(false); },
      });
  }

  /// playUrl arrives as a gateway path; <audio> needs it absolute.
  audioSrc(): string | null {
    const u = this.work()?.playUrl; if (!u) return null;
    return u.startsWith('http') ? u : `${this.base.replace(/\/api$/, '')}${u}`;
  }

  progress(): number {
    const b = this.bounds(); if (!b || !b.maxSeq) return 0;
    return Math.round(((this.seq() - b.minSeq) / Math.max(1, b.maxSeq - b.minSeq)) * 100);
  }

  back(): void { this.router.navigate(['/arabic/read']); }
}
