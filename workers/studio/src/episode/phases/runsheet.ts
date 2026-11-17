/// The episode's run sheet, in her order (hook → recap → read → meaning → sources → parallel → objection →
/// takeaway → close), each segment with its start time, minutes, who speaks and the line it must land.
import { line, obj } from '../text';

const LABELS: Record<string, string> = {
  hook: 'Hook', recap_chain: 'Recap & chain', recap: 'Recap & chain', read: 'Read', meaning: 'Meaning',
  argument: 'The argument', sources: 'Sources', parallel: 'Parallel', objection: 'Objection', takeaway: 'Takeaway',
  close: 'Close', chain_close: 'Close',
};

export interface Segment { segment: string; label: string; minutes: number; start: string; who: string | null; line: string }

export function runSheet(meta: Record<string, unknown>): { segments: Segment[]; total_minutes: number } {
  const raw = Array.isArray(meta['run_sheet']) ? meta['run_sheet'] : [];
  let at = 0;
  const segments: Segment[] = [];
  for (const r of raw.map(obj)) {
    const seg = line(r['segment']), text = line(r['line']);
    if (!seg || !text) continue;
    const minutes = typeof r['minutes'] === 'number' && r['minutes'] > 0 ? r['minutes'] : 1;
    segments.push({ segment: seg, label: LABELS[seg] ?? seg, minutes, who: line(r['who']), line: text,
      start: `${String(Math.floor(at)).padStart(2, '0')}:00` });
    at += minutes;
  }
  return { segments, total_minutes: at };
}
