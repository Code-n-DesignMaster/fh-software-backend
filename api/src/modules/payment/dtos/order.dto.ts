import { ObjectId } from 'mongodb';
import { pick } from 'lodash';

export class OrderDto {
  _id: ObjectId;
  transactionId: ObjectId;
  performerId: ObjectId;
  performerInfo?: any;
  userId: ObjectId;
  userInfo?: any;
  orderNumber: string;
  shippingCode: string;
  productIds: ObjectId[];
  productsInfo: any[];
  quantity: number;
  totalPrice: number;
  deliveryAddress?: string;
  deliveryStatus: string;
  postalCode?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data?: Partial<OrderDto>) {
    data &&
      Object.assign(
        this,
        pick(data, [
          '_id',
          'transactionId',
          'performerId',
          'performerInfo',
          'userId',
          'userInfo',
          'orderNumber',
          'shippingCode',
          'productIds',
          'productsInfo',
          'quantity',
          'totalPrice',
          'deliveryAddress',
          'deliveryStatus',
          'postalCode',
          'createdAt',
          'updatedAt'
        ])
      );
  }
}
