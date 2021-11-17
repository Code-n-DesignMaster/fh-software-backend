export interface PerformerPageableAggregateData<T> {
  data: T[];
  total: number;
  totalactive?: number;
  totalinactive?: number;
  totalpending?: number;
  totaldeleted?: number;
  totalmale?: number;
  totalfemale?: number;
}
