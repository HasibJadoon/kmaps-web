import type { Router } from '../../../shared/src/router';
import { badRequest, notFound } from '../../../shared/src/response';
import type { QuranEnv } from '../env';

/// The muṣḥaf's page fonts (KFGQPC QCF v2, one woff2 per page, 604 in all), kept in our own R2 so the
/// page view draws each page as printed without reaching a third party at read time. Copied once
/// from QUL (kmaps-resources scripts/quran/qcf2_fonts.sh); a page's font never changes, so it is
/// cached for a year.
export const QCF2_PREFIX = 'mushaf-fonts/qcf2/';

export function mushafFontRoutes(router: Router<QuranEnv>) {
  router.get('/qr/mushaf/fonts/:file', async (_req, env, { file }) => {
    const m = /^p(\d{1,3})\.woff2$/.exec(file);
    const page = m ? Number(m[1]) : 0;
    if (page < 1 || page > 604) return badRequest('font is p1.woff2 … p604.woff2');
    const object = await env.DEP_GRAPHS_BUCKET.get(`${QCF2_PREFIX}p${page}.woff2`);
    if (!object) return notFound(`font p${page}`);
    return new Response(object.body, {
      headers: {
        'Content-Type': 'font/woff2',
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: object.httpEtag,
      },
    });
  });
}
