import { ObjectId } from 'mongodb';
import { pick } from 'lodash';

export class MessageDto {
  _id: ObjectId;
  conversationId: ObjectId;
  type: string;
  fileId: ObjectId;
  mediaId: ObjectId;
  text: string;
  senderId: ObjectId;
  meta: any;
  createdAt: Date;
  updatedAt: Date;
  imageUrl?: string;
  tipAmount?: number;
  senderInfo?: any;
  mimeType?: string;
  videoUrl?: string;
  isBought?: boolean;
  price?: number;
  isTipOption?: boolean;
  isSale?: boolean;


  constructor(data?: Partial<MessageDto>) {
    Object.assign(this, pick(data, [
      '_id', 'conversationId', 'type', 'fileId', 'mediaId', 'imageUrl', 'senderInfo',
      'text', 'senderId', 'meta', 'createdAt', 'updatedAt', 'tipAmount', 'mimeType', 'videoUrl', 'isBought', 'price', 'isTipOption', 'isSale'
    ]));
  }
}
