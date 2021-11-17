import { ObjectId } from 'mongodb';
import { pick } from 'lodash';

export interface ICouponResponse {
  _id?: ObjectId;
  name?: string;
  description?: string;
  code?: string;
  value?: number;
  numberOfUses?: number;
  expiredDate?: string | Date;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
export class CouponDto {
  _id?: ObjectId;
  name?: string;
  description?: string;
  code?: string;
  value?: number;
  numberOfUses?: number;
  expiredDate?: string | Date;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(data?: Partial<CouponDto>) {
    Object.assign(
      this,
      pick(data, [
        '_id',
        'name',
        'description',
        'code',
        'value',
        'expiredDate',
        'status',
        'numberOfUses',
        'createdAt',
        'updatedAt'
      ])
    );
  }

  toResponse(includePrivateInfo = false) {
    const publicInfo = {
      _id: this._id,
      code: this.code,
      value: this.value
    };
    const privateInfo = {
      name: this.name,
      expiredDate: this.expiredDate,
      status: this.status,
      numberOfUses: this.numberOfUses,
      updatedAt: this.updatedAt,
      createdAt: this.createdAt
    };
    if (!includePrivateInfo) {
      return publicInfo;
    }
    return {
      ...publicInfo,
      ...privateInfo
    };
  }
}
