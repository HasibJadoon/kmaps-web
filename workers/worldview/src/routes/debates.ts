import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { WorldviewEnv } from '../env';
import { dual } from './prefix';

// Questions & claims, and the traditions, as the Atlas opens them.
//
// A topic is filed under the book it came from: its own source_id (migration
// 010) when it has one; failing that, what points there — its questions and
// claims name a source in meta_json, and its claims cite evidence
// (wv_evidence_items.source_id) through wv_claim_evidence_links, and the source
// cited most wins. A topic nothing points from is filed under "Other". A claim with no topic is kept with the source
// its meta_json names, as a loose claim of that book.

interface TopicRow { id: string; title: string; title_ar: string | null; topic_domain: string | null;
  tradition_id: string | null; description_md: string | null; source_id: string | null }
interface ClaimRow { id: string; title: string; claim_text: string | null; claim_type: string | null;
  certainty_level: string | null; topic_id: string | null; tradition_id: string | null; meta_source: string | null }
interface QuestionRow { id: string; question_text: string; question_type: string | null; topic_id: string | null;
  meta_source: string | null }
interface EvidenceRow { claim_id: string; link_role: string | null; title: string | null; locator: string | null;
  excerpt: string | null; source_id: string | null }
interface SourceRow { id: string; title: string; source_type: string }
interface TraditionRow { id: string; slug: string; title: string; title_ar: string | null; tradition_type: string | null;
  parent_id: string | null; founded_period: string | null; geographic_origin: string | null;
  core_beliefs: string | null; description_md: string | null }

