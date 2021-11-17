import { Schema } from 'mongoose';

export const SystemAccessSchema = new Schema({
  account: { type: String},
  userType: { type: String},
  ip: { type: String, index: true },
  createdAt: { type: Date, default: Date.now }
});