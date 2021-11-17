import { Schema } from 'mongoose';
import { ObjectId } from 'mongodb';

export const MediaLirarySchema = new Schema({
  performerId: {
    type: ObjectId,
    index: true
  },
  fileIds: [
  {
    type: ObjectId
  }
  ],
  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
