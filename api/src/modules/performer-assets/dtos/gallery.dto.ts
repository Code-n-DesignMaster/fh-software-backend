import { ObjectId } from 'mongodb';
import { GalleryModel } from '../models';
import { pick } from 'lodash';

export class GalleryDto {
  _id?: ObjectId;
  performerId?: ObjectId;
  type?: string;
  name?: string;
  description?: string;
  status?: string;
  processing?: boolean;
  coverPhotoId?: ObjectId;
  isSaleGallery?: boolean;
  isPrivateChat?: boolean;
  price?: number;
  coverPhoto?: Record<string, any>;
  performer?: any;
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  stats?: {
    views: number;
    likes: number;
    comments: number;
  };
  userReaction?: {
    liked?: boolean;
    favourited?: boolean;
    watchedLater?: boolean;
  };
  isBought?: boolean;
  isSubscribed?: boolean;
  includeAdmin?: boolean;
  numOfItems?: number;

  constructor(init?: Partial<GalleryDto>) {
    Object.assign(
      this,
      pick(init, [
        '_id',
        'performerId',
        'type',
        'name',
        'description',
        'status',
        'coverPhotoId',
        'isSaleGallery',
        'isPrivateChat',
        'price',
        'coverPhoto',
        'performer',
        'createdBy',
        'updatedBy',
        'createdAt',
        'updatedAt',
        'stats',
        'userReaction',
        'isBought',
        'isSubscribed',
        'includeAdmin',
        'numOfItems'
      ])
    );
  }


  static fromModel(model: GalleryModel) {
    return new GalleryDto(model);
  }
}

//
export class IGalleryResponse {
  _id?: ObjectId;
  performerId?: ObjectId;
  type?: string;
  name?: string;
  description?: string;
  status?: string;
  processing?: boolean;
  coverPhotoId?: ObjectId;
  isSaleGallery?: boolean;
  price?: number;
  coverPhoto?: Record<string, any>;
  performer?: any;
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  stats?: {
    views: number;
    likes: number;
    comments: number;
  };
  userReaction?: {
    liked?: boolean;
    favourited?: boolean;
    watchedLater?: boolean;
  };
  isBought?: boolean;
  isSubscribed?: boolean;
  subsribeSwitch?: boolean;
  freeSubsribeSwitch?: boolean;
  includeAdmin?: boolean;
  isFreeSubscribed?: boolean;
  numOfItems?: number;

  constructor(init?: Partial<IGalleryResponse>) {
    Object.assign(
      this,
      pick(init, [
        '_id',
        'performerId',
        'type',
        'name',
        'description',
        'status',
        'coverPhotoId',
        'isSaleGallery',
        'price',
        'coverPhoto',
        'performer',
        'createdBy',
        'updatedBy',
        'createdAt',
        'updatedAt',
        'stats',
        'userReaction',
        'isBought',
        'isSubscribed',
        'subsribeSwitch',
        'freeSubsribeSwitch',
        'includeAdmin',
        'isFreeSubscribed',
        'numOfItems'
      ])
    );
  }

  static fromModel(file: GalleryModel) {
    return new GalleryDto(file);
  }
}


