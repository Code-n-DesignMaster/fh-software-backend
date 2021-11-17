import { Document } from 'mongoose';
import { ObjectId } from 'mongodb';

export class BlockCountriesSettingModel extends Document {
  performerId: ObjectId;
  countries: string[];
  createdAt: Date;
  updatedAt: Date;
}
