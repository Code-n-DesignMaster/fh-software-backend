import { Document } from 'mongoose';
import { ObjectId } from 'mongodb';

export class MediaLirary extends Document {
  performerId: ObjectId;
  fileIds: ObjectId[];
  createdBy: ObjectId;
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
