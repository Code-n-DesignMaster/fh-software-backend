import { Connection } from 'mongoose';
import { MONGO_DB_PROVIDER } from 'src/kernel';
import { SystemAccessSchema } from '../../auth/schemas';

export const SYSTEM_ACCESS_MODEL_PROVIDER = 'SYSTEM_ACCESS_MODEL_PROVIDER';

export const systemAccessProviders = [
  {
    provide: SYSTEM_ACCESS_MODEL_PROVIDER,
    useFactory: (connection: Connection) => connection.model('SystemAccess', SystemAccessSchema),
    inject: [MONGO_DB_PROVIDER]
  }
];
