import type { Router, RouteHandler } from '../../../shared/src/router';
import type { WorldviewEnv } from '../env';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export function dual(
  router: Router<WorldviewEnv>,
  method: Method,
  path: string,
  handler: RouteHandler<WorldviewEnv>,
): void {
  router[method](`/wv${path}`, handler);
  router[method](`/worldview${path}`, handler);
}
