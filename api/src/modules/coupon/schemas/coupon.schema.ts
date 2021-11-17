import { Schema } from 'mongoose';

export const CouponSchema = new Schema({
  name: { type: String, index: true },
  description: { type: String },
  code: { type: String, index: true },
  value: { type: Number, default: 0 },
  expiredDate: { type: Date },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  numberOfUses: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
