import { Schema } from 'mongoose';

export const PaymentTransactionSchema = new Schema({
  note: {
    type: String
  },
  paymentGateway: {
    type: String
  },
  // user, model, etc...
  source: {
    type: String,
    index: true
  },
  sourceId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  // user, model, etc...
  target: {
    type: String,
    index: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  performerId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  // subscription, store, etc...
  type: {
    type: String,
    index: true
  },
  products: [
    {
      _id: false,
      name: String,
      description: String,
      price: Number,
      productType: String,
      productId: Schema.Types.ObjectId,
      quantity: Number,
      extraInfo: Schema.Types.Mixed
    }
  ],
  deliveryAddress: {
    type: String
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  originalPrice: {
    type: Number,
    default: 0
  },
  paymentResponseInfo: {
    type: Schema.Types.Mixed
  },
  // pending, success, etc...
  status: {
    type: String,
    index: true
  },
  couponInfo: {
    type: Schema.Types.Mixed
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
