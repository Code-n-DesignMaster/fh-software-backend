/* eslint-disable no-param-reassign */
import { Injectable, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import {
  EntityNotFoundException, ForbiddenException, QueueEventService, QueueEvent, PageableData
} from 'src/kernel';
import { EVENT } from 'src/kernel/constants';
import { PerformerDto } from 'src/modules/performer/dtos';
import { CommentModel } from '../models/comment.model';
import { COMMENT_MODEL_PROVIDER } from '../providers/comment.provider';
import {
  CommentCreatePayload, CommentEditPayload, CommentSearchRequestPayload
} from '../payloads';
import { UserDto } from '../../user/dtos';

import { CommentDto } from '../dtos/comment.dto';
import { UserService } from '../../user/services';
import { PerformerService } from '../../performer/services';
import { VideoService } from '../../performer-assets/services/video.service';
import { COMMENT_CHANNEL } from '../contants';

@Injectable()
export class CommentService {
  constructor(
    @Inject(COMMENT_MODEL_PROVIDER)
    private readonly commentModel: Model<CommentModel>,
    private readonly queueEventService: QueueEventService,
    private readonly userService: UserService,
    private readonly performerService: PerformerService,
    private readonly videoService: VideoService
  ) {}

  public async create(
    data: CommentCreatePayload,
    user: UserDto
  ): Promise<CommentDto> {
    const comment = { ...data } as any;
    comment.createdBy = user._id;
    comment.createdAt = new Date();
    comment.updatedAt = new Date();
    const newComment = await this.commentModel.create(comment);
    this.queueEventService.publish(
      new QueueEvent({
        channel: COMMENT_CHANNEL,
        eventName: EVENT.CREATED,
        data: new CommentDto(newComment)
      })
    );
    const [performerInfo] = await Promise.all([
      this.performerService.findById(newComment.createdBy)
    ]);
    const returnData = new CommentDto(newComment);
    // eslint-disable-next-line no-nested-ternary
    returnData.creator = performerInfo
      ? new PerformerDto(performerInfo).toPublicDetailsResponse()
      : (user ? new UserDto(user).toResponse() : null);
    return returnData;
  }

  public async update(
    id: string | ObjectId,
    payload: CommentEditPayload,
    user: UserDto
  ) {
    const comment = await this.commentModel.findById(id);
    if (!comment) {
      throw new EntityNotFoundException();
    }
    const data = { ...payload };
    if (comment.createdBy !== user._id) {
      throw new ForbiddenException();
    }

    return this.commentModel.updateOne({ _id: id }, data, { new: true });
  }

  public async delete(
    id: string | ObjectId,
    user: UserDto
  ) {
    const comment = await this.commentModel.findById(id);
    if (!comment) {
      throw new EntityNotFoundException();
    }
    if (comment.createdBy !== user._id) {
      throw new ForbiddenException();
    }
    await this.commentModel.deleteOne({ _id: id });
    this.queueEventService.publish(
      new QueueEvent({
        channel: COMMENT_CHANNEL,
        eventName: EVENT.DELETED,
        data: new CommentDto(comment)
      })
    );
    return true;
  }

  public async search(
    req: CommentSearchRequestPayload
  ): Promise<PageableData<CommentDto>> {
    const query = {} as any;
    if (req.objectId) {
      query.objectId = req.objectId;
    }
    const sort = {
      createdAt: -1
    };
    const [data, total] = await Promise.all([
      this.commentModel
        .find(query)
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.commentModel.countDocuments(query)
    ]);
    const comments = data.map((d) => new CommentDto(d));
    const UIds = data.map((d) => d.createdBy);
    const [users, performers] = await Promise.all([
      UIds.length ? this.userService.findByIds(UIds) : [],
      UIds.length ? this.performerService.findByIds(UIds) : []
    ]);
    comments.forEach((comment: CommentDto) => {
      const performer = performers.find((p) => p._id.toString() === comment.createdBy.toString());
      const user = users.find((u) => u._id.toString() === comment.createdBy.toString());
      // eslint-disable-next-line no-nested-ternary
      comment.creator = performer
        ? new PerformerDto(performer).toPublicDetailsResponse()
        : (user ? new UserDto(user).toResponse() : null);
    });
    return {
      data: comments,
      total
    };
  }
}
