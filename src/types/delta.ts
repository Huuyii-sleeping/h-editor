export interface DeltaAttributes {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  header?: 1 | 2;
  strike?: boolean;
  list?: "bullet" | "ordered";
  color?: string;
  background?: string;
  link?: string;
  indent?: number;
}

export interface InsertOp {
  insert: string;
  attributes?: DeltaAttributes;
}

export interface DeleteOp {
  delete: number;
}

export interface RetainOp {
  retain: number;
  attribute?: DeltaAttributes;
}

export type DeltaOperation = InsertOp | DeleteOp | RetainOp;
export type Delta = DeltaOperation[];
