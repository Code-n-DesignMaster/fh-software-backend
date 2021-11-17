import { Connection } from 'mongoose';
import { MONGO_DB_PROVIDER } from 'src/kernel';
import { BlockCountrySchema } from '../schemas/block-countries.schema';

export const BLOCK_COUNTRY_PROVIDER = 'BLOCK_COUNTRY_PROVIDER';

export const blockCountryProviders = [
  {
    provide: BLOCK_COUNTRY_PROVIDER,
    useFactory: (connection: Connection) => connection.model('BlockCountry', BlockCountrySchema),
    inject: [MONGO_DB_PROVIDER]
  }
];
