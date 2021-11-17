import { Injectable, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { EntityNotFoundException } from 'src/kernel';
import { UserDto } from 'src/modules/user/dtos';
import { NotificationDto } from '../dtos/notification.dto';
import { SocketUserService } from 'src/modules/socket/services/socket-user.service';
import { ConversationService } from './conversation.service';
import { NotificationMessageModel, NotificationSystemModel } from '../models';
import { NOTIFICATION_MESSAGE_MODEL_PROVIDER, NOTIFICATION_SYSTEM_MODEL_PROVIDER } from '../providers';
import {PaymentTransactionModel} from 'src/modules/payment/models/payment-transaction.model'
import {PAYMENT_TRANSACTION_MODEL_PROVIDER} from 'src/modules/payment/providers';
import { PerformerService } from 'src/modules/performer/services';
import { UserService } from 'src/modules/user/services';
import {PAYMENT_TYPE} from 'src/modules/payment/constants';
@Injectable()
export class NotificationMessageService {
  constructor(
    @Inject(NOTIFICATION_MESSAGE_MODEL_PROVIDER)
    private readonly notificationMessageModel: Model<NotificationMessageModel>,
    @Inject(NOTIFICATION_SYSTEM_MODEL_PROVIDER)
    private readonly notificationSystemModel: Model<NotificationSystemModel>,
    private readonly conversationService: ConversationService,
    private readonly socketUserService: SocketUserService,
    private readonly performerService: PerformerService,
    private readonly userService: UserService,
    @Inject(PAYMENT_TRANSACTION_MODEL_PROVIDER)
    private readonly paymentTransactionModel: Model<PaymentTransactionModel>
  ) { }
 
  public async recipientReadAllSystemMessage(recipientId: string | ObjectId, isPerformer: boolean): Promise<any> {
    const notification = await this.notificationSystemModel.findOne({
      recipientId
    });
  
   if (!notification) {
      return { ok: false };
   }
  
  // if (notification) {
    notification.totalNotReadMessage = 0;
    await notification.save();
   //}
    let perfMessage, userMessage;
    if(isPerformer){
      perfMessage = await this.paymentTransactionModel.find({performerId : recipientId, type: PAYMENT_TYPE.SEND_TIP, status: 'success'});
    }else{
      userMessage = await this.paymentTransactionModel.find({sourceId : recipientId, type: PAYMENT_TYPE.SEND_TIP, status: 'success'});
    }
    const data = userMessage ? userMessage : (perfMessage ? perfMessage : null);
    if (!data) {
      return { ok: false };
    }
    
    const sysMsgList = [];   
    for(let i = 0; i < data.length; i++){
      const notify =  new NotificationDto();
      const performer = await this.performerService.findById(data[i].performerId);
      const user = await this.userService.findById(data[i].sourceId);  
      notify.type = 'tip';
      notify.text = data[i].note;     
      notify.performerName =  performer ? performer.username : "";
      notify.userName = user ? user.username : "";
      notify.amount = data[i].totalPrice;
      notify.updatedAt = data[i].updatedAt;

      sysMsgList.push(notify);
    }
    sysMsgList.sort((c,b) => { return (c.updatedAt < b.updatedAt) ? 1 :-1 });
    
    return {data: sysMsgList, ok: true };
  }

  public async recipientReadAllMessageInConversation(recipientId: string | ObjectId, conversationId: string | ObjectId): Promise<any> {
    const conversation = await this.conversationService.findById(
      conversationId
    );
    if (!conversation) {
      throw new EntityNotFoundException();
    }

    const found = conversation.recipients.find(
      (recipient) => recipient.sourceId.toString() === recipientId.toString()
    );
    if (!found) {
      throw new EntityNotFoundException();
    }

    const notification = await this.notificationMessageModel.findOne({
      recipientId,
      conversationId
    });
    if (!notification) {
      return { ok: false };
    }
    notification.totalNotReadMessage = 0;
    await notification.save();

    const totalNotReadMessage = await this.notificationMessageModel.aggregate([
      {
        $match: { recipientId }
      },
      {
        $group: {
          _id: '$conversationId',
          total: {
            $sum: '$totalNotReadMessage'
          }
        }
      }
    ]);
    let total = 0;
    totalNotReadMessage && totalNotReadMessage.length && totalNotReadMessage.forEach((data) => {
      if (data.total) {
        total += 1;
      }
    });
    this.socketUserService.emitToUsers([recipientId] as any, 'nofify_read_messages_in_conversation', { total });
    return { ok: true };
  }

  public async countTotalNotReadMessage(user: UserDto): Promise<any> {
    const totalNotReadMessage = await this.notificationMessageModel.aggregate([
      {
        $match: { recipientId: user._id }
      },
      {
        $group: {
          _id: '$conversationId',
          total: {
            $sum: '$totalNotReadMessage'
          }
        }
      }
    ]);
    let total = 0;
    if (!totalNotReadMessage || !totalNotReadMessage.length) {
      return { total };
    }
    totalNotReadMessage.forEach((data) => {
      if (data.total) {
        total += 1;
      }
    });
    return { total };
  }

  public async countTotalNotReadSystemMessage(user: UserDto): Promise<any> {
    /*
    const totalNotReadMessage = await this.notificationSystemModel.aggregate([
      {
        $match: { recipientId: user._id }
      },
      {
        $group: {
          _id: '$recipientId',
          total: {
            $sum: '$totalNotReadMessage'
          }
        }
      }
    ]);
    */
   const notification = await this.notificationSystemModel.findOne({recipientId : user._id })
    let total = 0;
    if (!notification) {
      return { total };
    }else{
      total = notification.totalNotReadMessage;
    }
    /*
    totalNotReadMessage.forEach((data) => {
      if (data.total) {
        //total += 1;
        total = data.total;
      }
    });
    */
    return { total };
  }
}
