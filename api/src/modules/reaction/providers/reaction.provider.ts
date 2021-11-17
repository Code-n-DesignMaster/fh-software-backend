import { Connection } from 'mongoose';
import { MONGO_DB_PROVIDER } from 'src/kernel';
import { ReactSchema } from '../schemas/reaction.schema';

export const REACT_MODEL_PROVIDER = 'REACT_MODEL_PROVIDER';

export const reactionProviders = [
  {
    provide: REACT_MODEL_PROVIDER,
    useFactory: (connection: Connection) =>
      connection.model('React', ReactSchema),
    inject: [MONGO_DB_PROVIDER]
  }
];
