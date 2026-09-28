import type { Router } from '../../../shared/src/router';
import { created, badRequest, unauthorized, err } from '../../../shared/src/response';
import { queryOne, executeBatch } from '../../../shared/src/db';
import { actorRef } from '../../../shared/src/auth';
import type { WorldviewEnv } from '../env';
import { dual } from './prefix';

// Intake: how a reader files something new into Worldview — a person, a book,
// an article or a podcast episode — the same way the arc builders file theirs,
// so it lands where the Atlas already looks:
//
//   person   → wv_people 'wv-person-{slug}' + its core_person registry row 'PN:{slug}'
//              (person_ref); it appears among the Thinkers.
//   book / article / podcast
//            → wv_sources 'src-{kind}-{slug}' (source_type = kind), its author in
//              meta_json.author (and person_ref when the author is on file); it
//              appears in the Library.
//
// The reader's room (faiths, isms, …) is kept in meta_json.room for the Atlas.
// Ids are readable slugs; a taken slug gets -2, -3 … rather than overwriting.

const KINDS = ['person', 'book', 'article', 'podcast'] as const;
type Kind = typeof KINDS[number];

const str = (v: unknown, max = 2000) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isInteger(n) && Math.abs(n) < 5000 ? n : null;
};

/** "Ṭāhā Ḥusayn" → "taha-husayn": diacritics and ʿ ʾ folded away, ASCII only. */
export function slugify(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[ʿʾ'’`]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled';
}

async function freeId(db: D1Database, table: 'wv_people' | 'wv_sources', base: string): Promise<string> {
  for (let i = 1; i < 50; i++) {
    const id = i === 1 ? base : `${base}-${i}`;
    const slug = id.replace(/^(wv-person-|src-)/, '');
    const taken = await queryOne(db, `SELECT 1 AS x FROM ${table} WHERE id = ? OR slug = ?`, [id, slug])
      ?? (table === 'wv_people' ? await queryOne(db, `SELECT 1 AS x FROM core_person WHERE id = ?`, [`PN:${slug}`]) : null);
    if (!taken) return id;
  }
  return `${base}-${Date.now()}`;
}

function uid(): string {
  const b = new Uint8Array(13);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function intakeRoutes(router: Router<WorldviewEnv>) {
  dual(router, 'post', '/intake', async (req, env) => {
    const me = actorRef(req);
    if (!me) return unauthorized('Sign in to add to Worldview');
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!b) return badRequest('a JSON body is required');
    const kind = str(b.kind) as Kind | null;
    if (!kind || !KINDS.includes(kind)) return badRequest(`kind must be one of ${KINDS.join(', ')}`);
    const room = str(b.room, 60);
    const now = new Date().toISOString();

    if (kind === 'person') {
      const name = str(b.name, 200);
      if (!name) return badRequest('name required');
      const id = await freeId(env.DB_WV, 'wv_people', `wv-person-${slugify(name)}`);
      const slug = id.replace(/^wv-person-/, '');
      const born = int(b.birth_year), died = int(b.death_year);
      const era = born == null && died == null ? null
        : died == null && born! > 1900 ? 'contemporary'
        : `${Math.floor(((died ?? born!) - 1) / 100) + 1}th century`;
      const personType = str(b.person_type, 40) ?? 'scholar';
      const bio = str(b.bio_md, 4000);
      const nameAr = str(b.name_ar, 200);
      const nationality = str(b.nationality, 80);
      await executeBatch(env.DB_WV, [
        { sql: `INSERT INTO wv_people (id, slug, name, name_ar, person_type, era, birth_year, death_year, nationality, bio_md, meta_json, person_ref, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params: [id, slug, name, nameAr, personType, era, born, died, nationality, bio,
                   JSON.stringify({ added_by: me, added_via: 'intake', room }), `PN:${slug}`, now, now] },
        { sql: `INSERT INTO core_person (id, uid, person_key, name_en, name_ar, person_type, birth_year, death_year, era, nationality, bio_md, origin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'worldview') ON CONFLICT DO NOTHING`,
          params: [`PN:${slug}`, uid(), slug, name, nameAr, personType, born, died, era, nationality, bio] },
      ]);
      return created({ kind, id, slug, name, opens: 'thinkers' });
    }

    const title = str(b.title, 300);
    if (!title) return badRequest('title required');
    const id = await freeId(env.DB_WV, 'wv_sources', `src-${kind}-${slugify(title)}`);
    const author = str(b.author, 200);
    const authorId = str(b.author_person_id, 120);
    let personRef: string | null = null;
    if (authorId) {
      const p = await queryOne<{ person_ref: string | null }>(env.DB_WV, `SELECT person_ref FROM wv_people WHERE id = ?`, [authorId]);
      personRef = p?.person_ref ?? null;
    }
    const meta: Record<string, unknown> = { author, author_person_id: authorId, added_by: me, added_via: 'intake', room };
    if (kind === 'podcast') {
      meta.show = str(b.show, 200);
      meta.host = str(b.host, 200);
      meta.guest = str(b.guest, 200);
      meta.duration_min = int(b.duration_min);
    }
    if (kind === 'article') meta.journal = str(b.journal, 200);
    try {
      await executeBatch(env.DB_WV, [{
        sql: `INSERT INTO wv_sources (id, slug, title, title_ar, source_type, source_domain, tradition_id, language, published_year, publisher, url, description_md, meta_json, person_ref, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [id, id.replace(/^src-/, ''), title, str(b.title_ar, 300), kind, str(b.source_domain, 40) ?? 'general',
                 str(b.tradition_id, 80), str(b.language, 10) ?? 'en', int(b.published_year), str(b.publisher, 200),
                 str(b.url, 1000), str(b.description_md, 4000), JSON.stringify(meta), personRef, now, now],
      }]);
    } catch (e) {
      return err('intake_failed', `Could not file this ${kind}: ${(e as Error).message}`, 400);
    }
    return created({ kind, id, title, opens: 'library' });
  });
}
