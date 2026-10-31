import { DestroyRef, Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ArabicApiService } from '../../../shared/services/arabic-api.service';
import { environment } from '../../../../environments/environment';

import { PressableDirective } from '../../../shared/directives/pressable.directive';
import { LatestRequest } from '../../../shared/utils/latest-request';
import { ArabicDigitsPipe } from '../../../shared/pipes/arabic-digits.pipe';
/// One line of the recording's timeline: its seconds, and one [start, end]
/// per word where the recogniser timed them.
interface Segment { seq: number; start: number; end: number; text: string; speaker: string | null; anchored: boolean; words: number[][] | null }
interface Passage { who: string | null; spoken: string | null; lines: { seg: Segment; i: number }[] }
interface VideoRef { provider: string; id: string }
interface Page {
  id: string; seq: number; part_no: number | null; page_no: number | null;
  title_ar: string | null; text_ar: string; word_count: number;
  pagePlayUrl: string | null; pageVideo: VideoRef | null; pageSegments: Segment[];
  pageAudioTitle: string | null; pageAudioSec: number | null;
}
interface Work {
  id: string; title_ar: string | null; title_en: string | null; author: string | null;
  died: string | null; genre_ref: string | null; register: string | null;
  shape: 'prose' | 'diwan' | 'maqama' | 'amthal' | null; playUrl: string | null; video: VideoRef | null;
}
/// A note on a line, at a moment of the recording — kept on the server with the
/// rest of the reading state, so it is the same note on the phone.
interface Note { seq: number; text: string; note?: string; t?: number; at?: unknown }
interface ReadingState { workId: string; status: string; progressSeq: number | null; favourite: boolean; bookmarks: number[]; highlights: Note[] }
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
  imports: [ArabicDigitsPipe, PressableDirective, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arabic-reader.component.html',
  styleUrl: './arabic-reader.component.scss',
})
export class ArabicReaderComponent implements OnInit, OnDestroy {
  private readonly latest = new LatestRequest(inject(DestroyRef));
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly ar = inject(ArabicApiService);
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

  // ── the recording, followed ──────────────────────────────────────────
  // 'read' is the page as printed. 'listen' plays the page's recording,
  // 'watch' the video it came from; either drives the same text, line by line
  // and word by word, from the segments the page carries.
  readonly mode = signal<'read' | 'listen' | 'watch'>('read');
  readonly t = signal(0);
  readonly playing = signal(false);
  readonly duration = signal(0);
  readonly rate = signal(1);
  readonly rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
  readonly ytReady = signal(false);
  @ViewChild('aud') private audioRef?: ElementRef<HTMLAudioElement>;
  private yt: any = null;
  private tick: ReturnType<typeof setInterval> | null = null;

  readonly segments = computed<Segment[]>(() => this.pages()[0]?.pageSegments ?? []);
  readonly synced = computed(() => this.mode() !== 'read' && this.segments().length > 0);

  /// Where a passage ends.
  ///
  /// A transcript carries no paragraph marks — the recogniser breaks where its
  /// own chunk ran out, mid-clause, and nothing in the text says where the
  /// thought ended. So the recording is asked instead: the silence between two
  /// lines is where the speaker stopped, and that is the paragraph.
  ///
  /// A named turn opens one too. An *unnamed* line never does: the chunk that
  /// straddles a turn carries the end of one voice and the start of the next,
  /// and cutting on it strands somebody's last three words as a paragraph.
  static readonly PAUSE = 0.7;
  /// CAP is the length at which a run is cut regardless — not a hard ceiling,
  /// since the cut is then moved to the nearest silence, which can carry it a
  /// couple of lines past. MIN_RUN is the fewest lines a break may leave
  /// behind before it is not worth making.
  static readonly CAP = 11;
  static readonly MIN_RUN = 2;
  /// Whether this line starts somebody's turn — a named line whose speaker is
  /// not the one already talking. A pause inside one long turn is not a turn.
  static opensTurn(i: number, segs: Segment[]): boolean {
    const who = segs[i].speaker;
    return !!who && (i === 0 || who !== segs[i - 1].speaker);
  }

  static endsSentence(line: string): boolean {
    // Not the colon: it opens a speaker's turn, it does not close a sentence.
    return /[؟!.…؛]$/.test(line.trim());
  }

