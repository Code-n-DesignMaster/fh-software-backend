import { ObjectId } from 'mongodb';
import { pick } from 'lodash';

export class CommentDto {
  objectId?: ObjectId;
  content?: string;
  createdBy?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  creator?: any;
  objectType?: string;

  constructor(data?: Partial<CommentDto>) {
    Object.assign(
      this,
      pick(data, [
        'objectId',
        'content',
        'createdBy',
        'createdAt',
        'updatedAt',
        'creator',
        'objectType'
      ])
    );
  }
}
