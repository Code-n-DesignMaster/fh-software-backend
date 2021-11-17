import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { QueueEventService, QueueEvent } from 'src/kernel';
import { REACTION_CHANNEL, REACTION_TYPE, REACTION } from 'src/modules/reaction/constants';
import { EVENT } from 'src/kernel/constants';
import { PerformerService } from 'src/modules/performer/services';
import { GalleryService } from '../services/gallery.service';
const REACTION_GALLERY_CHANNEL = 'REACTION_GALLERY_CHANNEL';

@Injectable()
export class ReactionGalleryListener {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    private readonly queueEventService: QueueEventService,
    private readonly galleryService: GalleryService
  ) {
    this.queueEventService.subscribe(
      REACTION_CHANNEL,
      REACTION_GALLERY_CHANNEL,
      this.handleReactGallery.bind(this)
    );
  }

  public async handleReactGallery(event: QueueEvent) {
    try {
      if (![EVENT.CREATED, EVENT.DELETED].includes(event.eventName)) {
        return;
      }
      const { objectId: galleryId, objectType, action, performerId } = event.data;
      if (objectType !== REACTION_TYPE.GALLERY) {
        return;
      }

      switch (action) {
        case REACTION.LIKE:
          await this.galleryService.increaseLike(
            galleryId,
            event.eventName === EVENT.CREATED ? 1 : -1
          );
          await this.performerService.updateLikeStat(performerId,  event.eventName === EVENT.CREATED ? 1 : -1)
          break;
        case REACTION.FAVOURITE:
          await this.galleryService.increaseFavourite(
            galleryId,
            event.eventName === EVENT.CREATED ? 1 : -1
          );
          break;
        default: break;
      }
    } catch (e) {
      // TODO - log me
      console.log(e);
    }
  }
}