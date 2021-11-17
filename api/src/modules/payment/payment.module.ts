import { MongoDBModule, QueueModule } from 'src/kernel';
import {
  Module, forwardRef, NestModule, MiddlewareConsumer
} from '@nestjs/common';
import { CouponModule } from 'src/modules/coupon/coupon.module';
import { RequestLoggerMiddleware } from 'src/kernel/logger/request-log.middleware';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { PerformerModule } from '../performer/performer.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PerformerAssetsModule } from '../performer-assets/performer-assets.module';
import { paymentProviders, orderProviders } from './providers';
import { SettingModule } from '../settings/setting.module';
import { EarningModule } from '../earning/earning.module';
import { FileModule } from '../file/file.module';
import { MailerModule } from '../mailer/mailer.module';
import { MessageModule } from '../message/message.module';
import {
  CCBillService,
  PaymentService,
  PaymentSearchService,
  CheckPaymentService,
  OrderService,
  MoonlightService
} from './services';
import { PaymentController, PaymentSearchController, OrderController } from './controllers';
import { OrderListener, TransactionMailerListener } from './listeners';

@Module({
  imports: [
    MongoDBModule,
    QueueModule.forRoot(),
    // inject user module because we request guard from auth, need to check and fix dependencies if not needed later
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PerformerModule),
    forwardRef(() => SettingModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => EarningModule),
    forwardRef(() => PerformerAssetsModule),
    forwardRef(() => CouponModule),
    forwardRef(() => FileModule),
    forwardRef(() => MailerModule),
    forwardRef(() => MessageModule)
  ],
  providers: [
    ...paymentProviders,
    ...orderProviders,
    PaymentService,
    CCBillService,
    MoonlightService,
    PaymentSearchService,
    CheckPaymentService,
    OrderService,
    OrderListener,
    TransactionMailerListener
  ],
  controllers: [PaymentController, PaymentSearchController, OrderController],
  exports: [
    ...paymentProviders,
    ...orderProviders,
    PaymentService,
    CCBillService,
    MoonlightService,
    PaymentSearchService,
    CheckPaymentService,
    OrderService,
    OrderListener
  ]
})
export class PaymentModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('/payment/ccbill/callhook');
  }
}
