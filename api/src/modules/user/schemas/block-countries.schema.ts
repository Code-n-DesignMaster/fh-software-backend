import * as mongoose from 'mongoose';

export const blockCountrySchema = new mongoose.Schema({
  countryCode: { type: String, index: true, unique: true },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const BlockCountrySchema = blockCountrySchema;
