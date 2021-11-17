import { Schema } from 'mongoose';
import { ObjectId } from 'mongodb';

export const BannerSchema = new Schema({
  // original file
  fileId: ObjectId,
  title: {
    type: String
    // TODO - text index?
  },
  description: { type: String },
  processing: Boolean,
  status: {
    type: String,
    // draft, active, pending, file-error
    default: 'active'
  },
  position: { type: String, default: 'top' },
  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
