import { ObjectId } from 'mongodb';
import { pick } from 'lodash';

export class EarningDto {
  _id: ObjectId;
  userId: ObjectId;
  userInfo?: any;
  transactionId: ObjectId;
  transactionInfo?: any;
  performerId: ObjectId;
  performerInfo?: any;
  sourceType: string;
  grossPrice: number;
  netPrice: number;
  commission: number;
  isPaid?: boolean;
  createdAt: Date;
  paidAt?: Date;
  transactionStatus?: string;

  constructor(data?: Partial<EarningDto>) {
    Object.assign(
      this,
      pick(data, [
        '_id',
        'userId',
        'userInfo',
        'transactionId',
        'transactionInfo',
        'performerId',
        'performerInfo',
        'sourceType',
        'grossPrice',
        'netPrice',
        'isPaid',
        'commission',
        'createdAt',
        'paidAt',
        'transactionStatus'
      ])
    );
  }
}

export interface IEarningStatResponse {
  totalGrossPrice: number;
  totalNetPrice: number;
  totalCommission: number;
}
