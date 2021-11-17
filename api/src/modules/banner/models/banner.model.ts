import { Document } from 'mongoose';
import { ObjectId } from 'mongodb';

export class BannerModel extends Document {
  fileId: ObjectId;
  title: string;
  description: string;
  status: string;
  position: string;
  processing: boolean;
  createdBy: ObjectId;
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
