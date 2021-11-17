import { Module, forwardRef } from '@nestjs/common';
import { MongoDBModule, QueueModule } from 'src/kernel';
import { SubscriptionController } from './controllers/subscription.controller';
import { SubscriptionService } from './services/subscription.service';
import { subscriptionProviders } from './providers/subscription.provider';
import { TransactionSubscriptionListener } from './listeners/transaction-update.listener';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { PerformerModule } from '../performer/performer.module';
// import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    QueueModule.forRoot(),
    MongoDBModule,
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PerformerModule)
    // forwardRef(() => PaymentModule)
  ],
  providers: [...subscriptionProviders, SubscriptionService, TransactionSubscriptionListener],
  controllers: [SubscriptionController],
  exports: [...subscriptionProviders, SubscriptionService, TransactionSubscriptionListener]
})
export class SubscriptionModule {}
