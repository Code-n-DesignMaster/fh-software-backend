import { Injectable, Inject } from '@nestjs/common';
import { QueueEvent, QueueEventService } from 'src/kernel';
import { Model } from 'mongoose';
import { USER_SOCKET_CONNECTED_CHANNEL, USER_SOCKET_EVENT } from 'src/modules/socket/constants';
import { UserModel } from '../models';
import { USER_MODEL_PROVIDER } from '../providers';

const HANDLE_USER_ONLINE_OFFLINE = 'HANDLE_USER_ONLINE_OFFLINE';

@Injectable()
export class UserConnectedListener {
  constructor(
    private readonly queueEventService: QueueEventService,
    @Inject(USER_MODEL_PROVIDER)
    private readonly userModel: Model<UserModel>
  ) {
    this.queueEventService.subscribe(
      USER_SOCKET_CONNECTED_CHANNEL,
      HANDLE_USER_ONLINE_OFFLINE,
      this.handleOnlineOffline.bind(this)
    );
  }

  private async handleOnlineOffline(event: QueueEvent): Promise<void> {
    const { source, sourceId } = event.data;
    if (source !== 'user') {
      return;
    }

    let updateData = {};
    switch (event.eventName) {
      case USER_SOCKET_EVENT.CONNECTED:
        updateData = {
          isOnline: 1,
          onlineAt: new Date(),
          offlineAt: null
        };
        break;
      case USER_SOCKET_EVENT.DISCONNECTED:
        updateData = {
          isOnline: 0,
          onlineAt: null,
          offlineAt: new Date()
        };
        break;
      default: return;
    }
    await this.userModel.updateOne({ _id: sourceId },
      updateData,
      {
        upsert: false
      });
  }
}
