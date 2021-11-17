import { Module, forwardRef } from '@nestjs/common';
import { MongoDBModule, QueueModule } from 'src/kernel';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { FileModule } from '../file/file.module';
import { PerformerModule } from '../performer/performer.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { conversationProviders, messageProviders, notificationMessageProviders, notificationSystemProviders } from './providers';
import { SocketModule } from '../socket/socket.module';
import { MessageListener, SysNotificationListener } from './listeners';
import { ConversationService, MessageService, NotificationMessageService } from './services';
import { ConversationController } from './controllers/conversation.controller';
import { MessageController } from './controllers/message.controller';
import {PaymentModule} from 'src/modules/payment/payment.module'
import { PerformerAssetsModule } from '../performer-assets/performer-assets.module';
@Module({
  imports: [
    MongoDBModule,
    QueueModule.forRoot(),
    SocketModule,
    // inject user module because we request guard from auth, need to check and fix dependencies if not needed later
    UserModule,
    forwardRef(() => PerformerModule),
    forwardRef(() => AuthModule),
    forwardRef(() => FileModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => PaymentModule),
    forwardRef(() => PerformerAssetsModule)
  ],
  providers: [
    ...messageProviders,
    ...conversationProviders,
    ...notificationMessageProviders,
    ...notificationSystemProviders,
    ConversationService,
    MessageService,
    NotificationMessageService,
    MessageListener,
    SysNotificationListener
  ],
  controllers: [ConversationController, MessageController],
  exports: [ConversationService, MessageService]
})
export class MessageModule { }
