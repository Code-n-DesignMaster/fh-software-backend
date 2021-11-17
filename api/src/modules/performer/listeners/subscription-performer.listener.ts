import { Injectable } from '@nestjs/common';
import { QueueEventService, QueueEvent } from 'src/kernel';
import { UPDATE_PERFORMER_SUBSCRIPTION_CHANNEL } from 'src/modules/subscription/constants';
import { EVENT } from 'src/kernel/constants';
import { PerformerService } from '../services/performer.service';

const SUBSCRIPTION_PERFORMER_CHANNEL = 'SUBSCRIPTION_PERFORMER_CHANNEL';

@Injectable()
export class SubscriptionPerformerListener {
  constructor(
    private readonly queueEventService: QueueEventService,
    private readonly performerService: PerformerService
  ) {
    this.queueEventService.subscribe(
      UPDATE_PERFORMER_SUBSCRIPTION_CHANNEL,
      SUBSCRIPTION_PERFORMER_CHANNEL,
      this.handleSubscriptionStat.bind(this)
    );
  }

  public async handleSubscriptionStat(event: QueueEvent) {
    try {
      if (![EVENT.CREATED, EVENT.DELETED].includes(event.eventName)) {
        return;
      }
      const { performerId } = event.data;
      await this.performerService.updateSubscriptionStat(
        performerId,
        event.eventName === EVENT.CREATED ? 1 : -1
      );
    } catch (e) {
      // TODO - log me
      // console.log(e);
    }
  }
}
