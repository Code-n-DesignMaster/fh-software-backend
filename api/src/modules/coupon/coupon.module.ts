import { Module, forwardRef } from '@nestjs/common';
import { MongoDBModule, QueueModule } from 'src/kernel';
import { AuthModule } from '../auth/auth.module';
import { couponProviders } from './providers';
import { UserModule } from '../user/user.module';
import { CouponService, CouponSearchService } from './services';
import { AdminCouponController } from './controllers/coupon.controller';
import { PaymentModule } from 'src/modules/payment/payment.module';
@Module({
  imports: [
    MongoDBModule,
    QueueModule.forRoot(),
    // inject user module because we request guard from auth, need to check and fix dependencies if not needed later
    UserModule,
    forwardRef(() => AuthModule),
    forwardRef(() => PaymentModule)
  ],
  providers: [...couponProviders, CouponService, CouponSearchService],
  controllers: [AdminCouponController],
  exports: [CouponService, CouponSearchService]
})
export class CouponModule {}
