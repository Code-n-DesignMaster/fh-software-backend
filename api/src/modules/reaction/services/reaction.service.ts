import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { ReactionModel } from '../models/reaction.model';
import { REACT_MODEL_PROVIDER } from '../providers/reaction.provider';
import {
  ReactionCreatePayload, ReactionSearchRequestPayload
} from '../payloads';
import { UserDto } from '../../user/dtos';
import { PageableData, QueueEventService, QueueEvent } from 'src/kernel';
import { ReactionDto } from '../dtos/reaction.dto';
import { UserService } from '../../user/services';
import { PerformerService } from '../../performer/services';
import { REACTION_CHANNEL, REACTION_TYPE } from '../constants';
import { EVENT, STATUS } from 'src/kernel/constants';
import { VideoSearchService } from 'src/modules/performer-assets/services/video-search.service';
import { GallerySearchService } from 'src/modules/performer-assets/services/gallery-search-service';
import { VideoSearchRequest, GallerySearchRequest } from 'src/modules/performer-assets/payloads';
import { ObjectId } from 'mongodb';
@Injectable()
export class ReactionService {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(REACT_MODEL_PROVIDER)
    private readonly reactionModel: Model<ReactionModel>,
    private readonly queueEventService: QueueEventService,
    private readonly userService: UserService,
    private readonly videoSearchService: VideoSearchService,
    private readonly gallerySearchService: GallerySearchService
  ) {}

  public async create(
    data: ReactionCreatePayload,
    user: UserDto
  ): Promise<ReactionDto> {
    const reaction = { ...data } as any;
    const existReact = await this.reactionModel.findOne({
      objectType: reaction.objectType,
      objectId: reaction.objectId,
      createdBy: user._id,
      action: reaction.action
    });
    if (existReact) {
      return existReact;
    }
    reaction.createdBy = user._id;
    reaction.createdAt = new Date();
    reaction.updatedAt = new Date();
    const newreaction = await this.reactionModel.create(reaction);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: REACTION_CHANNEL,
        eventName: EVENT.CREATED,
        data: new ReactionDto(newreaction)
      })
    );
    return newreaction;
  }

  public async remove(payload: ReactionCreatePayload, user: UserDto) {
    const reaction = await this.reactionModel.findOne({
      objectType: payload.objectType || REACTION_TYPE.VIDEO,
      objectId: payload.objectId,
      createdBy: user._id,
      action: payload.action
    });
    if (!reaction) {
      return false;
    }
    await reaction.remove();
    await this.queueEventService.publish(
      new QueueEvent({
        channel: REACTION_CHANNEL,
        eventName: EVENT.DELETED,
        data: new ReactionDto(reaction)
      })
    );
    return true;
  }

  public async search(
    req: ReactionSearchRequestPayload
  ): Promise<PageableData<ReactionDto>> {
    const query = {} as any;
    if (req.objectId) {
      query.objectId = req.objectId;
    }
    const sort = {
      createdAt: -1
    };
    const [data, total] = await Promise.all([
      this.reactionModel
        .find(query)
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.reactionModel.countDocuments(query)
    ]);
    const reactions = data.map((d) => new ReactionDto(d));
    const UIds = data.map((d) => d.createdBy);
    const [users, performers] = await Promise.all([
      UIds.length ? this.userService.findByIds(UIds) : [],
      UIds.length ? this.performerService.findByIds(UIds) : []
    ]);
    reactions.forEach((reaction: ReactionDto) => {
      const performer = performers.find(
        (p) => p._id.toString() === reaction.createdBy.toString()
      );
      const user = users.find(
        (u) => u._id.toString() === reaction.createdBy.toString()
      );
      // eslint-disable-next-line no-param-reassign
      reaction.creator = performer || user;
    });
    return {
      data: reactions,
      total
    };
  }

  public async getListVideos(req: ReactionSearchRequestPayload) {
    const query = {} as any;
    if (req.createdBy) query.createdBy = req.createdBy;
    if (req.action) query.action = req.action;
    query.objectType = REACTION_TYPE.VIDEO;

    const sort = {
      [req.sortBy || 'createdAt']: req.sort === 'desc' ? -1 : 1
    };
    const reactions = await this.reactionModel
      .find(query)
      .sort(sort)
      .limit(parseInt(req.limit as string, 10))
      .skip(parseInt(req.offset as string, 10));

    if (!reactions.length) {
      return {
        data: [],
        total: 0
      };
    }

    const ids = reactions.map((r) => r.objectId);
    const searchRequest = new VideoSearchRequest();
    searchRequest.ids = ids;
    searchRequest.limit = req.limit;
    searchRequest.offset = req.offset;
    return this.videoSearchService.userSearch(searchRequest);
  }

  public async getListGlleries(req: ReactionSearchRequestPayload) {
    const query = {} as any;
    if (req.createdBy) query.createdBy = req.createdBy;
    if (req.action) query.action = req.action;
    query.objectType =  REACTION_TYPE.GALLERY;

    const sort = {
      [req.sortBy || 'createdAt']: req.sort === 'desc' ? -1 : 1
    };
    const reactions = await this.reactionModel
      .find(query)
      .sort(sort)
      .limit(parseInt(req.limit as string))
      .skip(parseInt(req.offset as string));

    if (!reactions.length) {
      return {
        data: [],
        total: 0
      };
    }

    const ids = reactions.map(r => r.objectId);
    const searchRequest = new GallerySearchRequest();
    searchRequest.ids = ids;
    searchRequest.userId = req.createdBy;
    searchRequest.limit = req.limit;
    searchRequest.offset = req.offset;
    return this.gallerySearchService.userSearch(searchRequest);
  }

  public async checkExisting(objectId: string | ObjectId, userId: string | ObjectId, action: string, objectType: string) {
    return this.reactionModel.countDocuments({
      objectId, createdBy: userId, action, objectType
    });
  }
}
