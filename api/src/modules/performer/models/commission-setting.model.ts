import { Document } from 'mongoose';
import { ObjectId } from 'mongodb';

export class CommissionSettingModel extends Document {
  performerId: ObjectId;
  monthlySubscriptionCommission: number;
  yearlySubscriptionCommission: number;
  videoSaleCommission: number;
  gallerySaleCommission: number;
  productSaleCommission: number;
  tipCommission: number;
  createdAt: Date;
  updatedAt: Date;
}
