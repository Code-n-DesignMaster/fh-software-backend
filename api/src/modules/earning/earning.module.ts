import { Module, forwardRef } from '@nestjs/common';
import { MongoDBModule } from 'src/kernel';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { PerformerModule } from '../performer/performer.module';
import { PaymentModule } from '../payment/payment.module';
import { SettingModule } from '../settings/setting.module';
import { EarningController } from './controllers/earning.controller';
import { EarningService } from './services/earning.service';
import { earningProviders } from './providers/earning.provider';
import { TransactionEarningListener } from './listeners/earning.listener';

@Module({
  imports: [
    MongoDBModule,
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PerformerModule),
    forwardRef(() => PaymentModule),
    forwardRef(() => SettingModule)
  ],
  providers: [...earningProviders, EarningService, TransactionEarningListener],
  controllers: [EarningController],
  exports: [...earningProviders, EarningService, TransactionEarningListener]
})
export class EarningModule {}
