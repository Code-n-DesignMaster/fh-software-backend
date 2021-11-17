import { ObjectId } from 'mongodb';
import { pick } from 'lodash';

export class ProductDto {
  _id?: ObjectId;
  performerId?: ObjectId;
  digitalFileId?: ObjectId;
  imageId?: ObjectId;
  image?: any;
  type?: string;
  name?: string;
  description?: string;
  status?: string;
  price?: number;
  stock?: number;
  performer?: any;
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(init?: Partial<ProductDto>) {
    Object.assign(
      this,
      pick(init, [
        '_id',
        'performerId',
        'digitalFileId',
        'imageId',
        'image',
        'type',
        'name',
        'description',
        'status',
        'price',
        'stock',
        'performer',
        'createdBy',
        'updatedBy',
        'createdAt',
        'updatedAt'
      ])
    );
  }

  toPublic() {
    return pick(this, [
      '_id',
      'performerId',
      'image',
      'type',
      'name',
      'description',
      'status',
      'price',
      'stock',
      'performer',
      'createdBy',
      'updatedBy',
      'createdAt',
      'updatedAt'
    ]);
  }
}
