import { ObjectId } from 'mongodb';
import { pick } from 'lodash';

export interface IMenuResponse {
  _id?: ObjectId;
  title?: string;
  path?: string;
  internal?: boolean;
  parentId?: string;
  help?: string;
  section?: string;
  public?: boolean;
  isPage?: boolean;
  ordering?: number;
  isNewTab?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
export class MenuDto {
  _id?: ObjectId;

  title?: string;

  path?: string;

  internal?: boolean;

  parentId?: string;

  help?: string;

  section?: string;

  public?: boolean;

  isPage?: boolean;

  ordering?: number;

  isNewTab?: boolean;

  createdAt?: Date;

  updatedAt?: Date;

  constructor(data?: Partial<MenuDto>) {
    Object.assign(
      this,
      pick(data, [
        '_id',
        'title',
        'path',
        'internal',
        'parentId',
        'help',
        'section',
        'public',
        'ordering',
        'isPage',
        'isNewTab',
        'createdAt',
        'updatedAt'
      ])
    );
  }
}
