import { Module, forwardRef } from '@nestjs/common';
import { MongoDBModule, QueueModule } from 'src/kernel';
import { menuProviders, settingProviders } from './providers';
import { MenuService, SettingService } from './services';
import { SettingController } from './controllers/setting.controller';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { SettingFileUploadController } from './controllers/setting-file-upload.controller';
import { FileModule } from '../file/file.module';
import { AdminSettingController } from './controllers/admin-setting.controller';
import { MenuController } from './controllers/menu.controller';

@Module({
  imports: [
    QueueModule.forRoot(),
    MongoDBModule,
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => FileModule)
  ],
  providers: [
    ...settingProviders,
    SettingService,
    ...menuProviders,
    MenuService
  ],
  controllers: [
    SettingController,
    SettingFileUploadController,
    AdminSettingController,
    MenuController
  ],
  exports: [...settingProviders, SettingService, MenuService]
})
export class SettingModule {
  constructor(private settingService: SettingService) {
    this.settingService.syncCache();
  }
}
