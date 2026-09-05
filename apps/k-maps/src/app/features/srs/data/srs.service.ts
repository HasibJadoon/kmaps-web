import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { BackendApiService } from '../../../shared/services/backend-api.service';

export type SrsQueueFilter = 'due' | 'upcoming' | 'all' | 'suspended';
export type SrsRating = 'again' | 'hard' | 'good' | 'easy';

/** What the worker's grade endpoint accepts. Anything else is a 400. */
export const RATING_VALUE: Record<SrsRating, 1 | 2 | 3 | 4> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

/** A deck id is whatever `core_srs_deck.id` holds — never a value this app invents. */
export type SrsDeckId = string;

/** `GET /core/srs/decks` — one row per deck the signed-in user owns. */
export interface SrsDeckRow {
  id: string;
  title: string;
  deck_type: string;
  description: string | null;
  is_shared: number;
  parent_id: string | null;
  slug: string | null;
  sort_order: number | null;
  new_per_day: number | null;
  review_per_day: number | null;
  limit_scope: string | null;
  card_count: number;
  due_count: number;
  new_count: number;
}

/**
 * The deck as the grid draws it. `label` and `description` are the worker's
 * words; only `accent` and `monogram` are added here, because they are how a
 * tile is painted rather than anything the deck knows about itself.
 */
export interface SrsDeckMeta {
  id: SrsDeckId;
  index: number;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
  monogram: string;
  footer: string;
  cardCount: number;
  dueCount: number;
  newCount: number;
}

/** Tile accents, cycled by position. Presentation only — no deck meaning rides on the order. */
const ACCENTS = ['#d0ad56', '#b985ff', '#57c7a8', '#6aa8ff', '#ff9f63', '#7fdc8f'] as const;

export interface SrsSummary {
  due: number;
  upcoming: number;
  suspended: number;
  total: number;
}

/** One card, as `cardToApi` in the core worker emits it. */
export interface SrsApiCard {
  id: string;
  deck_id: string;
  module: string | null;
  resource_type: string | null;
  resource_ref: string | null;
  card_template: string | null;
  card_kind: string | null;
  concept_domain: string | null;
  front_text: string | null;
  back_text: string | null;
  note_type_id: string | null;
  fields: Record<string, unknown> | null;
  root_norm: string | null;
  intro_surah: number | null;
  extra: Record<string, unknown> | null;
  tags: string[];
  suspended: boolean;
  stability: number | null;
  difficulty: number | null;
  card_state: string;
  learning_step: number;
  reps: number;
  lapses: number;
  elapsed_days: number;
  scheduled_days: number;
  last_review_at: string | null;
  next_review_at: string | null;
  /** Days until the card would next be due at each rating, from the worker. */
  preview_days: Record<string, number> | null;
  retrievability: number | null;
}

export interface SrsQueueItem extends SrsApiCard {
  /** `next_review_at` under the name the review screens already use. */
  due_at: string | null;
  /** The sūra this card was introduced with, if any. */
  surah_id: number | null;
  /**
   * The rating just submitted for this card in this session. The card itself
   * does not carry one — ratings live in `core_srs_review` — so this is only
   * set on the item returned by `reviewCard`.
   */
  last_rating?: SrsRating;
  deck_label: string;
  due_state: Exclude<SrsQueueFilter, 'all'>;
  prompt: string;
  answer: string;
  title: string;
  reference: string;
}

export interface SrsQueueResponse {
  filter: SrsQueueFilter;
  total: number;
  items: SrsQueueItem[];
  summary: SrsSummary;
  decks: SrsDeckMeta[];
}

/** `GET /core/srs/review` */
interface ApiReviewResponse {
  due: SrsApiCard[];
  due_by_module?: Record<string, number>;
  ahead_days?: number;
}

@Injectable({ providedIn: 'root' })
export class SrsService {
  private readonly api = inject(BackendApiService);

  /** The decks themselves, straight off km_core. */
  decks(): Observable<SrsDeckMeta[]> {
    return this.api
      .getData<SrsDeckRow[]>('core', ['srs', 'decks'])
      .pipe(map((rows) => (rows ?? []).map((row, i) => this.toDeckMeta(row, i))));
  }

