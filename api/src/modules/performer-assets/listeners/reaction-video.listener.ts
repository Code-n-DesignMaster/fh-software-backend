import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { QueueEventService, QueueEvent } from 'src/kernel';
import { REACTION_CHANNEL, REACTION_TYPE, REACTION } from 'src/modules/reaction/constants';
import { EVENT } from 'src/kernel/constants';
import { PerformerService } from 'src/modules/performer/services';
import { VideoService } from '../services/video.service';

const REACTION_VIDEO_CHANNEL = 'REACTION_VIDEO_CHANNEL';

@Injectable()
export class ReactionVideoListener {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    private readonly queueEventService: QueueEventService,
    private readonly videoService: VideoService
  ) {
    this.queueEventService.subscribe(
      REACTION_CHANNEL,
      REACTION_VIDEO_CHANNEL,
      this.handleReactVideo.bind(this)
    );
  }

  public async handleReactVideo(event: QueueEvent) {
    try {
      if (![EVENT.CREATED, EVENT.DELETED].includes(event.eventName)) {
        return;
      }
      const {
        objectId: videoId, objectType, action, performerId
      } = event.data;
      if (objectType !== REACTION_TYPE.VIDEO) {
        return;
      }

      switch (action) {
        case REACTION.LIKE:
          await this.videoService.increaseLike(
            videoId,
            event.eventName === EVENT.CREATED ? 1 : -1
          );
          await this.performerService.updateLikeStat(performerId, event.eventName === EVENT.CREATED ? 1 : -1);
          break;
        case REACTION.FAVOURITE:
          await this.videoService.increaseFavourite(
            videoId,
            event.eventName === EVENT.CREATED ? 1 : -1
          );
          break;
        default: break;
      }
    } catch (e) {
      // TODO - log me
      // console.log(e);
    }
  }
}
