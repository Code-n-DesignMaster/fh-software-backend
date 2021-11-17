import { Connection } from 'mongoose';
import { MONGO_DB_PROVIDER } from 'src/kernel';
import { CouponSchema } from '../schemas';

export const COUPON_PROVIDER = 'COUPON_PROVIDER';

export const couponProviders = [
  {
    provide: COUPON_PROVIDER,
    useFactory: (connection: Connection) =>
      connection.model('Coupon', CouponSchema),
    inject: [MONGO_DB_PROVIDER]
  }
];
