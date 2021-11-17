import { Document } from 'mongoose';

export class SystemAccessModel extends Document {
  account?: string;
  userType?: string;
  ip?: string;
  createdAt?: Date;
}
