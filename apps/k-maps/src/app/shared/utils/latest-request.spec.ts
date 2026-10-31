import { Subject } from 'rxjs';
import { LatestRequest } from './latest-request';

describe('LatestRequest', () => {
  it('a newer request under the same key cancels the older one', () => {
    const latest = new LatestRequest();
    const first = new Subject<string>();
    const second = new Subject<string>();
    const seen: string[] = [];

    latest.run('word', first, { next: (v) => seen.push(v) });
    latest.run('word', second, { next: (v) => seen.push(v) });

    first.next('stale');   // the old response arrives late …
    second.next('fresh');  // … and is ignored
    expect(seen).toEqual(['fresh']);
    expect(first.observed).toBe(false);
  });

  it('keeps requests under different keys apart', () => {
    const latest = new LatestRequest();
    const a = new Subject<number>();
    const b = new Subject<number>();
    const seen: number[] = [];
    latest.run('a', a, { next: (v) => seen.push(v) });
    latest.run('b', b, { next: (v) => seen.push(v) });
    a.next(1); b.next(2);
    expect(seen).toEqual([1, 2]);
    expect(latest.pending).toBe(2);
  });

  it('forgets completed requests and cancels the rest on cancelAll', () => {
    const latest = new LatestRequest();
    const a = new Subject<number>();
    const b = new Subject<number>();
    latest.run('a', a);
    latest.run('b', b);
    a.complete();
    expect(latest.pending).toBe(1);
    latest.cancelAll();
    expect(latest.pending).toBe(0);
    expect(b.observed).toBe(false);
  });
});
