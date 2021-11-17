import { ObjectId } from 'mongodb';
import { getConfig } from 'src/kernel';
import { resolve } from 'url';
import { isUrl } from 'src/kernel/helpers/string.helper';
import { FileModel } from '../models';

export class FileDto {
  _id?: ObjectId;
  type?: string; // video, podcast, file, etc...
  name?: string;
  description?: string;
  mimeType?: string;
  server?: string; // eg: local, aws, etc... we can create a helper to filter and get direct link
  path?: string; // path of key in local or server
  absolutePath?: string;
  width?: number; // for video, img
  height?: number; // for video, img
  duration?: number; // for video, podcast
  size?: number; // in byte
  status?: string;
  encoding?: string;
  thumbnails?: Record<string, any>[];
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  refItems?: any;

  constructor(init?: Partial<FileDto>) {
    if (init) {
      this._id = init._id;
      this.type = init.type;
      this.name = init.name;
      this.description = init.description;
      this.mimeType = init.mimeType;
      this.server = init.server;
      this.path = init.path;
      this.width = init.width;
      this.height = init.height;
      this.duration = init.duration;
      this.size = init.size;
      this.encoding = init.encoding;
      this.path = init.path;
      this.absolutePath = init.absolutePath;
      this.thumbnails = init.thumbnails;
      this.status = init.status;
      this.createdBy = init.createdBy;
      this.updatedBy = init.updatedBy;
      this.createdAt = init.createdAt;
      this.updatedAt = init.updatedAt;
      this.refItems = init.refItems;
    }
  }

  static fromModel(file: FileModel) {
    return new FileDto(file);
  }

  public getPublicPath() {
    if (this.absolutePath) {
      return this.absolutePath.replace(getConfig('file').publicDir, '');
    }

    return this.path || '';
  }

  public getUrl(): string {
    if (!this.path) return '';
    if (isUrl(this.path)) return this.path;

    return resolve(getConfig('app').baseUrl, this.path);
  }

  public getThumbnails(): string[] {
    if (!this.thumbnails || !this.thumbnails.length) {
      return [];
    }

    return this.thumbnails.map((t) => {
      if (isUrl(t.path)) return t.path;

      return resolve(getConfig('app').baseUrl, t.path);
    });
  }

  static getPublicUrl(filePath: string): string {
    if (!filePath) return '';
    if (isUrl(filePath)) return filePath;
    return resolve(getConfig('app').baseUrl, filePath);
  }

  public isVideo() {
    return (this.mimeType || '').toLowerCase().includes('video');
  }

  public isImage() {
    return (this.mimeType || '').toLowerCase().includes('image');
  }
}
