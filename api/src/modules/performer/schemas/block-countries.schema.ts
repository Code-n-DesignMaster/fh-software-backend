import { Schema } from 'mongoose';

export const BlockCountriesSettingSchema = new Schema({
  performerId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  countries: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

BlockCountriesSettingSchema.index({ countries: 1 });
