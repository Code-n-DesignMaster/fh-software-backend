import * as mongoose from 'mongoose';

export const CommentSchema = new mongoose.Schema({
  content: String,
  objectType: {
    type: String,
    default: 'video',
    index: true
  },
  objectId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  }, //video._id or model._id
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
