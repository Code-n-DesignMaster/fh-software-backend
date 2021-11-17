import { Injectable } from '@nestjs/common';
import { QueueEventService, QueueEvent } from 'src/kernel';
import { COMMENT_CHANNEL, OBJECT_TYPE } from 'src/modules/comment/contants';
import { EVENT } from 'src/kernel/constants';
import { GalleryService } from '../services/gallery.service';

const COMMENT_VIDEO_CHANNEL = 'COMMENT_GALLERY_CHANNEL';

@Injectable()
export class CommentGalleryListener {
  constructor(
    private readonly queueEventService: QueueEventService,
    private readonly galleryService: GalleryService
  ) {
    this.queueEventService.subscribe(
      COMMENT_CHANNEL,
      COMMENT_VIDEO_CHANNEL,
      this.handleReactGallery.bind(this)
    );
  }

  public async handleReactGallery(event: QueueEvent) {
    try {
      if (![EVENT.CREATED, EVENT.DELETED].includes(event.eventName)) {
        return;
      }
      event.data.objectType = OBJECT_TYPE.GALLERY;
      const { objectId: galleryId, objectType } = event.data;

      if (objectType !== OBJECT_TYPE.GALLERY) {
        return;
      }
      await this.galleryService.increaseComment(
        galleryId,
        event.eventName === EVENT.CREATED ? 1 : -1
      );
    } catch (e) {
      // TODO - log me
      console.log(e);
    }
  }
}