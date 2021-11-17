import { Document } from 'mongoose';

export class BlockCountryModel extends Document {
  countryCode: string;

  createdAt: Date;
}
