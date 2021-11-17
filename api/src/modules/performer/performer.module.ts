import { Module, forwardRef } from '@nestjs/common';
import { MongoDBModule, AgendaModule } from 'src/kernel';
import { UtilsModule } from 'src/modules/utils/utils.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { performerProviders, PERFORMER_MODEL_PROVIDER } from './providers';
import {
  CategoryService,
  CategorySearchService,
  PerformerService,
  PerformerSearchService
} from './services';
import {
  CategoryController,
  AdminCategoryController,
  AdminPerformerController,
  PerformerController
} from './controllers';
import { UserModule } from '../user/user.module';
import { FileModule } from '../file/file.module';
import { SettingModule } from '../settings/setting.module';
import { PerformerAssetsModule } from '../performer-assets/performer-assets.module';
import { PerformerAssetsListener, PerformerConnectedListener, SubscriptionPerformerListener } from './listeners';

@Module({
  imports: [
    MongoDBModule,
    AgendaModule.register(),
    // inject user module because we request guard from auth, need to check and fix dependencies if not needed later
    UserModule,
    forwardRef(() => AuthModule),
    forwardRef(() => FileModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => PerformerAssetsModule),
    forwardRef(() => UtilsModule),
    forwardRef(() => SettingModule)
  ],
  providers: [
    ...performerProviders,
    CategoryService,
    CategorySearchService,
    PerformerService,
    PerformerSearchService,
    PerformerAssetsListener,
    PerformerConnectedListener,
    SubscriptionPerformerListener
  ],
  controllers: [
    CategoryController,
    AdminCategoryController,
    AdminPerformerController,
    PerformerController
  ],
  exports: [
    ...performerProviders,
    PERFORMER_MODEL_PROVIDER,
    PerformerService,
    CategoryService,
    PerformerSearchService
  ]
})
export class PerformerModule {}