  /// The cuts inside an over-long run: as few as will bring it under the cap,
  /// each at the widest silence near where it has to fall, so a forced break
  /// still lands between two breaths rather than inside a phrase.
  static cuts(lo: number, hi: number, segs: Segment[]): number[] {
    const n = hi - lo;
    if (n <= ArabicReaderComponent.CAP) return [];
    const parts = Math.ceil(n / ArabicReaderComponent.CAP);
    const size = n / parts;
    const out: number[] = [];
    for (let k = 1; k < parts; k++) {
      const ideal = lo + Math.round(k * size);
      const w = Math.max(2, Math.floor(ArabicReaderComponent.CAP / 3));
      const first = Math.max(lo + 1, ideal - w);
      const last = Math.min(hi - 1, ideal + w);
      if (first > last) continue;
      let best = ideal, widest = -1;
      for (let i = first; i <= last; i++) {
        // A full stop is a better place to break than a long breath, where
        // the transcript troubles to give one.
        const gap = segs[i].start - segs[i - 1].end
          + (ArabicReaderComponent.endsSentence(segs[i - 1].text) ? 10 : 0);
        if (gap > widest) { widest = gap; best = i; }
      }
      if (out[out.length - 1] !== best) out.push(best);
    }
    return out;
  }

  readonly passages = computed<Passage[]>(() => {
    const segs = this.segments();
    if (!segs.length) return [];
    const A = ArabicReaderComponent;
    // Where a passage could start: a silence, or a change of voice.
    const candidates: number[] = [0];
    for (let i = 1; i < segs.length; i++) {
      if (segs[i].start - segs[i - 1].end >= A.PAUSE
          || segs[i].speaker !== segs[i - 1].speaker) candidates.push(i);
    }
    // A break that would leave one line standing alone is not a paragraph, it
    // is a widow: the recogniser's chunk straddles the turn, so the orphan is
    // somebody's last three words, ending mid-phrase. Fold it back into the
    // passage above. A named turn is never folded — a one-line turn is a line
    // of a script, and reads as one.
    const starts: number[] = [];
    candidates.forEach((lo, k) => {
      const end = k + 1 < candidates.length ? candidates[k + 1] : segs.length;
      if (end - lo < A.MIN_RUN && !A.opensTurn(lo, segs) && starts.length) return;
      starts.push(lo);
    });
    const bounds: number[] = [];
    starts.forEach((s0, k) => {
      const hi = k + 1 < starts.length ? starts[k + 1] : segs.length;
      bounds.push(s0, ...A.cuts(s0, hi, segs));
    });
    bounds.sort((a, b) => a - b);
    return bounds.map((s0, k) => {
      const hi = k + 1 < bounds.length ? bounds[k + 1] : segs.length;
      const lines: { seg: Segment; i: number }[] = [];
      for (let i = s0; i < hi; i++) lines.push({ seg: segs[i], i });
      // A name is printed once, over the turn it opens. The blocks a long
      // turn is cut into carry no name — it is still standing above them.
      const spoken = segs[s0].speaker ?? null;
      const prev = k > 0 ? (segs[bounds[k - 1]].speaker ?? null) : null;
      return { who: spoken === prev ? null : spoken, spoken, lines };
    }).filter((p) => p.lines.length > 0);
  });

  readonly hasAudio = computed(() => !!(this.pages()[0]?.pagePlayUrl ?? this.work()?.playUrl));
  readonly hasVideo = computed(() => !!(this.pages()[0]?.pageVideo ?? this.work()?.video));
  /// The line under the voice: the one whose window holds t, else the last that has started.
  readonly line = computed<number>(() => {
    const segs = this.segments(); const t = this.t();
    let i = segs.findIndex((s) => t >= s.start && t < s.end);
    if (i < 0) { for (let k = segs.length - 1; k >= 0; k--) if (segs[k].start <= t) { i = k; break; } }
    return i;
  });
  /// The word under the voice within that line, from the recogniser's word times.
  readonly word = computed<number>(() => {
    const seg = this.segments()[this.line()]; if (!seg) return -1;
    const w = seg.words; const t = this.t();
    if (!w || !w.length) return Math.min(this.words(seg.text).length - 1, Math.floor(((t - seg.start) / Math.max(0.1, seg.end - seg.start)) * this.words(seg.text).length));
    let i = w.findIndex(([a, b]) => t >= a && t < b);
    if (i < 0) { for (let k = w.length - 1; k >= 0; k--) if (w[k][0] <= t) { i = k; break; } }
    return Math.max(0, i);
  });

  // ── notes ────────────────────────────────────────────────────────────
  readonly state = signal<ReadingState | null>(null);
  readonly noteFor = signal<number | null>(null);      // segment index being annotated
  readonly noteText = signal('');
  readonly notes = computed<Note[]>(() => (this.state()?.highlights ?? []).filter((h) => (h.note ?? '').trim().length > 0 && h.seq === this.seq()));
  noteOn(i: number): Note | undefined {
    const seg = this.segments()[i]; if (!seg) return undefined;
    return this.notes().find((n) => n.text === seg.text);
  }

