import { Injectable, Inject } from '@nestjs/common';
import { QueueEvent, QueueEventService } from 'src/kernel';
import { Model } from 'mongoose';
import { PERFORMER_SOCKET_CONNECTED_CHANNEL, USER_SOCKET_EVENT } from 'src/modules/socket/constants';
import { PerformerModel } from '../models';
import { PERFORMER_MODEL_PROVIDER } from '../providers';

const HANDLE_PERFORMER_ONLINE_OFFLINE = 'HANDLE_PERFORMER_ONLINE_OFFLINE';

@Injectable()
export class PerformerConnectedListener {
  constructor(
    private readonly queueEventService: QueueEventService,
    @Inject(PERFORMER_MODEL_PROVIDER)
    private readonly performerModel: Model<PerformerModel>
  ) {
    this.queueEventService.subscribe(
      PERFORMER_SOCKET_CONNECTED_CHANNEL,
      HANDLE_PERFORMER_ONLINE_OFFLINE,
      this.handleOnlineOffline.bind(this)
    );
  }

  private async handleOnlineOffline(event: QueueEvent): Promise<void> {
    const { source, sourceId } = event.data;
    if (source !== 'performer') {
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
    await this.performerModel.updateOne({ _id: sourceId },
      updateData,
      {
        upsert: false
      });
  }
}
