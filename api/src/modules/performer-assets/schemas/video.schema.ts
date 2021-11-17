import { Schema } from 'mongoose';
import { ObjectId } from 'mongodb';

export const VideoSchema = new Schema({
  performerId: {
    type: ObjectId,
    index: true
  },
  participantIds: [
    { index: true, type: String }
  ],
  fileId: ObjectId,
  type: {
    type: String,
    index: true
  },
  title: {
    type: String
    // TODO - text index?
  },
  description: String,
  status: {
    type: String,
    default: 'active'
  },
  tags: [
    { type: String, index: true }
  ],
  isSchedule: {
    type: Boolean,
    default: false
  },
  isSaleVideo: {
    type: Boolean,
    default: false
  },
  isPrivateChat: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    default: 0
  },
  processing: Boolean,
  thumbnailId: ObjectId,
  performerUsername: {
    type: String,
    index: true
  },
  stats: {
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    }
  },
  mux: {
    assetId: {
      type: String,
      default: ''
    },
    playbackId: {
      type: String,
      default: ''
    },
    processing: {
      type: Boolean,
      default: false
    },
  },
  createdBy: ObjectId,
  updatedBy: ObjectId,
  scheduledAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
