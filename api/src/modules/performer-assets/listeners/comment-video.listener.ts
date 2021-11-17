import { Injectable } from '@nestjs/common';
import { QueueEventService, QueueEvent } from 'src/kernel';
import { COMMENT_CHANNEL, OBJECT_TYPE } from 'src/modules/comment/contants';
import { EVENT } from 'src/kernel/constants';
import { VideoService } from '../services/video.service';

const COMMENT_VIDEO_CHANNEL = 'COMMENT_VIDEO_CHANNEL';

@Injectable()
export class CommentVideoListener {
  constructor(
    private readonly queueEventService: QueueEventService,
    private readonly videoService: VideoService
  ) {
    this.queueEventService.subscribe(
      COMMENT_CHANNEL,
      COMMENT_VIDEO_CHANNEL,
      this.handleReactVideo.bind(this)
    );
  }

  public async handleReactVideo(event: QueueEvent) {
    try {
      if (![EVENT.CREATED, EVENT.DELETED].includes(event.eventName)) {
        return;
      }
      const { objectId: videoId, objectType } = event.data;
      if (objectType !== OBJECT_TYPE.VIDEO) {
        return;
      }
      await this.videoService.increaseComment(
        videoId,
        event.eventName === EVENT.CREATED ? 1 : -1
      );
    } catch (e) {
      // TODO - log me
      // console.log(e);
    }
  }
}
