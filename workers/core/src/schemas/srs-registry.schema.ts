import { isSchemaRecord } from '../../../shared/src/validate';

export interface SrsRegistryCard {
  id: string;
  user_ref: string;
  workspace_id: string | null;
  resource_ref: string;
  resource_type: 'vocabulary' | 'grammar' | 'root' | 'lemma' | 'ayah' | 'concept' | 'other';
  module: 'AR' | 'AL' | 'QR' | 'WV' | 'EN' | 'other';
  card_ref: string | null;
  enqueued_at: string;
  last_review_at: string | null;
  next_review_at: string | null;
  total_reviews: number;
}

export interface SrsCardInput {
  userRef: string;
  workspaceId?: string;
  resourceRef: string;
  resourceType: SrsRegistryCard['resource_type'];
  module: SrsRegistryCard['module'];
  cardRef?: string;
  nextReviewAt?: string;
}

type SchemaValidationResult<T> = { data: T } | { error: string };

export function validateSrsCardInput(body: unknown): SchemaValidationResult<SrsCardInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.userRef !== 'string' || !b.userRef.trim()) return { error: 'userRef is required and must be a non-empty string' };
  data.userRef = b.userRef.trim();
  if ('workspaceId' in b) {
    if (typeof b.workspaceId !== 'string') return { error: 'workspaceId must be a string' };
    data.workspaceId = b.workspaceId;
  }
  if (typeof b.resourceRef !== 'string' || !b.resourceRef.trim()) return { error: 'resourceRef is required and must be a non-empty string' };
  data.resourceRef = b.resourceRef.trim();
  if (typeof b.resourceType !== 'string' || !b.resourceType.trim()) return { error: 'resourceType is required and must be a non-empty string' };
  data.resourceType = b.resourceType.trim();
  if (typeof b.module !== 'string' || !b.module.trim()) return { error: 'module is required and must be a non-empty string' };
  data.module = b.module.trim();
  if ('cardRef' in b) {
    if (typeof b.cardRef !== 'string') return { error: 'cardRef must be a string' };
    data.cardRef = b.cardRef;
  }
  if ('nextReviewAt' in b) {
    if (typeof b.nextReviewAt !== 'string') return { error: 'nextReviewAt must be a string' };
    data.nextReviewAt = b.nextReviewAt;
  }

  return { data: data as unknown as SrsCardInput };
}
