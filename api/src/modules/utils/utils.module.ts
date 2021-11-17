import { Module, HttpModule, forwardRef } from '@nestjs/common';
import {
  CountryService, LanguageService, PhoneCodeService, StatisticService
} from './services';
import {
  CountryController,
  LanguageController,
  PhoneCodeController,
  StatisticController
} from './controllers';
import { AuthModule } from '../auth/auth.module';
import { PerformerAssetsModule } from '../performer-assets/performer-assets.module';
import { PerformerModule } from '../performer/performer.module';
import { UserModule } from '../user/user.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { EarningModule } from '../earning/earning.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5
    }),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PerformerModule),
    forwardRef(() => PerformerAssetsModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => EarningModule),
    forwardRef(() => PaymentModule)
  ],
  providers: [CountryService, LanguageService, PhoneCodeService, StatisticService],
  controllers: [CountryController, LanguageController, PhoneCodeController, StatisticController],
  exports: [CountryService, LanguageService, PhoneCodeService]
})
export class UtilsModule {}
