import { ObjectId } from 'mongodb';
import { VideoModel } from '../models';
import { pick } from 'lodash';

export class VideoDto {
  _id?: ObjectId;
  performerId?: ObjectId;
  fileId?: ObjectId;
  type?: string;
  title?: string;
  description?: string;
  status?: string;
  tags?: string[];
  processing?: boolean;
  thumbnailId?: ObjectId;
  isSaleVideo?: boolean;
  isPrivateChat?: boolean;
  price?: number;
  thumbnail?: string;
  video?: any;
  performer?: any;
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
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  participantIds?: string[];

  participants?: any[];
  includeAdmin?: boolean;
  isBought?: boolean;

  mux?: {
    assetId?: string,
    playbackId?: string,
    processing?: boolean
  };


  constructor(init?: Partial<VideoDto>) {
    Object.assign(
      this,
      pick(init, [
        '_id',
        'performerId',
        'fileId',
        'type',
        'title',
        'description',
        'status',
        'processing',
        'thumbnailId',
        'isSchedule',
        'isSaleVideo',
        'isPrivateChat',
        'price',
        'video',
        'thumbnail',
        'performer',
        'tags',
        'stats',
        'userReaction',
        'createdBy',
        'updatedBy',
        'scheduledAt',
        'createdAt',
        'updatedAt',
        'participantIds',
        'participants',
        'includeAdmin',
        'isBought',
        'mux'
      ])
    );
  }

  static fromModel(file: VideoModel) {
    return new VideoDto(file);
  }
}

export class IVideoResponse {
  _id?: ObjectId;
  performerId?: ObjectId;
  fileId?: ObjectId;
  type?: string;
  title?: string;
  description?: string;
  status?: string;
  tags?: string[];
  processing?: boolean;
  thumbnailId?: ObjectId;
  isSaleVideo?: boolean;
  price?: number;
  thumbnail?: string;
  video?: any;
  performer?: any;
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
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  participantIds?: string[];

  participants?: any[];

  tagline?: string;
  includeAdmin?: boolean;
  isFreeSubscribed?: boolean;
  
  mux?: {
    assetId?: string,
    playbackId?: string,
    processing?: boolean
  };

  constructor(init?: Partial<IVideoResponse>) {
    Object.assign(
      this,
      pick(init, [
        '_id',
        'performerId',
        'fileId',
        'type',
        'title',
        'description',
        'status',
        'processing',
        'thumbnailId',
        'isSchedule',
        'isSaleVideo',
        'price',
        'video',
        'thumbnail',
        'performer',
        'tags',
        'stats',
        'userReaction',
        'isBought',
        'isSubscribed',
        'subsribeSwitch',
        'createdBy',
        'updatedBy',
        'scheduledAt',
        'createdAt',
        'updatedAt',
        'participantIds',
        'participants',
        'tagline',
        'includeAdmin',
        'isFreeSubscribed',
        'mux'
      ])
    );
  }

  static fromModel(file: VideoModel) {
    return new VideoDto(file);
  }
}