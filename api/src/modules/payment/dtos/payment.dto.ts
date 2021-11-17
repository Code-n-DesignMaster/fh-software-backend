import { ObjectId } from 'mongodb';
import { pick } from 'lodash';
import { ICouponResponse } from 'src/modules/coupon/dtos';
export interface PaymentProduct {
  name?: string;
  description?: string;
  price?: number | string;
  extraInfo?: any;
  productType?: string;
  productId?: ObjectId;
  performerId?: ObjectId;
  quantity?: number;
}

export interface DigitalProductResponse {
  digitalFileUrl?: any;
  digitalFileId?: any;
  _id?: string | ObjectId;
}

export class IPaymentResponse {
  _id: ObjectId;
  paymentGateway?: string;
  sourceInfo?: any;
  source?: string;
  sourceId: ObjectId;
  performerId?: ObjectId;
  performerInfo?: any;
  target?: string;
  targetId?: ObjectId;
  type?: string;
  products?: PaymentProduct[];
  paymentResponseInfo?: any;
  totalPrice?: number;
  originalPrice?: number;
  couponInfo?: ICouponResponse;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
  digitalProducts?: DigitalProductResponse[];
  deliveryAddress?: string;
}

export class PaymentDto {
  _id: ObjectId;
  paymentGateway?: string;
  sourceInfo?: any;
  source?: string;
  sourceId: ObjectId;
  performerId?: ObjectId;
  performerInfo?: any;
  target?: string;
  targetId?: ObjectId;
  type?: string;
  products?: PaymentProduct[];
  paymentResponseInfo?: any;
  totalPrice?: number;
  originalPrice?: number;
  couponInfo?: ICouponResponse;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
  digitalProducts?: DigitalProductResponse[];
  deliveryAddress?: string;

  constructor(data?: Partial<PaymentDto>) {
    data &&
      Object.assign(
        this,
        pick(data, [
          '_id',
          'paymentGateway',
          'sourceInfo',
          'source',
          'sourceId',
          'performerId',
          'performerInfo',
          'target',
          'targetId',
          'type',
          'products',
          'paymentResponseInfo',
          'status',
          'totalPrice',
          'originalPrice',
          'couponInfo',
          'createdAt',
          'updatedAt',
          'digitalProducts',
          'deliveryAddress'
        ])
      );
  }

  toResponse(includePrivateInfo = false): IPaymentResponse {
    const publicInfo = {
      _id: this._id,
      paymentGateway: this.paymentGateway,
      sourceId: this.sourceId,
      source: this.source,
      sourceInfo: this.sourceInfo,
      performerId: this.performerId,
      performerInfo: this.performerInfo,
      target: this.target,
      targetId: this.targetId,
      type: this.type,
      products: this.products,
      totalPrice: this.totalPrice,
      originalPrice: this.originalPrice,
      couponInfo: this.couponInfo,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deliveryAddress: this.deliveryAddress
    };

    const privateInfo = {
      paymentResponseInfo: this.paymentResponseInfo
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
