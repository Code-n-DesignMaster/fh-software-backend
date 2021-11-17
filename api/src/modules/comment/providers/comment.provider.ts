import { Connection } from 'mongoose';
import { MONGO_DB_PROVIDER } from 'src/kernel';
import { CommentSchema } from '../schemas/comment.schema';

export const COMMENT_MODEL_PROVIDER = 'COMMENT_MODEL_PROVIDER';

export const commentProviders = [
  {
    provide: COMMENT_MODEL_PROVIDER,
    useFactory: (connection: Connection) => connection.model('Comment', CommentSchema),
    inject: [MONGO_DB_PROVIDER]
  }
];
