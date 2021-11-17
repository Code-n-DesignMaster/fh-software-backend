import { Module, forwardRef } from '@nestjs/common';
import { MongoDBModule } from 'src/kernel';
import { authProviders } from './providers/auth.provider';
import { UserModule } from '../user/user.module';
import { AuthService, VerificationService, SystemAccessService } from './services';
import { MailerModule } from '../mailer/mailer.module';
import { AuthGuard, RoleGuard, LoadUser } from './guards';
import { RegisterController } from './controllers/register.controller';
import { LoginController } from './controllers/login.controller';
import { PasswordController } from './controllers/password.controller';

// performer
import { PerformerRegisterController } from './controllers/performer-register.controller';
import { FileModule } from '../file/file.module';
import { PerformerModule } from '../performer/performer.module';
import { systemAccessProviders } from './providers/system.access.provider';

@Module({
  imports: [
    MongoDBModule,
    forwardRef(() => PerformerModule),
    forwardRef(() => UserModule),
    forwardRef(() => MailerModule),
    forwardRef(() => FileModule)
  ],
  providers: [
    ...authProviders,
    ...systemAccessProviders,
    AuthService,
    VerificationService,
    SystemAccessService,
    AuthGuard,
    RoleGuard,
    LoadUser
  ],
  controllers: [
    RegisterController,
    LoginController,
    PasswordController,
    PerformerRegisterController
  ],
  exports: [
    ...authProviders,
    AuthService,
    VerificationService,
    SystemAccessService,
    AuthGuard,
    RoleGuard,
    LoadUser
  ]
})
export class AuthModule {}
