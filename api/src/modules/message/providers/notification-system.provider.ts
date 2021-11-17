import { Connection } from 'mongoose';
import { MONGO_DB_PROVIDER } from 'src/kernel';
import { NotificationSystemSchema } from '../schemas';

export const NOTIFICATION_SYSTEM_MODEL_PROVIDER = 'NOTIFICATION_SYSTEM_MODEL_PROVIDER';

export const notificationSystemProviders = [
  {
    provide: NOTIFICATION_SYSTEM_MODEL_PROVIDER,
    useFactory: (connection: Connection) => connection.model('NotificationSystem', NotificationSystemSchema),
    inject: [MONGO_DB_PROVIDER]
  }
];
