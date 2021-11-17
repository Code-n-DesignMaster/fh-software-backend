import { Schema } from 'mongoose';
import { ObjectId } from 'mongodb';

export const GallerySchema = new Schema({
  performerId: ObjectId,
  type: {
    type: String,
    index: true
  },
  name: {
    type: String
    // TODO - text index?
  },
  description: String,
  status: {
    type: String,
    // draft, active
    default: 'active'
  },
  isSaleGallery: {
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
  numOfItems: {
    type: Number,
    default: 0
  },
  coverPhotoId: ObjectId,
  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
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
  thumbnailId: ObjectId
});