export function debateRoutes(router: Router<WorldviewEnv>) {
  dual(router, 'get', '/debates', async (_req, env) => {
    const db = env.DB_WV;
    const [topics, claims, questions, evidence, sources, traditions, comparisons] = await Promise.all([
      query<TopicRow>(db, `SELECT id, title, title_ar, topic_domain, tradition_id, description_md, source_id FROM wv_topics ORDER BY title`),
      query<ClaimRow>(db, `SELECT id, title, claim_text, claim_type, certainty_level, topic_id, tradition_id,
                                  json_extract(meta_json, '$.source_id') AS meta_source
                             FROM wv_claims ORDER BY created_at, id`),
      query<QuestionRow>(db, `SELECT id, question_text, question_type, topic_id,
                                     json_extract(meta_json, '$.source_id') AS meta_source
                                FROM wv_questions ORDER BY created_at, id`),
      query<EvidenceRow>(db, `SELECT l.claim_id, l.link_role, e.title, e.locator, e.excerpt, e.source_id
                                FROM wv_claim_evidence_links l JOIN wv_evidence_items e ON e.id = l.evidence_id`),
      query<SourceRow>(db, `SELECT id, title, source_type FROM wv_sources`),
      query<{ id: string; title: string }>(db, `SELECT id, title FROM wv_traditions`),
      query<{ id: string; title: string; comparison_type: string | null; description_md: string | null }>(db,
        `SELECT id, title, comparison_type, description_md FROM wv_comparisons ORDER BY title`),
    ]);
    const src = new Map(sources.map((s) => [s.id, s]));
    const trad = new Map(traditions.map((t) => [t.id, t]));
    const evBy = new Map<string, EvidenceRow[]>();
    for (const e of evidence) evBy.set(e.claim_id, [...(evBy.get(e.claim_id) ?? []), e]);

    const shapeClaim = (c: ClaimRow) => ({
      id: c.id, title: c.title, text: c.claim_text, type: c.claim_type, certainty: c.certainty_level,
      tradition: c.tradition_id && trad.has(c.tradition_id) ? { id: c.tradition_id, title: trad.get(c.tradition_id)!.title } : null,
      evidence: (evBy.get(c.id) ?? []).map((e) => ({
        title: e.title, role: e.link_role, locator: e.locator, excerpt: e.excerpt,
        source: e.source_id && src.has(e.source_id) ? { id: e.source_id, title: src.get(e.source_id)!.title } : null,
      })),
    });

    // which book each topic belongs to: the source pointed at most often
    const votes = new Map<string, Map<string, number>>();
    const vote = (topic: string | null, source: string | null | undefined) => {
      if (!topic || !source || !src.has(source)) return;
      const m = votes.get(topic) ?? new Map<string, number>();
      m.set(source, (m.get(source) ?? 0) + 1);
      votes.set(topic, m);
    };
    for (const q of questions) vote(q.topic_id, q.meta_source);
    for (const c of claims) {
      vote(c.topic_id, c.meta_source);
      for (const e of evBy.get(c.id) ?? []) vote(c.topic_id, e.source_id);
    }
    const home = (topic: string) => {
      const m = votes.get(topic);
      if (!m) return null;
      return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
    };

    const groups = new Map<string, { source: { id: string; title: string; type: string } | null;
      topics: unknown[]; claims: unknown[]; questions: unknown[] }>();
    const group = (sourceId: string | null) => {
      const key = sourceId ?? '';
      if (!groups.has(key)) {
        const s = sourceId ? src.get(sourceId) : undefined;
        groups.set(key, { source: s ? { id: s.id, title: s.title, type: s.source_type } : null, topics: [], claims: [], questions: [] });
      }
      return groups.get(key)!;
    };
    for (const t of topics) {
      group(t.source_id && src.has(t.source_id) ? t.source_id : home(t.id)).topics.push({
        id: t.id, title: t.title, title_ar: t.title_ar, domain: t.topic_domain, description: t.description_md,
        tradition: t.tradition_id && trad.has(t.tradition_id) ? { id: t.tradition_id, title: trad.get(t.tradition_id)!.title } : null,
        claims: claims.filter((c) => c.topic_id === t.id).map(shapeClaim),
        questions: questions.filter((q) => q.topic_id === t.id)
          .map((q) => ({ id: q.id, text: q.question_text, type: q.question_type })),
      });
    }
    // claims and questions on no topic stay with their book, apart from its topics
    const bookOf = (id: string | null) => (id && src.has(id) ? id : null);
    for (const c of claims.filter((c) => !c.topic_id)) group(bookOf(c.meta_source)).claims.push(shapeClaim(c));
    for (const q of questions.filter((q) => !q.topic_id)) {
      group(bookOf(q.meta_source)).questions.push({ id: q.id, text: q.question_text, type: q.question_type });
    }

    // books first, "Other" last
    const out = [...groups.values()].sort((a, b) =>
      (a.source ? 0 : 1) - (b.source ? 0 : 1) || (a.source?.title ?? '').localeCompare(b.source?.title ?? ''));
    return ok({
      groups: out,
      comparisons: comparisons.map((c) => ({ id: c.id, title: c.title, type: c.comparison_type, description: c.description_md })),
      counts: { topics: topics.length, claims: claims.length, questions: questions.length, comparisons: comparisons.length },
    });
  });

  // The traditions, each with what is on file for it: its books, its topics, its claims.
  dual(router, 'get', '/tradition-shelf', async (_req, env) => {
    const db = env.DB_WV;
    const [traditions, sources, topics, claims] = await Promise.all([
      query<TraditionRow>(db, `SELECT id, slug, title, title_ar, tradition_type, parent_id, founded_period, geographic_origin,
                                      core_beliefs, description_md FROM wv_traditions ORDER BY title`),
      query<{ id: string; title: string; source_type: string; tradition_id: string }>(db,
        `SELECT id, title, source_type, tradition_id FROM wv_sources WHERE tradition_id IS NOT NULL ORDER BY title`),
      query<{ id: string; title: string; tradition_id: string }>(db,
        `SELECT id, title, tradition_id FROM wv_topics WHERE tradition_id IS NOT NULL ORDER BY title`),
      query<{ id: string; title: string; tradition_id: string; claim_type: string | null }>(db,
        `SELECT id, title, tradition_id, claim_type FROM wv_claims WHERE tradition_id IS NOT NULL ORDER BY title`),
    ]);
    const order = ['religion', 'mysticism', 'philosophy', 'era', 'movement', 'ideology', 'discipline'];
    const rank = (t: string | null) => { const i = order.indexOf(t ?? ''); return i < 0 ? order.length : i; };
    return ok({
      traditions: traditions
        .sort((a, b) => rank(a.tradition_type) - rank(b.tradition_type) || a.title.localeCompare(b.title))
        .map((t) => ({
          id: t.id, slug: t.slug, title: t.title, title_ar: t.title_ar, type: t.tradition_type ?? 'other',
          parent: t.parent_id ? (traditions.find((p) => p.id === t.parent_id)?.title ?? null) : null,
          period: t.founded_period, origin: t.geographic_origin, beliefs: t.core_beliefs, description: t.description_md,
          sources: sources.filter((s) => s.tradition_id === t.id).map((s) => ({ id: s.id, title: s.title, type: s.source_type })),
          topics: topics.filter((x) => x.tradition_id === t.id).map((x) => ({ id: x.id, title: x.title })),
          claims: claims.filter((x) => x.tradition_id === t.id).map((x) => ({ id: x.id, title: x.title, type: x.claim_type })),
        })),
    });
  });
}
