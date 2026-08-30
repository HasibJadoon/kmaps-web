export type LaneStatus = 'clean' | 'needs_review' | 'raw' | 'broken';

export interface LaneDisplayEntry {
  id: string;
  headingAr: string;
  pageLabel: string | null;
  pageNo: number | null;

  definitionRaw: string;
  definitionDisplay: string;
  definitionPreview: string;

  forms: string[];
  sourceRefs: string[];

  status: LaneStatus;
  statusLabelAr: string;
  warnings: string[];

  blockCount: number;
  rawLabel: string | null;

  cleanerJson: string | null;
  uiJson: string | null;
}
