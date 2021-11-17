import { Schema } from 'mongoose';

export const CommissionSettingSchema = new Schema({
  performerId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  monthlySubscriptionCommission: { type: Number, default: 0.1 },
  yearlySubscriptionCommission: { type: Number, default: 0.1 },
  videoSaleCommission: { type: Number, default: 0.1 },
  productSaleCommission: { type: Number, default: 0.1 },
  gallerySaleCommission: { type: Number, default: 0.1 },
  tipCommission: { type: Number, default: 0.1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
