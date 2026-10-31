import { KmDatePipe } from './km-date.pipe';

describe('KmDatePipe', () => {
  const pipe = new KmDatePipe();

  it('formats long (default) and short dates in en-GB', () => {
    expect(pipe.transform('2026-10-03T12:00:00Z')).toBe('3 Oct 2026');
    expect(pipe.transform('2026-10-03T12:00:00Z', 'short')).toBe('3 Oct');
  });

  it('is empty for missing or unreadable dates', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('not a date')).toBe('');
  });

  it('accepts Date objects and timestamps', () => {
    const d = new Date(Date.UTC(2025, 0, 15, 12));
    expect(pipe.transform(d)).toBe('15 Jan 2025');
    expect(pipe.transform(d.getTime(), 'short')).toBe('15 Jan');
  });
});
