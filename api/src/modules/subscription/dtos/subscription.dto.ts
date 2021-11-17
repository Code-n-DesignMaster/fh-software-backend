import { ObjectId } from 'mongodb';
import { pick } from 'lodash';
import { UserDto } from 'src/modules/user/dtos';
import { PerformerDto } from 'src/modules/performer/dtos';

export interface ISubscriptionResponse {
  _id?: string | ObjectId;
  subscriptionType?: string;
  userId?: string | ObjectId;
  performerId?: string | ObjectId;
  subscriptionId?: string;
  transactionId?: string | ObjectId;
  paymentGateway?: string;
  status?: string;
  meta?: any;
  startRecurringDate?: Date;
  nextRecurringDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  expiredAt?: Date;
  userInfo?: UserDto;
  performerInfo?: PerformerDto;
  blockedUser?: boolean;
}

export class SubscriptionDto {
  _id?: string | ObjectId;

  subscriptionType?: string;

  userId?: string | ObjectId;

  performerId?: string | ObjectId;

  subscriptionId?: string;

  transactionId?: string | ObjectId;

  paymentGateway?: string;

  status?: string;

  meta?: any;

  startRecurringDate?: Date;

  nextRecurringDate?: Date;

  createdAt?: Date;

  updatedAt?: Date;

  expiredAt?: Date;

  userInfo?: UserDto;

  performerInfo?: PerformerDto;

  blockedUser?: boolean;

  constructor(data?: Partial<SubscriptionDto>) {
    Object.assign(
      this,
      pick(data, [
        '_id',
        'subscriptionType',
        'userInfo',
        'userId',
        'performerId',
        'performerInfo',
        'subscriptionId',
        'transactionId',
        'paymentGateway',
        'status',
        'meta',
        'startRecurringDate',
        'nextRecurringDate',
        'expiredAt',
        'createdAt',
        'updatedAt',
        'blockedUser'
      ])
    );
  }

  toResponse(includePrivateInfo = false) {
    const publicInfo = {
      _id: this._id,
      subscriptionType: this.subscriptionType,
      userId: this.userId,
      userInfo: this.userInfo,
      performerId: this.performerId,
      performerInfo: this.performerInfo,
      status: this.status,
      expiredAt: this.expiredAt,
      blockedUser: this.blockedUser,
      startRecurringDate: this.startRecurringDate,
      nextRecurringDate: this.nextRecurringDate,
      paymentGateway: this.paymentGateway,
      updatedAt: this.updatedAt
    };

    const privateInfo = {
      subscriptionId: this.subscriptionId,
      transactionId: this.transactionId,
      meta: this.meta
    };
    if (!includePrivateInfo) {
      return publicInfo;
    }

    return { ...publicInfo, ...privateInfo };
  }
}
