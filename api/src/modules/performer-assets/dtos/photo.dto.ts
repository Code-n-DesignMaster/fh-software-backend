import { ObjectId } from 'mongodb';
import { pick } from 'lodash';

export class PhotoDto {
  _id?: ObjectId;
  performerId?: ObjectId;
  galleryId?: ObjectId;
  fileId?: ObjectId;
  photo?: any;
  type?: string;
  title?: string;
  description?: string;
  status?: string;
  processing?: boolean;
  price?: number;
  performer?: any;
  gallery?: any;
  isGalleryCover?: boolean;
  position?: number;
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(init?: Partial<PhotoDto>) {
    Object.assign(
      this,
      pick(init, [
        '_id',
        'performerId',
        'galleryId',
        'fileId',
        'photo',
        'type',
        'title',
        'description',
        'status',
        'processing',
        'price',
        'isGalleryCover',
        'position',
        'performer',
        'createdBy',
        'updatedBy',
        'createdAt',
        'updatedAt'
      ])
    );
  }
}
