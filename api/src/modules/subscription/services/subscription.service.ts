import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import {
  PageableData,
  QueueEventService,
  EntityNotFoundException,
  QueueEvent
} from 'src/kernel';
import { ObjectId } from 'mongodb';
import { UserService } from 'src/modules/user/services';
import { PerformerService } from 'src/modules/performer/services';
import { UserDto } from 'src/modules/user/dtos';
import { EVENT } from 'src/kernel/constants';
import { SubscriptionModel } from '../models/subscription.model';
import { SUBSCRIPTION_MODEL_PROVIDER } from '../providers/subscription.provider';
import {
  SubscriptionCreatePayload,
  SubscriptionSearchRequestPayload,
  FreeSubscriptionCreatePayload
} from '../payloads';
import { SubscriptionDto } from '../dtos/subscription.dto';
import {
  SUBSCRIPTION_TYPE,
  SUBSCRIPTION_STATUS,
  UPDATE_PERFORMER_SUBSCRIPTION_CHANNEL
} from '../constants';
import { toObjectId } from 'src/kernel/helpers/string.helper';

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(SUBSCRIPTION_MODEL_PROVIDER)
    private readonly subscriptionModel: Model<SubscriptionModel>,
    private readonly queueEventService: QueueEventService
  ) {}

  public async findSubscriptionList(query: any) {
    return this.subscriptionModel.find(query);
  }

  public async countSubscriptions(query: any) {
    return this.subscriptionModel.countDocuments(query);
  }

  public async userCreate(
    data: FreeSubscriptionCreatePayload
  ): Promise<SubscriptionDto> {
    const payload = { ...data } as any;
    const existSubscription = await this.subscriptionModel.findOne({
      subscriptionType: SUBSCRIPTION_TYPE.FREE,
      userId: payload.userId,
      performerId: payload.performerId
    });
    if (existSubscription) {
      existSubscription.updatedAt = new Date();
      await existSubscription.save();
      await this.queueEventService.publish(
        new QueueEvent({
          channel: UPDATE_PERFORMER_SUBSCRIPTION_CHANNEL,
          eventName: EVENT.CREATED,
          data: new SubscriptionDto(existSubscription)
        })
      );
      return new SubscriptionDto(existSubscription);
    }
    payload.createdAt = new Date();
    payload.updatedAt = new Date();
    payload.expiredAt = '';
    payload.startRecurringDate = '';
    payload.nextRecurringDate = '';
    const newSubscription = await this.subscriptionModel.create(payload);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: UPDATE_PERFORMER_SUBSCRIPTION_CHANNEL,
        eventName: EVENT.CREATED,
        data: new SubscriptionDto(newSubscription)
      })
    );
    return new SubscriptionDto(newSubscription);
  }

  public async adminCreate(
    data: SubscriptionCreatePayload
  ): Promise<SubscriptionDto> {
    const payload = { ...data } as any;
    const existSubscription = await this.subscriptionModel.findOne({
      subscriptionType: SUBSCRIPTION_TYPE.SYSTEM,
      userId: payload.userId,
      performerId: payload.performerId,
      expiredAt: payload.expiredAt
    });
    if (existSubscription) {
      existSubscription.expiredAt = new Date(payload.expiredAt);
      existSubscription.updatedAt = new Date();
      existSubscription.subscriptionType = payload.subscriptionType;
      await existSubscription.save();
      await this.queueEventService.publish(
        new QueueEvent({
          channel: UPDATE_PERFORMER_SUBSCRIPTION_CHANNEL,
          eventName: EVENT.CREATED,
          data: new SubscriptionDto(existSubscription)
        })
      );
      return new SubscriptionDto(existSubscription);
    }
    payload.createdAt = new Date();
    payload.updatedAt = new Date();
    const newSubscription = await this.subscriptionModel.create(payload);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: UPDATE_PERFORMER_SUBSCRIPTION_CHANNEL,
        eventName: EVENT.CREATED,
        data: new SubscriptionDto(newSubscription)
      })
    );
    return new SubscriptionDto(newSubscription);
  }

  public async adminSearch(
    req: SubscriptionSearchRequestPayload
  ): Promise<PageableData<SubscriptionDto>> {
    const query = {} as any;
    if (req.userId) {
      query.userId = req.userId;
    }
    if (req.performerId) {
      query.performerId = req.performerId;
    }
    if (req.subscriptionType) {
      query.subscriptionType = req.subscriptionType;
    }
    const sort = {
      createdAt: -1
    };
    const [data, total] = await Promise.all([
      this.subscriptionModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.subscriptionModel.countDocuments(query)
    ]);
    const subscriptions = data.map((d) => new SubscriptionDto(d));
    const UIds = data.map((d) => d.userId);
    const PIds = data.map((d) => d.performerId);
    const [users, performers] = await Promise.all([
      UIds.length ? this.userService.findByIds(UIds) : [],
      PIds.length ? this.performerService.findByIds(PIds) : []
    ]);
    subscriptions.forEach((subscription: SubscriptionDto) => {
      const performer = performers.find(
        (p) => p._id.toString() === subscription.performerId.toString()
      );
      const user = users.find(
        (u) => u._id.toString() === subscription.userId.toString()
      );
      // eslint-disable-next-line no-param-reassign
      subscription.userInfo = user || null;
      // eslint-disable-next-line no-param-reassign
      subscription.performerInfo = performer || null;
    });
    return {
      data: subscriptions,
      total
    };
  }

  public async performerSearch(
    req: SubscriptionSearchRequestPayload,
    user: UserDto
  ): Promise<PageableData<SubscriptionDto>> {
    const query = {
      performerId: user._id
    } as any;
    if (req.userId) {
      query.userId = req.userId;
    }
    if (req.subscriptionType) {
      query.subscriptionType = req.subscriptionType;
    }
    const sort = {
      createdAt: -1
    };
    const [data, total] = await Promise.all([
      this.subscriptionModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.subscriptionModel.countDocuments(query)
    ]);
    const subscriptions = data.map((d) => new SubscriptionDto(d));
    const UIds = data.map((d) => toObjectId(d.userId));
    const [users] = await Promise.all([
      UIds.length ? this.userService.findByIds(UIds) : []
      // UIds.length ? this.performerService.getBlockUserList({ performerId: user._id, userId: { $in: UIds } }) : []
    ]);
    const [performers] = await Promise.all([
      UIds.length ? this.performerService.findByIds(UIds) : []
      // UIds.length ? this.performerService.getBlockUserList({ performerId: user._id, userId: { $in: UIds } }) : []
    ]);
    subscriptions.forEach((subscription: SubscriptionDto) => {
      const userSearch = users.find(
        (u) => u._id.toString() === subscription.userId.toString()
      );
       // eslint-disable-next-line no-param-reassign
       subscription.userInfo = userSearch || null;

      const performerSearch = performers.find(
        (p) => p._id.toString() === subscription.userId.toString()
      );
       subscription.performerInfo = performerSearch || null;
    });
    return {
      data: subscriptions,
      total
    };
  }

  public async userSearch(
    req: SubscriptionSearchRequestPayload,
    user: UserDto
  ): Promise<PageableData<SubscriptionDto>> {
    const query = {
      userId: user._id
    } as any;
    if (req.performerId) {
      query.performerId = req.performerId;
    }
    if (req.subscriptionType) {
      query.subscriptionType = req.subscriptionType;
    }
    const sort = {
      createdAt: -1
    };
    const [data, total] = await Promise.all([
      this.subscriptionModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.subscriptionModel.countDocuments(query)
    ]);
    const subscriptions = data.map((d) => new SubscriptionDto(d));
    const UIds = data.map((d) => d.userId);
    const PIds = data.map((d) => d.performerId);
    const [users, performers] = await Promise.all([
      UIds.length ? this.userService.findByIds(UIds) : [],
      PIds.length ? this.performerService.findByIds(PIds) : []
    ]);
    subscriptions.forEach((subscription: SubscriptionDto) => {
      const performer = performers.find(
        (p) => p._id.toString() === subscription.performerId.toString()
      );
      const userSubscription = users.find(
        (u) => u._id.toString() === subscription.userId.toString()
      );
      // eslint-disable-next-line no-param-reassign
      subscription.userInfo = userSubscription || null;
      // eslint-disable-next-line no-param-reassign
      subscription.performerInfo = performer || null;
    });
    return {
      data: subscriptions,
      total
    };
  }

  public async checkSubscribed(
    performerId: string | ObjectId,
    userId: string | ObjectId
  ): Promise<any> {
    if (performerId.toString() === userId.toString()) {
      return 1;
    }
    return this.subscriptionModel.countDocuments({
      performerId,
      userId,
      expiredAt: { $gt: new Date() }
      //status: SUBSCRIPTION_STATUS.ACTIVE
    });
  }

  public async checkFreeSubscribed(
    performerId: string | ObjectId,
    userId: string | ObjectId
  ): Promise<any> {
    if (performerId.toString() === userId.toString()) {
      return 1;
    }
    return this.subscriptionModel.countDocuments({
      performerId,
      userId,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      subscriptionType: SUBSCRIPTION_TYPE.FREE
    });
  }

  public async findOneSubscription(
    performerId: string | ObjectId,
    userId: string | ObjectId
  ) {
    const subscription = await this.subscriptionModel.findOne({
      performerId,
      userId
    });
    return subscription;
  }

  public async findOneFreeSubscription(
    performerId: string | ObjectId,
    userId: string | ObjectId
  ) {
    const subscription = await this.subscriptionModel.findOne({
      performerId,
      userId,
      subscriptionType : SUBSCRIPTION_TYPE.FREE
    });
    return subscription;
  }

  public async performerTotalSubscriptions(performerId: string | ObjectId) {
    return this.subscriptionModel.countDocuments({ performerId, expiredAt: { $gt: new Date() } });
  }

  public async findById(id: string | ObjectId): Promise<SubscriptionModel> {
    const data = await this.subscriptionModel.findById(id);
    return data;
  }

  public async delete(id: string | ObjectId): Promise<boolean> {
    const subscription = await this.findById(id);
    if (!subscription) {
      throw new EntityNotFoundException();
    }
    await subscription.remove();
    await this.queueEventService.publish(
      new QueueEvent({
        channel: UPDATE_PERFORMER_SUBSCRIPTION_CHANNEL,
        eventName: EVENT.CREATED,
        data: new SubscriptionDto(subscription)
      })
    );
    return true;
  }
}
