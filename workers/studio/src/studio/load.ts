/// Loading for the read API: the whole registry and every episode's rows in one D1 batch each (the library is small —
/// a few hundred episodes over years — so filtering happens in memory and each page is one round trip).

import type { EpisodeBundle, EpisodeRow, Registry } from './types';

type R = Record<string, unknown>;
const all = <T>(res: D1Result<unknown>): T[] => (res.results ?? []) as T[];

export async function loadRegistry(db: D1Database, locale = 'en'): Promise<Registry> {
  const q = (sql: string, ...b: unknown[]) => db.prepare(sql).bind(...b);
  const [labels, tokens, domains, shows, stages, checks, sections, views, series, arcs, meta, layouts] = await db.batch([
    q(`SELECT key, text FROM st_label WHERE locale = ?`, locale),
    q(`SELECT key, kind, value FROM st_token`),
    q(`SELECT key, label_key, accent_token, motif, seq FROM st_domain WHERE active = 1 ORDER BY seq`),
    q(`SELECT id, label_key, art_ref, seq FROM st_show ORDER BY seq`),
    q(`SELECT * FROM st_stage ORDER BY workflow_ref, seq`),
    q(`SELECT * FROM st_check ORDER BY workflow_ref, seq`),
    q(`SELECT * FROM st_view_section ORDER BY view_ref, seq`),
    q(`SELECT id, label_key FROM st_view`),
    q(`SELECT * FROM st_series ORDER BY seq`),
    q(`SELECT * FROM st_arc ORDER BY series_ref, seq`),
    q(`SELECT value FROM st_meta WHERE key = 'registry_version'`),
    q(`SELECT * FROM st_folder_layout ORDER BY id`),
  ]);
  return {
    version: (all<{ value: string }>(meta)[0]?.value) ?? '0',
    labels: Object.fromEntries(all<{ key: string; text: string }>(labels).map((l) => [l.key, l.text])),
    tokens: all(tokens), domains: all(domains), shows: all(shows), stages: all(stages), checks: all(checks),
    sections: all(sections), views: all(views), series: all(series), arcs: all(arcs), layouts: all(layouts),
  };
}

/// Every episode with its people, resources, checks, publications and takes (marker counts), or just one.
export async function loadEpisodes(db: D1Database, only?: string): Promise<EpisodeBundle[]> {
  const w = only ? ' WHERE episode_ref = ?' : '';
  const q = (sql: string) => (only ? db.prepare(sql).bind(only) : db.prepare(sql));
  const [eps, people, res, checks, pubs, takes] = await db.batch([
    q(`SELECT * FROM st_episode${only ? ' WHERE id = ?' : ''} ORDER BY series_ref, no`),
    q(`SELECT episode_ref, person_ref, role_key, seq FROM st_episode_person${w}`),
    q(`SELECT episode_ref, group_key, seq, ref, url, label_override, local_path FROM st_episode_resource${w}`),
    q(`SELECT episode_ref, check_key, result, note, evidence_ref, reported_at FROM st_episode_check${w}`),
    q(`SELECT * FROM st_publication${w}`),
    q(`SELECT t.id, t.episode_ref, t.take_no, t.mark_at, t.cut_at, t.status,
              (SELECT COUNT(*) FROM st_take_marker m WHERE m.take_ref = t.id) AS markers
         FROM st_take t${w.replace('episode_ref', 't.episode_ref')} ORDER BY t.take_no`),
  ]);
  const by = <T extends R>(rows: T[]) => { const m = new Map<string, T[]>(); for (const r of rows) { const k = r['episode_ref'] as string; m.set(k, [...(m.get(k) ?? []), r]); } return m; };
  const [P, Rs, C, Pu, T] = [by(all<R>(people)), by(all<R>(res)), by(all<R>(checks)), by(all<R>(pubs)), by(all<R>(takes))];
  return all<EpisodeRow>(eps).map((ep) => ({
    ep, people: (P.get(ep.id) ?? []) as never, resources: (Rs.get(ep.id) ?? []) as never, checks: (C.get(ep.id) ?? []) as never,
    publications: (Pu.get(ep.id) ?? []) as never, takes: (T.get(ep.id) ?? []) as never,
  }));
}

/// An old id (EP:ghafir:P02, a CM collection) → the episode id it became.
export async function resolveId(db: D1Database, id: string): Promise<string> {
  const row = await db.prepare(`SELECT new_id FROM st_id_alias WHERE old_id = ?`).bind(id).first<{ new_id: string }>();
  return row?.new_id ?? id;
}
