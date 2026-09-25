export { actorRef } from '../../shared/src/auth';

/// The workspace the session landed in, forwarded by the gateway from the
/// token's `wid` claim. A default for newly created rows — never a
/// permission check; authorisation is by membership.
export function workspaceRef(req: Request): string | null {
  const id = req.headers.get('X-KM-Workspace-Id');
  return id && id.trim() ? id.trim() : null;
}
