import type { BackendEnv } from './env';
import { MODULE_MAP, type ModuleKey } from './modules';
import { preflight, withCors, corsHeaders } from './cors';
import { authenticate, verifyJwt } from '../../shared/src/auth';
import { unauthorized, err, internalError } from '../../shared/src/response';
import { json } from '../../shared/src/http';

export default {
  async fetch(request: Request, env: BackendEnv): Promise<Response> {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '';
    const co     = env.ALLOWED_ORIGINS ?? '';

    const pre = preflight(request, co);
    if (pre) return pre;

    if (url.pathname === '/' || url.pathname === '/health') {
      return withCors(
        json({ ok: true, service: 'km-backend', version: '1' }),
        origin, co,
      );
    }

    if (!url.pathname.startsWith('/api/')) {
      return withCors(err('not_found', 'Not found', 404), origin, co);
    }

    const sourcesMatch = request.method === 'GET' &&
      url.pathname.match(/^\/api\/quran\/(\d+)\/(\d+)\/sources$/);

    if (sourcesMatch) {
      const surah = sourcesMatch[1];
      const ayah  = sourcesMatch[2];
      const kinds = url.searchParams.get('kinds') ?? '';

      const internalHeaders = new Headers({
        'X-KM-Internal':        '1',
        'X-KM-Internal-Secret': env.INTERNAL_SECRET ?? '',
      });

      const alReq = new Request(
        `http://internal.k-maps.local/al/source-rag/bundle?surah=${surah}&ayah=${ayah}${kinds ? `&kinds=${encodeURIComponent(kinds)}` : ''}`,
        { headers: internalHeaders },
      );
      const qrTafsirReq = new Request(
        `http://internal.k-maps.local/qr/tafsir?surah=${surah}&ayah=${ayah}&per_page=50`,
        { headers: internalHeaders },
      );
      const qrTransReq = new Request(
        `http://internal.k-maps.local/qr/translations?surah=${surah}&ayah=${ayah}`,
        { headers: internalHeaders },
      );

      try {
        const [alRes, tafsirRes, transRes] = await Promise.all([
          (env.AR_LINGUISTICS as Fetcher).fetch(alReq),
          (env.QURAN as Fetcher).fetch(qrTafsirReq),
          (env.QURAN as Fetcher).fetch(qrTransReq),
        ]);

        type AlBundle  = { data?: { al_chunks?: unknown[]; al_chunks_count?: number } };
        type TafsirRes = { data?: { rows?: unknown[]; total?: number } };
        type TransRes  = { data?: unknown[] };

        const [alData, tafsirData, transData] = await Promise.all([
          alRes.json<AlBundle>(),
          tafsirRes.json<TafsirRes>(),
          transRes.json<TransRes>(),
        ]);

        return withCors(
          json({
            ok: true,
            data: {
              surah:        parseInt(surah),
              ayah:         parseInt(ayah),

              al_chunks:    alData?.data?.al_chunks  ?? [],

              tafsir:       tafsirData?.data?.rows   ?? [],

              translations: transData?.data          ?? [],
            },
          }),
          origin, co,
        );
      } catch (e) {
        console.error('[backend] /sources composite error:', e);
        return withCors(
          json(
            { ok: false, error: { code: 'service_error', message: 'Failed to build source bundle' } },
            { status: 502 },
          ),
          origin, co,
        );
      }
    }

    const passageMatch = request.method === 'GET' &&
      url.pathname.match(/^\/api\/cyb\/passage\/(\d+)\/(\d+)$/);

    if (passageMatch) {
      const surah = parseInt(passageMatch[1]);
      const no = parseInt(passageMatch[2]);
      const internalHeaders = new Headers({
        'X-KM-Internal': '1',
        'X-KM-Internal-Secret': env.INTERNAL_SECRET ?? '',
      });
      const get = (fetcher: Fetcher, path: string) =>
        fetcher.fetch(new Request(`http://internal.k-maps.local${path}`,
                                  { headers: internalHeaders }));
      try {
        const [gridRes, processRes] = await Promise.all([
          get(env.QURAN as Fetcher, `/qr/study/surahs/${surah}`),
          get(env.CORE as Fetcher, `/core/cyb/process?domain=quran`),
        ]);
        type Grid = { data?: { units?: Array<Record<string, unknown>> } };
        const grid = await gridRes.json<Grid>().catch(() => null);
        const unit = grid?.data?.units?.find(u => u['passage_no'] === no) ?? null;
        if (!unit) {
          return withCors(err('not_found', `no passage ${surah}:${no}`, 404), origin, co);
        }
        const nodeId = `CYB:quran:${surah}:${unit['ayah_from']}-${unit['ayah_to']}`;
        const readingRes = await get(env.CORE as Fetcher,
          `/core/cyb/reading/${encodeURIComponent(nodeId)}`);
        type Readings = { data?: { readings?: unknown[] } };
        const readings = await readingRes.json<Readings>().catch(() => null);
        const processBody = await processRes.json<{ data?: unknown }>().catch(() => null);

        const res = json({
          ok: true,
          data: {
            surah, passage_no: no,
            passage_id: unit['passage_id'] ?? null,
            node_id: nodeId,
            ayah_from: unit['ayah_from'], ayah_to: unit['ayah_to'],
            label: unit['label'] ?? null,

            readings: readings?.data?.readings ?? null,
            unit,
            process: processBody?.data ?? null,
          },
        });
        res.headers.set('Cache-Control', 'no-store');
        return withCors(res, origin, co);
      } catch (e) {
        console.error('[backend] /cyb/passage composite error:', e);
        return withCors(json({ ok: false, error: { code: 'service_error',
          message: 'Failed to build passage payload' } }, { status: 502 }), origin, co);
      }
    }

    const remainder  = url.pathname.slice(5);

    if (remainder.includes('/internal/')) {
      return withCors(err('not_found', 'Not found', 404), origin, co);
    }
    const moduleKey  = remainder.split('/')[0] as ModuleKey;
    const mod        = MODULE_MAP[moduleKey];

    if (!mod) {
      return withCors(
        err('not_found', `Unknown module: ${moduleKey}`, 404),
        origin, co,
      );
    }

    const isWebSocket = request.headers.get('Upgrade')?.toLowerCase() === 'websocket';
    const isAuthEndpoint = remainder.startsWith('core/auth/');
    const isPublic = isAuthEndpoint || (mod.publicGet && request.method === 'GET');
    let authCtx = await authenticate(request, env.JWT_SECRET ?? '');

    if (!authCtx && isWebSocket) {
      const wsToken = url.searchParams.get('token');
      if (wsToken) {
        const payload = await verifyJwt(wsToken, env.JWT_SECRET ?? '');
        if (payload) {
          authCtx = {
            userId: payload.sub,
            workspaceId: payload.wid,
            role: payload.role,
            isAdmin: payload.role === 'admin',
          };
        }
      }
    }

    if (!isPublic && !authCtx) {
      return withCors(unauthorized('Valid Bearer token required'), origin, co);
    }

    const fwdUrl      = new URL(request.url);
    fwdUrl.hostname   = 'internal.k-maps.local';
    fwdUrl.pathname   = '/' + remainder;
    fwdUrl.searchParams.delete('token');

    const fwdHeaders = new Headers(request.headers);

    fwdHeaders.set('X-KM-Internal',        '1');
    fwdHeaders.set('X-KM-Internal-Secret', env.INTERNAL_SECRET ?? '');

    if (authCtx) {
      fwdHeaders.set('X-KM-User-Id', authCtx.userId);
      if (authCtx.workspaceId) fwdHeaders.set('X-KM-Workspace-Id', authCtx.workspaceId);
      if (authCtx.role)        fwdHeaders.set('X-KM-Role', authCtx.role);
    }

    const hasBody = !['GET', 'HEAD'].includes(request.method);
    const fwdRequest = new Request(fwdUrl.toString(), {
      method:  request.method,
      headers: fwdHeaders,
      body:    hasBody ? request.body : undefined,

      ...(hasBody ? { duplex: 'half' } as RequestInit : {}),
    });

    try {
      const fetcher  = env[mod.binding] as Fetcher;
      const internal = await fetcher.fetch(fwdRequest);

      if (isWebSocket || internal.status === 101) return internal;

      const isReading = remainder.startsWith('core/cyb/')
        || remainder.startsWith('core/study/')
        || remainder.startsWith('al/staging/');
      if (isReading) {
        const fresh = new Response(internal.body, internal);
        fresh.headers.set('Cache-Control', 'no-store');
        return withCors(fresh, origin, co);
      }
      return withCors(internal, origin, co);
    } catch (e) {
      console.error(`[backend] ${mod.binding} error:`, e);
      return withCors(
        json(
          { ok: false, error: { code: 'service_error', message: 'Internal service unavailable' } },
          { status: 502 },
        ),
        origin, co,
      );
    }
  },
} satisfies ExportedHandler<BackendEnv>;
