import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import { queryOne } from '../../../shared/src/db';
import type { WorldviewEnv } from '../env';
import { PeopleRepo } from '../repositories/people.repo';
import { dual } from './prefix';

export function peopleRoutes(router: Router<WorldviewEnv>) {

  const list = async (req: Request, env: WorldviewEnv) => {
    const url = new URL(req.url);
    return paginated(await new PeopleRepo(env.DB_WV).list({
      tradition_id: url.searchParams.get('tradition'),
      person_type:  url.searchParams.get('person_type'),
      visibility:   url.searchParams.get('visibility'),
      ...parsePagination(url),
    }));
  };

  const detail = async (_req: Request, env: WorldviewEnv, { id }: Record<string, string>) => {
    const repo = new PeopleRepo(env.DB_WV);
    const person = await repo.findById(id) ?? await repo.findBySlug(id);
    if (!person) return notFound(`person ${id}`);
    const [aliases, relations] = await Promise.all([
      repo.aliases(person.id),
      repo.relations(person.id),
    ]);

    const registry = person.person_ref
      ? await queryOne<Record<string, unknown>>(
          env.DB_WV, `SELECT * FROM core_person WHERE id = ?`, [person.person_ref])
      : null;
    return ok({ person, registry, aliases, relations });
  };

  dual(router, 'get', '/people', list);
  dual(router, 'get', '/people/:id', detail);

  router.get('/wv/thinkers', list);
  router.get('/wv/thinkers/:id', detail);

  dual(router, 'post', '/people', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.slug || !b.name) return badRequest('slug and name required');
    return created(await new PeopleRepo(env.DB_WV).create({
      slug: String(b.slug),
      name: String(b.name),
      name_ar:      (b.name_ar as string | null) ?? null,
      person_type:  b.person_type ? String(b.person_type) : undefined,
      tradition_id: (b.tradition_id as string | null) ?? null,
      era:          (b.era as string | null) ?? null,
      birth_year:   typeof b.birth_year === 'number' ? b.birth_year : null,
      death_year:   typeof b.death_year === 'number' ? b.death_year : null,
      bio_md:       (b.bio_md as string | null) ?? null,
    }));
  });
}
