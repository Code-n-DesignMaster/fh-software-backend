import { Document } from 'mongoose';
import { ObjectId } from 'mongodb';

export class PaymentGatewaySettingModel extends Document {
  performerId: ObjectId;
  // active, etc...
  status: string;
  // eg ccbill, paypal
  key: string;
  value: any;
}
