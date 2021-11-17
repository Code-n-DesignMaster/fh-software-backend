import { Module, forwardRef } from '@nestjs/common';
import { MongoDBModule } from 'src/kernel';
import { userProviders, blockCountryProviders } from './providers';
import {
  UserController,
  AvatarController,
  AdminUserController,
  AdminAvatarController,
  BlockCountryController
} from './controllers';
import { UserService, UserSearchService, BlockCountryService } from './services';
import { AuthModule } from '../auth/auth.module';
import { FileModule } from '../file/file.module';
import { UserConnectedListener } from './listeners/user-connected.listener';

@Module({
  imports: [
    MongoDBModule,
    forwardRef(() => AuthModule),
    forwardRef(() => FileModule)
  ],
  providers: [
    ...userProviders,
    ...blockCountryProviders,
    UserService,
    UserSearchService,
    BlockCountryService,
    UserConnectedListener
  ],
  controllers: [
    UserController,
    AvatarController,
    AdminUserController,
    AdminAvatarController,
    BlockCountryController
  ],
  exports: [...userProviders, ...blockCountryProviders, UserService, UserSearchService, BlockCountryService]
})
export class UserModule {}
