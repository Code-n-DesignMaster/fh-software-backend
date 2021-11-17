import * as mongoose from 'mongoose';

export const ReactSchema = new mongoose.Schema({
  action: {
    type: String,
    default: 'like',
    index: true
  },
  objectType: {
    type: String,
    default: 'video',
    index: true
  },
  objectId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});
