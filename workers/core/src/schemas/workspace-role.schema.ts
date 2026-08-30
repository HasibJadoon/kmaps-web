export interface WorkspaceRole {
  id: string;
  workspace_id: string;
  role_key: string;
  title: string;
  permissions_json: string | null;
  is_system_role: boolean;
  created_at: string;
}

export interface WorkspaceRoleCreate {
  workspace_id: string;
  role_key: string;
  title: string;
  permissions_json?: string;
}

export interface WorkspaceMemberRole {
  id: string;
  member_id: string;
  role_id: string;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
}

export interface MemberRoleAssign {
  member_id: string;
  role_id: string;
  granted_by: string;
  expires_at?: string;
}

export function validateWorkspaceRoleCreate(
  body: unknown,
): { data: WorkspaceRoleCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.workspace_id !== 'string' || !b.workspace_id.trim())
    return { error: 'workspace_id is required' };
  if (typeof b.role_key !== 'string' || !b.role_key.trim())
    return { error: 'role_key is required' };
  if (typeof b.title !== 'string' || !b.title.trim())
    return { error: 'title is required' };

  const data: WorkspaceRoleCreate = {
    workspace_id: b.workspace_id.trim(),
    role_key: b.role_key.trim(),
    title: b.title.trim(),
  };

  if (typeof b.permissions_json === 'string') data.permissions_json = b.permissions_json;

  return { data };
}

export function validateMemberRoleAssign(
  body: unknown,
): { data: MemberRoleAssign } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.member_id !== 'string' || !b.member_id.trim())
    return { error: 'member_id is required' };
  if (typeof b.role_id !== 'string' || !b.role_id.trim())
    return { error: 'role_id is required' };
  if (typeof b.granted_by !== 'string' || !b.granted_by.trim())
    return { error: 'granted_by is required' };

  const data: MemberRoleAssign = {
    member_id: b.member_id.trim(),
    role_id: b.role_id.trim(),
    granted_by: b.granted_by.trim(),
  };

  if (typeof b.expires_at === 'string') data.expires_at = b.expires_at;

  return { data };
}