  lineState(i: number): 'read' | 'voice' | 'ahead' {
    const cur = this.line(); if (cur < 0) return 'ahead';
    return i < cur ? 'read' : i === cur ? 'voice' : 'ahead';
  }
  wordState(i: number, wi: number): 'read' | 'voice' | 'ahead' | '' {
    if (i !== this.line()) return '';
    const w = this.word(); return wi < w ? 'read' : wi === w ? 'voice' : 'ahead';
  }

  listen(): void {
    this.mode.set('listen'); this.stopYT();
    setTimeout(() => { const a = this.audioRef?.nativeElement; if (a) { a.playbackRate = this.rate(); a.play().catch(() => {}); } }, 0);
    this.startTick();
  }
  watch(): void {
    this.mode.set('watch');
    const a = this.audioRef?.nativeElement; if (a) a.pause();
    setTimeout(() => this.mountYT(), 0);
    this.startTick();
  }
  stopFollowing(): void {
    this.mode.set('read'); this.playing.set(false); this.stopYT();
    const a = this.audioRef?.nativeElement; if (a) a.pause();
    if (this.tick) { clearInterval(this.tick); this.tick = null; }
  }
  private startTick(): void {
    if (this.tick) return;
    this.tick = setInterval(() => {
      if (this.mode() === 'listen') {
        const a = this.audioRef?.nativeElement; if (!a) return;
        this.t.set(a.currentTime); this.playing.set(!a.paused && !a.ended);
        if (a.duration && isFinite(a.duration)) this.duration.set(a.duration);
      } else if (this.mode() === 'watch' && this.yt?.getCurrentTime) {
        this.t.set(this.yt.getCurrentTime() || 0); this.playing.set(this.yt.getPlayerState?.() === 1);
        const d = this.yt.getDuration?.(); if (d) this.duration.set(d);
      }
    }, 100);
  }
  private mountYT(): void {
    const v = this.pages()[0]?.pageVideo ?? this.work()?.video; if (!v) return;
    const make = () => {
      const YT = (window as any).YT;
      if (this.yt) { this.yt.loadVideoById(v.id); return; }
      this.yt = new YT.Player('km-yt', {
        videoId: v.id, playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: { onReady: () => { this.ytReady.set(true); this.yt.setPlaybackRate(this.rate()); this.yt.playVideo(); } },
      });
    };
    if ((window as any).YT?.Player) { make(); return; }
    (window as any).onYouTubeIframeAPIReady = make;
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
    }
  }
  private stopYT(): void { try { this.yt?.pauseVideo?.(); } catch { /* not mounted */ } }

  toggle(): void {
    if (this.mode() === 'watch') { this.playing() ? this.yt?.pauseVideo?.() : this.yt?.playVideo?.(); return; }
    const a = this.audioRef?.nativeElement; if (!a) return;
    a.paused ? a.play().catch(() => {}) : a.pause();
  }
  seekTo(sec: number): void {
    const t = Math.max(0, sec);
    if (this.mode() === 'read') { this.hasAudio() ? this.listen() : this.watch(); }
    if (this.mode() === 'watch') this.yt?.seekTo?.(t, true); else { const a = this.audioRef?.nativeElement; if (a) { a.currentTime = t; a.play().catch(() => {}); } }
    this.t.set(t);
  }
  skip(d: number): void { this.seekTo(this.t() + d); }
  /// Back a line replays the current one if you are more than a moment into it.
  step(d: number): void {
    const segs = this.segments(); if (!segs.length) return;
    const cur = Math.max(0, this.line()); let target = cur + d;
    if (d < 0 && this.t() - segs[cur].start > 1.2) target = cur;
    if (target < 0 || target >= segs.length) return;
    this.seekTo(segs[target].start + 0.02);
  }
  setRate(r: number): void {
    this.rate.set(r);
    const a = this.audioRef?.nativeElement; if (a) a.playbackRate = r;
    this.yt?.setPlaybackRate?.(r);
  }
  /// Templates cannot cast, so the event handling lives here.
  onRail(e: MouseEvent): void {
    const el = e.currentTarget as HTMLElement | null; if (!el || !el.clientWidth) return;
    this.seekTo((e.offsetX / el.clientWidth) * this.duration());
  }
  onRate(e: Event): void { this.setRate(+((e.target as HTMLSelectElement).value)); }
  onNoteInput(e: Event): void { this.noteText.set((e.target as HTMLTextAreaElement).value); }

  clock(s: number): string {
    if (!isFinite(s) || s < 0) return '0:00';
    const t = Math.floor(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  }

  /// A note on a line: what you wrote, at the moment it was said.
  openNote(i: number): void {
    const seg = this.segments()[i]; if (!seg) return;
    this.noteFor.set(i); this.noteText.set(this.noteOn(i)?.note ?? '');
  }
  saveNote(): void {
    const i = this.noteFor(); const seg = i !== null ? this.segments()[i] : null; const w = this.work();
    if (!seg || !w) { this.noteFor.set(null); return; }
    const t = seg.words?.[0]?.[0] ?? seg.start;
    const others = (this.state()?.highlights ?? []).filter((h) => !(h.seq === this.seq() && h.text === seg.text));
    const note = this.noteText().trim();
    const highlights = note ? [...others, { seq: this.seq(), text: seg.text, note, t, at: new Date().toISOString() }] : others;
    this.state.update((s) => s ? { ...s, highlights } : { workId: w.id, status: 'reading', progressSeq: this.seq(), favourite: false, bookmarks: [], highlights });
    this.noteFor.set(null);
    this.ar.put<Envelope<{ state: ReadingState }>>(`ar/reading/state/${encodeURIComponent(w.id)}`, { highlights })
      .subscribe({ next: (r) => { if (r?.data?.state) this.state.set(r.data.state); }, error: () => { /* signed out: the note stays on this page until you sign in */ } });
  }
  private loadState(workId: string): void {
    this.ar.get<Envelope<{ states: ReadingState[] }>>(`ar/reading/state`).subscribe({
      next: (r) => this.state.set(r?.data?.states?.find((s) => s.workId === workId) ?? null),
      error: () => this.state.set(null),
    });
  }
  private saveProgress(workId: string, seq: number): void {
    this.ar.put(`ar/reading/state/${encodeURIComponent(workId)}`, { progressSeq: seq }).subscribe({ error: () => {} });
  }

  ngOnDestroy(): void { this.stopFollowing(); try { this.yt?.destroy?.(); } catch { /* fine */ } this.yt = null; }

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
  /// Shamela records a chapter heading twice — as the page title and as its
  /// first line. The heading is set once, above; the body copy is dropped.
  private static fold(s: string): string {
    return s.replace(/[\u064B-\u065F\u0640]/g, '').trim();
  }
  private dropHeading(lines: string[], p: Page): string[] {
    const t = p.title_ar ? ArabicReaderComponent.fold(p.title_ar) : '';
    const i = lines.findIndex((l) => l.trim());
    if (t && i >= 0 && ArabicReaderComponent.fold(lines[i]) === t) lines.splice(i, 1);
    return lines;
  }

  lines(p: Page): string[] {
    return this.dropHeading(p.text_ar.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean), p);
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
    const raw = this.dropHeading(p.text_ar.split(/\r\n|[\r\n]/).map((l) => l.trim()), p);
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
      if (wrapped) {
        /// With no punctuation to break on — common in these transcripts — break
        /// on length instead, so the reader gets paragraphs rather than one wall.
        if (buf.join(' ').length > 340 && /[.!?؟।،؛]$/.test(line)) flush();
        else if (buf.join(' ').length > 520) flush();
      } else {
        /// Not wrapped means the source breaks lines where sentences end —
        /// Shamela's pages are one paragraph per line — so each line stands.
        flush();
      }
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
    this.latest.run('pages', this.ar
      .get<Envelope<{ work: Work; pages: Page[]; bounds: Bounds }>>(
        `ar/text/works/${workId}/pages?from=${from}&limit=${this.span()}`,
      ), {
        next: (r) => {
          this.work.set(r?.data?.work ?? null);
          this.pages.set(r?.data?.pages ?? []);
          this.bounds.set(r?.data?.bounds ?? null);
          this.loading.set(false);
          this.t.set(0);
          if (!this.state() || this.state()?.workId !== workId) this.loadState(workId);
          this.saveProgress(workId, from);
          // Turning the page while following carries the voice to the new one.
          const m = this.mode();
          if (m === 'watch') { if (this.hasVideo()) setTimeout(() => this.mountYT(), 0); else this.stopFollowing(); }
          else if (m === 'listen') { if (this.hasAudio()) setTimeout(() => this.listen(), 0); else this.stopFollowing(); }
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
    this.ar
      .get<Envelope<{ found: boolean; matchedAs: string | null; tried: string[]; lemmas: Lemma[] }>>(
        `al/lookup?w=${encodeURIComponent(clean)}`,
      )
      .subscribe({
        next: (r) => { this.lookup.set(r?.data ?? null); this.looking.set(false); },
        error: () => { this.lookup.set(null); this.looking.set(false); },
      });
  }

  /// playUrl arrives as a gateway path; <audio> needs it absolute.
  audioSrc(): string | null {
    const u = this.pages()[0]?.pagePlayUrl ?? this.work()?.playUrl; if (!u) return null;
    return u.startsWith('http') ? u : `${this.base.replace(/\/api$/, '')}${u}`;
  }

  progress(): number {
    const b = this.bounds(); if (!b || !b.maxSeq) return 0;
    return Math.round(((this.seq() - b.minSeq) / Math.max(1, b.maxSeq - b.minSeq)) * 100);
  }

  back(): void { this.router.navigate(['/arabic/read']); }
}
