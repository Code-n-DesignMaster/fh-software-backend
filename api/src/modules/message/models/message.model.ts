import { Document } from 'mongoose';
import { ObjectId } from 'mongodb';

export class MessageModel extends Document {
  conversationId: ObjectId;
  type: string;
  fileId?: ObjectId;
  mediaId?: ObjectId;
  videoFileId?: ObjectId;
  text: string;
  senderSource: string;
  senderId: ObjectId;
  meta?: any;
  tipAmount?: number;
  isTipOption?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  mimeType: string;
}
