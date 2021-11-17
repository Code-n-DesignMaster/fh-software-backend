import { Document } from 'mongoose';
import { ObjectId } from 'mongodb';

export class GalleryModel extends Document {
  performerId: ObjectId;
  galleryId: ObjectId;
  type: string;
  name: string;
  description: string;
  status: string;
  coverPhotoId: ObjectId;
  isSaleGallery: boolean;
  isPrivateChat: boolean;
  price: number;
  numOfItems: number;
  createdBy: ObjectId;
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  stats: {
    likes: number,
    favorite: number,
    views: number,
    comments: number
  };
}
