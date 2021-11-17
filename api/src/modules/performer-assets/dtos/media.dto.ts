import { GalleryDto, VideoDto } from ".";
import { pick } from 'lodash';
import { ObjectId } from "mongodb";

export class MediaDto {
  _id?: ObjectId;
  fileId?: ObjectId;
  mediaUrl?: String;
  mimeType: String;
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(init?: Partial<MediaDto>) {

    console.log(init);
    

    Object.assign(
      this,
      pick(init, [
        '_id',
        'fileId',
        'mimeType',
        'mediaUrl',
        'createdBy',
        'updatedBy',
        'createdAt',
        'updatedAt'
      ])
    );
  }
}