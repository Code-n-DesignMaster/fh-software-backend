import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from 'src/kernel';
import { AuthModule } from '../auth/auth.module';
import { SettingModule } from '../settings/setting.module';
import { MailerService, ContactService } from './services';
import { ContactController } from './controllers/contact.controller';
import { MailerController } from './controllers/mail.controller';

@Module({
  imports: [
    QueueModule.forRoot(),
    forwardRef(() => AuthModule),
    forwardRef(() => SettingModule)
  ],
  providers: [MailerService, ContactService],
  controllers: [ContactController, MailerController],
  exports: [MailerService, ContactService]
})
export class MailerModule {}
