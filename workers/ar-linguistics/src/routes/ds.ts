// ─── /al/ds — the display spec ───────────────────────────────────────────────
//
//   GET /al/ds/root/:root?form=desktop|mobile&scope=root
//
// What a root's layers ARE, shaped for reading. Three clients render this — the
// Angular app, the iOS app and the Studio overlays — and each used to decide
// the shape for itself, so the same decision was made three times and drifted.
//
// The spec is computed, never stored. Three attempts to store a display
// projection (`ar_ling_root_display`, `display_json` on thirteen tables, and
// `qr_morph_display_*`) each stalled at a handful of hand-authored rows, and a
// stored spec cannot say what the carriers hold *now* — which is the only thing
// it is for.
//
// It deliberately does NOT carry the four outputs. How built a layer is comes
// from the control plane in km_core, which this worker cannot read and should
// not: the spec says what a layer is and holds, the plane says how far along it
// is, and a client overlays the two.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';
import { DsRepo } from '../repositories/ds.repo';
import { RootDocRepo } from '../repositories/root-doc.repo';
import type { DsForm } from '../../../shared/src/contracts/ds';

const FORMS = new Set(['desktop', 'mobile']);
/** The scopes a subject can be read at. `context` is the word scope's own name
 *  in the build registry; both are accepted so a caller need not know that. */
const SCOPES = new Set(['root', 'lemma', 'word', 'context']);

export function dsRoutes(router: Router<ArLinguisticsEnv>) {
  // GET /al/ds/root/:root
  //
  // Every declared sub-layer of the scope comes back, including the ones
  // holding nothing — for a typical root that is most of them. A screen that
  // omitted them would imply the root has fewer layers than it does, and the
  // difference between "read and empty" and "nobody bound a carrier" is the
  // thing a build plan is actually looking for.
  router.get('/al/ds/root/:root', async (req, env, { root }) => {
    if (!root) return badRequest('root required');
    const url = new URL(req.url);

    const form = url.searchParams.get('form') ?? 'desktop';
    if (!FORMS.has(form)) {
      return badRequest(`form must be one of ${[...FORMS].join(', ')}`);
    }
    const scope = url.searchParams.get('scope') ?? 'root';
    if (!SCOPES.has(scope)) {
      return badRequest(`scope must be one of ${[...SCOPES].join(', ')}`);
    }

    const repo = new DsRepo(env.DB_AL);
    return ok(await repo.root(root, form as DsForm, scope === 'context' ? 'word' : scope));
  });

  // GET /al/root-doc/:root
  //
  // The same carriers as the spec above, shaped for a reader instead of a
  // builder: a form owns its government and the lemmas built from it, a sense
  // owns its witnesses and the path that reaches it. Band codes, carrier names
  // and fill states stay on `/al/ds`; nothing technical crosses into this one
  // except `gaps`, which is how the document declines to guess.
  router.get('/al/root-doc/:root', async (_req, env, { root }) => {
    if (!root) return badRequest('root required');
    const doc = await new RootDocRepo(env.DB_AL).doc(root);
    return doc ? ok(doc) : badRequest(`no root ${root}`);
  });
}
