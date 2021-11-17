import { Document } from 'mongoose';
import { ObjectId } from 'mongodb';

export class BlockedByPerformerModel extends Document {
  performerId: ObjectId;
  userId: ObjectId;
  blockBy: ObjectId;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}
