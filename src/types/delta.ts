export interface DeltaAttributes {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  header?: 1 | 2;
  list?: "bullet" | "ordered";
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
