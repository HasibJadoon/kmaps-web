import type { CaptureMarkerRow } from './repositories/capture.repo';

/// A Zāwiya Class take, written out for the edit.
///
/// The take's clock starts at its mark — the flash and tone both iPads gave at
/// once, and the clap the phones heard. In Resolve every recording is lined
/// up on that instant, placed at the timeline's start (01:00:00:00), so the
/// log's times are timeline times.
///
///   chapters  YouTube chapters, one per scene: `0:00 Opening` …
///   markers   an EDL of timeline markers, one per turn, named for the
///             speaker and the scene and coloured by who speaks — import it
///             with Timeline → Import → Timeline Markers from EDL, then cut
///             the multicam to the speaker at each marker.

export interface ExportScene { id: string; heading: string }

const COLORS = ['ResolveColorYellow', 'ResolveColorBlue', 'ResolveColorGreen', 'ResolveColorPink'];

function seconds(tc: string | null): number {
  const m = /^(\d+):(\d+):(\d+)(?:\.(\d+))?$/.exec(tc ?? '');
  if (!m) return 0;
  return +m[1] * 3600 + +m[2] * 60 + +m[3] + (m[4] ? +`0.${m[4]}` : 0);
}

function youtube(t: number): string {
  const s = Math.floor(t), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

function frames(t: number, fps: number, hour = 1): string {
  const f = Math.round(t * fps), per = fps;
  const ff = f % per, s = Math.floor(f / per);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hour + Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}:${pad(ff)}`;
}

function noteOf(m: CaptureMarkerRow): { turn: number; who: string; kind: string } {
  try { return { turn: 0, who: '', kind: '', ...JSON.parse(m.note ?? '{}') }; } catch { return { turn: 0, who: '', kind: '' }; }
}

export function chapters(markers: CaptureMarkerRow[], scenes: ExportScene[]): string {
  const heading = new Map(scenes.map((s) => [s.id, s.heading]));
  const out: string[] = [];
  let last: string | null = null;
  for (const m of markers) {
    if (m.section_ref === last) continue;
    last = m.section_ref;
    // YouTube wants the first chapter at 0:00.
    out.push(`${out.length === 0 ? '0:00' : youtube(seconds(m.start_tc))} ${heading.get(m.section_ref ?? '') ?? ''}`.trim());
  }
  return out.join('\n') + '\n';
}

export function markersEdl(title: string, markers: CaptureMarkerRow[], scenes: ExportScene[], fps: number): string {
  const heading = new Map(scenes.map((s) => [s.id, s.heading]));
  const people: string[] = [];
  const lines = [`TITLE: ${title}`, 'FCM: NON-DROP FRAME', ''];
  markers.forEach((m, i) => {
    const { who, kind } = noteOf(m);
    if (who && !people.includes(who)) people.push(who);
    const at = seconds(m.start_tc);
    const tcIn = frames(at, fps), tcOut = frames(at + 1 / fps, fps);
    const color = who ? COLORS[people.indexOf(who) % COLORS.length] : 'ResolveColorPurple';
    const name = [who || '—', heading.get(m.section_ref ?? '') ?? '', kind === 'visual' ? '(drawing)' : '']
      .filter(Boolean).join(' · ');
    const dur = Math.max(1, Math.round((seconds(m.end_tc) - at) * fps));
    lines.push(`${String(i + 1).padStart(3, '0')}  001      V     C        ${tcIn} ${tcOut} ${tcIn} ${tcOut}  `);
    lines.push(` |C:${color} |M:${name.replace(/\|/g, '/')} |D:${dur}`);
    lines.push('');
  });
  return lines.join('\n');
}
