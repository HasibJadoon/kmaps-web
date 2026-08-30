import type { PaginateOptions } from '../../../shared/src/types';

export interface ReviewQueueItem {
  id: string;
  workspace_id: string;
  reviewer_ref: string | null;
  source_module: string;
  suggestion_ref: string;
  entity_type: string;

  title: string | null;
  status: 'pending' | 'in_review' | 'approved' | 'edited' | 'rejected' | 'deferred';
  priority: number;
  due_at: string | null;
  resolved_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewQueueCreate {
  workspace_id: string;
  reviewer_ref?: string;
  source_module: string;
  suggestion_ref: string;
  entity_type: string;
  title: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface ReviewQueueStatusUpdate {
  status: 'pending' | 'approved' | 'rejected' | 'deferred';
  note?: string;
}

export function validateReviewQueueCreate(
  body: unknown,
): { data: ReviewQueueCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.workspace_id !== 'string' || !b.workspace_id.trim())
    return { error: 'workspace_id is required' };
  if (typeof b.source_module !== 'string' || !b.source_module.trim())
    return { error: 'source_module is required' };
  if (typeof b.suggestion_ref !== 'string' || !b.suggestion_ref.trim())
    return { error: 'suggestion_ref is required' };
  if (typeof b.entity_type !== 'string' || !b.entity_type.trim())
    return { error: 'entity_type is required' };
  if (typeof b.title !== 'string' || !b.title.trim())
    return { error: 'title is required' };

  const validModules = ['WV', 'QR', 'AL', 'AR', 'CM', 'PL'] as const;
  const source_module = (b.source_module as string).toUpperCase();
  if (!validModules.includes(source_module as never))
    return { error: `source_module must be one of: ${validModules.join(', ')}` };

  const priorityOptions = ['low', 'normal', 'high'] as const;
  if (b.priority !== undefined && !priorityOptions.includes(b.priority as never))
    return { error: `priority must be one of: ${priorityOptions.join(', ')}` };

  const data: ReviewQueueCreate = {
    workspace_id: b.workspace_id.trim(),
    source_module,
    suggestion_ref: b.suggestion_ref.trim(),
    entity_type: b.entity_type.trim(),
    title: b.title.trim(),
  };

  if (typeof b.reviewer_ref === 'string') data.reviewer_ref = b.reviewer_ref;
  if (b.priority !== undefined) data.priority = b.priority as ReviewQueueCreate['priority'];

  return { data };
}

export function validateStatusUpdate(
  body: unknown,
): { data: ReviewQueueStatusUpdate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  const statuses = ['pending', 'approved', 'rejected', 'deferred'] as const;
  if (!statuses.includes(b.status as never))
    return { error: `status must be one of: ${statuses.join(', ')}` };

  const data: ReviewQueueStatusUpdate = {
    status: b.status as ReviewQueueStatusUpdate['status'],
  };

  if (typeof b.note === 'string') data.note = b.note;

  return { data };
}

export type ReviewStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'edited'
  | 'rejected'
  | 'deferred';

export interface ReviewQueueListOptions extends PaginateOptions {
  status?: ReviewStatus;
  sourceModule?: string;
  reviewerRef?: string;
  priority?: number;
}
