import { Connection } from 'mongoose';
import { MONGO_DB_PROVIDER } from 'src/kernel';
import {
  PaymentTransactionSchema,
  OrderSchema
} from '../schemas';

export const PAYMENT_TRANSACTION_MODEL_PROVIDER = 'PAYMENT_TRANSACTION_MODEL_PROVIDER';

export const paymentProviders = [
  {
    provide: PAYMENT_TRANSACTION_MODEL_PROVIDER,
    useFactory: (connection: Connection) => connection.model('PaymentTransaction', PaymentTransactionSchema),
    inject: [MONGO_DB_PROVIDER]
  }
];

export const ORDER_MODEL_PROVIDER = 'ORDER_MODEL_PROVIDER';

export const orderProviders = [
  {
    provide: ORDER_MODEL_PROVIDER,
    useFactory: (connection: Connection) => connection.model('orders', OrderSchema),
    inject: [MONGO_DB_PROVIDER]
  }
];