  /**
   * The queue and the decks it belongs to, resolved together so a card can
   * carry its deck's real title instead of one guessed from its text.
   *
   * `ahead` widens the window past today so the grid can show upcoming
   * cards; for the plain due queue the worker also applies each deck's
   * daily caps to what it serves.
   */
  loadBoard(filter: SrsQueueFilter, surahId: number | null): Observable<SrsQueueResponse> {
    let params = new HttpParams().set('limit', '200');
    if (surahId) params = params.set('surah', String(surahId));
    if (filter !== 'due') params = params.set('ahead', '365');

    return forkJoin({
      decks: this.decks(),
      queue: this.api.getData<ApiReviewResponse>('core', ['srs', 'review'], { params }),
    }).pipe(
      map(({ decks, queue }) => {
        const titles = new Map(decks.map((d) => [d.id, d.label]));
        const items = (queue?.due ?? []).map((c) => this.decorate(c, titles.get(c.deck_id) ?? ''));
        const kept = filter === 'all' ? items : items.filter((i) => i.due_state === filter);
        return { filter, total: kept.length, items: kept, summary: this.summarize(items), decks };
      }),
    );
  }

  /** Grade one card. The worker takes 1-4; the UI speaks again/hard/good/easy. */
  reviewCard(item: SrsQueueItem, rating: SrsRating, durationSecs?: number): Observable<SrsQueueItem> {
    const body: Record<string, unknown> = { rating: RATING_VALUE[rating] };
    if (typeof durationSecs === 'number') body['duration_secs'] = Math.round(durationSecs);

    return this.api
      .postData<SrsApiCard>('core', ['srs', 'cards', item.id, 'grade'], body)
      .pipe(map((card) => ({ ...this.decorate(card, item.deck_label), last_rating: rating })));
  }

  private toDeckMeta(row: SrsDeckRow, index: number): SrsDeckMeta {
    const label = row.title?.trim() || 'Untitled deck';
    return {
      id: row.id,
      index: index + 1,
      label,
      shortLabel: label,
      description: row.description?.trim() ?? '',
      accent: ACCENTS[index % ACCENTS.length],
      monogram: this.monogramFor(label),
      footer: row.deck_type ?? '',
      cardCount: Number(row.card_count ?? 0),
      dueCount: Number(row.due_count ?? 0),
      newCount: Number(row.new_count ?? 0),
    };
  }

  /** First character of the deck's own title — Arabic titles keep their letter. */
  private monogramFor(label: string): string {
    return [...label][0]?.toUpperCase() ?? '◇';
  }

  private summarize(items: SrsQueueItem[]): SrsSummary {
    const summary: SrsSummary = { due: 0, upcoming: 0, suspended: 0, total: items.length };
    for (const item of items) summary[item.due_state] += 1;
    return summary;
  }

  private decorate(card: SrsApiCard, deckLabel: string): SrsQueueItem {
    const fields = card.fields ?? {};
    const prompt = this.pick(card.front_text, this.field(fields, 'Front'), this.field(fields, 'Headword'), card.resource_ref);
    const answer = this.pick(card.back_text, this.field(fields, 'Back'), this.field(fields, 'Meaning'));
    const title = this.pick(this.field(fields, 'Title'), card.card_kind, card.card_template, 'Card');
    const reference = this.pick(
      card.resource_ref,
      card.root_norm,
      card.intro_surah ? `Surah ${card.intro_surah}` : '',
    );

    return {
      ...card,
      due_at: card.next_review_at,
      surah_id: card.intro_surah,
      deck_label: deckLabel,
      due_state: this.dueState(card),
      prompt,
      answer,
      title,
      reference,
    };
  }

  private dueState(card: SrsApiCard): Exclude<SrsQueueFilter, 'all'> {
    if (card.suspended) return 'suspended';
    if (!card.next_review_at) return 'due';
    return new Date(card.next_review_at).getTime() <= Date.now() ? 'due' : 'upcoming';
  }

  private field(fields: Record<string, unknown>, key: string): string | null {
    const v = fields[key];
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') {
      const en = (v as Record<string, unknown>)['en'];
      if (typeof en === 'string') return en;
    }
    return null;
  }

  private pick(...values: Array<string | null | undefined>): string {
    for (const v of values) if (typeof v === 'string' && v.trim()) return v.trim();
    return '';
  }
}
