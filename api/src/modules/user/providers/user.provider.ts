import { Connection } from 'mongoose';
import { MONGO_DB_PROVIDER } from 'src/kernel';
import { UserSchema } from '../schemas/user.schema';

export const USER_MODEL_PROVIDER = 'USER_MODEL';

export const userProviders = [
  {
    provide: USER_MODEL_PROVIDER,
    useFactory: (connection: Connection) => connection.model('User', UserSchema),
    inject: [MONGO_DB_PROVIDER]
  }
];
