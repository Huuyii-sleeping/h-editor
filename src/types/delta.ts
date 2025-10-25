export interface DeltaAttributes {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  header?: number;
  list?: "bullet" | "ordered";
}

export interface InsertOp {
  insert: string;
  arrributes?: DeltaAttributes;
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
