import { DestroyRef } from '@angular/core';
import { Observable, Observer, Subscription } from 'rxjs';

/**
 * switchMap for imperative loaders: keeps only the newest request per key. Starting a
 * request cancels the one still in flight under the same key, so a slow response for an
 * old route param can never overwrite the newer one. Everything is cancelled on destroy.
 *
 *   private readonly latest = new LatestRequest(inject(DestroyRef));
 *   this.latest.run('word', this.svc.getWord(id), { next: (w) => this.word.set(w) });
 */
export class LatestRequest {
  private readonly subs = new Map<string, Subscription>();

  constructor(destroyRef?: DestroyRef) {
    destroyRef?.onDestroy(() => this.cancelAll());
  }

  run<T>(key: string, source: Observable<T>, observer: Partial<Observer<T>> = {}): Subscription {
    this.cancel(key);
    const sub = source.subscribe(observer);
    if (!sub.closed) {
      this.subs.set(key, sub);
      sub.add(() => { if (this.subs.get(key) === sub) this.subs.delete(key); });
    }
    return sub;
  }

  cancel(key: string): void {
    this.subs.get(key)?.unsubscribe();
    this.subs.delete(key);
  }

  cancelAll(): void {
    for (const sub of this.subs.values()) sub.unsubscribe();
    this.subs.clear();
  }

  /** Requests still in flight (for tests and debugging). */
  get pending(): number {
    return this.subs.size;
  }
}
