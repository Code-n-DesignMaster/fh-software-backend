import { SearchRequest } from 'src/kernel/common';
import { ObjectId } from 'mongodb';

export class CommentSearchRequestPayload extends SearchRequest {
  objectId?: string | ObjectId;
  objectType?: string
}
