import { pick } from 'lodash';

export interface IPostAuthor {
  _id?: any;
  name?: string;
  avatar?: string;
  roles?: string[];
}

export class PostDto {
  _id: any;
  authorId?: any;
  author?: IPostAuthor;
  type = 'post';
  title?: string;
  slug?: string;
  ordering?: number;
  content?: string;
  shortDescription?: string;
  categoryIds?: string[] = [];
  status = 'draft';
  meta?: any[] = [];
  image: any;
  updatedBy: any;
  createdBy: any;
  createdAt: Date;
  updatedAt: Date;

  constructor(data?: Partial<PostDto>) {
    Object.assign(
      this,
      pick(data, [
        '_id',
        'authorId',
        'type',
        'title',
        'slug',
        'ordering',
        'content',
        'shortDescription',
        'categoryIds',
        'status',
        'meta',
        'image',
        'updatedBy',
        'createdBy',
        'createdAt',
        'updatedAt'
      ])
    );
  }

  public addAuthor(author: any) {
    this.author = {
      _id: author._id,
      name: author.name,
      avatar: author.avatar // TODO - parse avatar if needed
    };
  }
}
