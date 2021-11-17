import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { QueueEvent, QueueEventService, StringHelper } from 'src/kernel';
import { Model } from 'mongoose';
import { SocketUserService } from 'src/modules/socket/services/socket-user.service';
import { ObjectId } from 'mongodb';
import { SYS_NOTIFICATION_CHANNEL, NOTIFICATION_EVENT } from '../constants';
import {  NOTIFICATION_SYSTEM_MODEL_PROVIDER } from '../providers';
import { NotificationSystemModel } from '../models';
import { PAYMENT_STATUS } from '../../payment/constants';
import { PerformerService } from 'src/modules/performer/services';
import { UserService } from 'src/modules/user/services';


const SYS_NOTIFICATION_NOTIFY = 'SYS_NOTIFICATION_NOTIFY';


@Injectable()
export class SysNotificationListener {
  constructor(
    private readonly queueEventService: QueueEventService,
    private readonly socketUserService: SocketUserService,
    @Inject(NOTIFICATION_SYSTEM_MODEL_PROVIDER)
    private readonly notificationSysModel: Model<NotificationSystemModel>,
    private readonly userService: UserService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService
  ) {    
    this.queueEventService.subscribe(
        SYS_NOTIFICATION_CHANNEL,
        SYS_NOTIFICATION_NOTIFY,
      this.handleMessage.bind(this)
    );
  }

  private async handleMessage(event: QueueEvent): Promise<void> {
    try{
    if (event.eventName !== NOTIFICATION_EVENT.CREATED) return;

    const transaction = event.data;
   
    if (transaction.status !== PAYMENT_STATUS.SUCCESS) {
        return;
      }
     
      const performer = await this.performerService.findById(transaction.performerId);
      const user = await this.userService.findById(transaction.sourceId);
      if (!user || !performer) {
        return;
      }
      const availableDataPer = await this.notificationSysModel.findOne({
        recipientId: transaction.performerId }
      );

      if(availableDataPer){
        await this.notificationSysModel.update({ _id: availableDataPer._id }, {
          $inc: { totalNotReadMessage: 1 }, updatedAt: new Date()
        }, { upsert: true });
      }else{
        const n = await this.notificationSysModel.create({
             totalNotReadMessage: 1,
             recipientId: transaction.performerId,
             updatedAt: new Date(),
             createdAt: new Date()
           });
        await n.save();
      }

      const availableDataUser = await this.notificationSysModel.findOne({recipientId: transaction.sourceId }
      );

      if(availableDataUser){
        await this.notificationSysModel.update({ _id: availableDataUser._id }, {
          $inc: { totalNotReadMessage: 1 }, updatedAt: new Date()
        }, { upsert: true });
      }else{
        const n = await this.notificationSysModel.create({
          totalNotReadMessage: 1,
          recipientId: transaction.sourceId,
          updatedAt: new Date(),
          createdAt: new Date()
        });
        await n.save();
      }

      const receiverId = [transaction.performerId, transaction.sourceId];
      
      await this.notifySendTipSystemMessage(receiverId, {sys: 1});
    }catch (e) {
        // TODO - log me
       console.log(e);
    }
  }

  private async notifySendTipSystemMessage(receiverId, sysNnotification): Promise<void> {
    await this.socketUserService.emitToUsers(receiverId, 'nofify_send_tip_system_messages', sysNnotification);
  }

}