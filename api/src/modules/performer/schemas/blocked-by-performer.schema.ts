import { Schema } from 'mongoose';

export const BlockedByPerformerSchema = new Schema({
  performerId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  blockBy: {
    type: Schema.Types.ObjectId,
    index: true
  },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
