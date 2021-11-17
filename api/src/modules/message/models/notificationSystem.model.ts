import { Document } from 'mongoose';
import { ObjectId } from 'mongodb';

export class NotificationSystemModel extends Document {
  totalNotReadMessage: number;
  recipientId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
