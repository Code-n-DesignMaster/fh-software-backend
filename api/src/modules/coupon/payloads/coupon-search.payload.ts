import { SearchRequest } from 'src/kernel/common';

export class CouponSearchRequestPayload extends SearchRequest {
  name?: string;
  code?: string;
  status?: string;
}
