import { Injectable, Inject } from '@nestjs/common';
import { EntityNotFoundException } from 'src/kernel';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { toObjectId } from 'src/kernel/helpers/string.helper';
import { UserSearchService, UserService } from 'src/modules/user/services';
import { PerformerService, PerformerSearchService } from 'src/modules/performer/services';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { UserDto } from 'src/modules/user/dtos';
import { PerformerDto } from 'src/modules/performer/dtos';
import { SUBSCRIPTION_STATUS } from 'src/modules/subscription/constants';
// import { StreamDto } from 'src/modules/stream/dtos';
import { PerformerSearchPayload } from 'src/modules/performer/payloads';
import { UserSearchRequestPayload } from 'src/modules/user/payloads';
import { ConversationSearchPayload } from '../payloads';
import { ConversationDto } from '../dtos';
import { CONVERSATION_TYPE } from '../constants';
import { ConversationModel, NotificationMessageModel } from '../models';
import {
  CONVERSATION_MODEL_PROVIDER,
  NOTIFICATION_MESSAGE_MODEL_PROVIDER
} from '../providers';
import { CheckPaymentService } from 'src/modules/payment/services/check-payment.service';
import { BLOCKED_BY_PERFORMER_PROVIDER } from 'src/modules/performer/providers';
import { BlockedByPerformerModel } from 'src/modules/performer/models';
export interface IRecipient {
  source: string;
  sourceId: ObjectId;
}

@Injectable()
export class ConversationService {
  constructor(
    @Inject(CONVERSATION_MODEL_PROVIDER)
    private readonly conversationModel: Model<ConversationModel>,
    private readonly userService: UserService,
    private readonly userSearchService: UserSearchService,
    private readonly performerService: PerformerService,
    private readonly performerSearchService: PerformerSearchService,
    private readonly subscriptionService: SubscriptionService,
    private readonly checkPaymentService: CheckPaymentService,
    @Inject(NOTIFICATION_MESSAGE_MODEL_PROVIDER)
    private readonly notiticationMessageModel: Model<NotificationMessageModel> ,
    @Inject(BLOCKED_BY_PERFORMER_PROVIDER)
    private readonly blockedByPerformerModel: Model<BlockedByPerformerModel> 
  ) {}

  public async findOne(params): Promise<ConversationModel> {
    return this.conversationModel.findOne(params);
  }

  public async createStreamConversation(stream: any, recipients?: any) {
    return this.conversationModel.create({
      streamId: stream._id,
      performerId: stream.performerId && toObjectId(stream.performerId),
      recipients: recipients || [],
      name: `stream_${stream.type}_performerId_${stream.performerId}`,
      type: `stream_${stream.type}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  public async createPrivateConversation(
    sender: IRecipient,
    receiver: IRecipient
  ): Promise<ConversationDto> {
    let conversation = await this.conversationModel
      .findOne({
        type: CONVERSATION_TYPE.PRIVATE,
        recipients: {
          $all: [
            {
              source: sender.source,
              sourceId: toObjectId(sender.sourceId)
            },
            {
              source: receiver.source,
              sourceId: toObjectId(receiver.sourceId)
            }
          ]
        }
      })
      .lean()
      .exec();
    if (!conversation) {
      conversation = await this.conversationModel
      .findOne({
        type: CONVERSATION_TYPE.PRIVATE,
        recipients: {
          $not: {
            $elemMatch: {
              sourceId: {$nin: [toObjectId(sender.sourceId), toObjectId(receiver.sourceId)] }
            }
          }
        }
      })
      .lean()
      .exec();
      if (!conversation) {
      conversation = await this.conversationModel.create({
        type: CONVERSATION_TYPE.PRIVATE,
        recipients: [sender, receiver],
        createdAt: new Date(),
        updatedAt: new Date()
      });
     }
    }
    
    // TODO - define DTO?
    const dto = new ConversationDto(conversation);
    let  per;
    dto.totalNotSeenMessages = 0;
    if (receiver.source === 'performer') {
      per = await this.performerService.findById(receiver.sourceId);
      if (per) {
        dto.recipientInfo = new PerformerDto(per).toResponse(false);
        const subscribed = await this.subscriptionService.checkSubscribed(
          per._id,
          sender.sourceId
        );
        dto.isSubscribed = !!subscribed;
        const isBlocked = await  this.blockedByPerformerModel.countDocuments({performerId : toObjectId(receiver.sourceId), userId : toObjectId(sender.sourceId)});
        isBlocked ?  dto.isBlocked = true : dto.isBlocked = false;
        dto.enableChat = per.enableChat;
        dto.tipAmount = per.tipAmount;  
      }
    }
    if (receiver.source === 'user') {
      per = await this.performerService.findById(sender.sourceId);
      if(per){
        dto.enableChat = per.enableChat;
        dto.tipAmount = per.tipAmount;
      }
      dto.isSubscribed = true;
      const isBlocked = await  this.blockedByPerformerModel.countDocuments({performerId : toObjectId(sender.sourceId), userId : toObjectId(receiver.sourceId)});
      isBlocked ?  dto.isBlocked = true : dto.isBlocked = false;
      const user = await this.userService.findById(receiver.sourceId);
      if (user) dto.recipientInfo = new UserDto(user).toResponse(false);
    }
    return dto;
  }

  public async getConversation(
    sender: IRecipient,
    recepient: IRecipient
  ): Promise<any> {
      let query = {
        recipients: {
          $not: {
            $elemMatch: {
              sourceId: {$nin: [toObjectId(sender.sourceId), toObjectId(recepient.sourceId)] }
            }
          }
        }
      } as any;


      const conversation = await this.conversationModel.findOne(query).lean().exec();
      
      if (!conversation) {
        throw new EntityNotFoundException();
      }
      
      const found = conversation.recipients.find(
        (recipient) => recipient.sourceId.toString() === sender.sourceId.toString()
      );
      if (!found) {
        throw new EntityNotFoundException();
      }
    
      return conversation;
  }

  public async getList(
    req: ConversationSearchPayload,
    sender: IRecipient
  ): Promise<any> {
    let query = {
      recipients: {
        $elemMatch: {
          source: { $in: ['user', 'performer'] },
          sourceId: toObjectId(sender.sourceId)
        }
      }
    } as any;
    // must be the first
    if (req.keyword) {
      let usersSearch = null;
      if (sender.source === 'user') {
        usersSearch = await this.performerSearchService.searchByKeyword({ q: req.keyword } as PerformerSearchPayload);
      }
      if (sender.source === 'performer') {
        usersSearch = await this.userSearchService.searchByKeyword({ q: req.keyword } as UserSearchRequestPayload);
      }
      const Ids = usersSearch ? usersSearch.map((u) => u._id) : [];
      query = {
        $and: [{
          recipients: {
            $elemMatch: {
              source: sender.source === 'user' ? 'performer' : 'user',
              sourceId: { $in: Ids }
            }
          }
        },
        {
          recipients: {
            $elemMatch: {
              source: sender.source,
              sourceId: toObjectId(sender.sourceId)
            }
          }
        }]
      };
    }
  
    if (req.type) {
      query.type = req.type;
    }
    
    const [data, total] = await Promise.all([
      this.conversationModel
        .find(query)
        .lean()
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10))
        .sort({ lastMessageCreatedAt: -1, updatedAt: -1 }),
      this.conversationModel.countDocuments(query)
    ]);

    // find recipient info
    const conversations = data.map((d) => new ConversationDto(d));
    const recipientIds = conversations.map((c) => {
      const re = c.recipients.find(
        (rep) => rep.sourceId.toString() !== sender.sourceId.toString()
      );
      if (re) {
        return toObjectId(re.sourceId);
      }
      return undefined;
    });
    const conversationIds = data.map((d) => d._id);
    let users = [];
    let performers = [];
    let subscriptions = [];
    const notifications = conversationIds.length
      ? await this.notiticationMessageModel.find({
        conversationId: { $in: conversationIds }
      })
      : [];
    if (sender.source === 'user') {
      performers = recipientIds.length
        ? await this.performerService.findByIds(recipientIds)
        : [];
      if (performers.length) {
        const pIds = performers.map((p) => p._id);
        subscriptions = await this.subscriptionService.findSubscriptionList({
          performerId: { $in: pIds },
          userId: sender.sourceId,
          expiredAt: { $gt: new Date() }
          //status: SUBSCRIPTION_STATUS.ACTIVE
        });
      }
    }
    if (sender.source === 'performer') {
        users = recipientIds.length
        ? await this.userService.findByIds(recipientIds)
        : [];

        performers = recipientIds.length
        ? await this.performerService.findByIds(recipientIds)
        : []; 

    }

    conversations.forEach((conversation: ConversationDto) => {
      const recipient = conversation.recipients.find(
        (rep) => rep.sourceId.toString() !== sender.sourceId.toString()
      );
      let recipientInfo = null;
      if (recipient) {
        // eslint-disable-next-line no-param-reassign
        conversation.isSubscribed = sender.source === 'performer';
        if (users.length) {
          recipientInfo = users.find(
            (u) => u._id.toString() === recipient.sourceId.toString()
          );
          if (recipientInfo) {
            // eslint-disable-next-line no-param-reassign
            conversation.recipientInfo = new UserDto(recipientInfo).toResponse(
              false
            );
            if (subscriptions.length && sender.source === 'user') {
              const subscribed = subscriptions.filter(
                (sub) => sub.performerId.toString() === recipient.sourceId.toString()
                  && sub.userId.toString() === sender.sourceId.toString()
              );
              if (subscribed.length) {
                // eslint-disable-next-line no-param-reassign
                conversation.isSubscribed = true;
              }
            }
          }
        }
        if (performers.length) {
          recipientInfo = performers.find(
            (p) => p._id.toString() === recipient.sourceId.toString()
          );
          if (recipientInfo) {
            // eslint-disable-next-line no-param-reassign
            conversation.recipientInfo = new UserDto(recipientInfo).toResponse(
              false
            );
            if (subscriptions.length && sender.source === 'user') {
              const subscribed = subscriptions.filter(
                (sub) => sub.performerId.toString() === recipient.sourceId.toString()
                  && sub.userId.toString() === sender.sourceId.toString()
              );
              if (subscribed.length) {
                // eslint-disable-next-line no-param-reassign
                conversation.isSubscribed = true;
              }
            }
          }
        }
       
        // eslint-disable-next-line no-param-reassign
        conversation.totalNotSeenMessages = 0;
        if (notifications.length) {
          const conversationNotifications = notifications.filter(
            (noti) => noti.conversationId.toString() === conversation._id.toString()
          );
          if (conversationNotifications) {
            const recipientNoti = conversationNotifications.find(
              (c) => c.recipientId.toString() === sender.sourceId.toString()
            );
            // eslint-disable-next-line no-param-reassign
            conversation.totalNotSeenMessages = recipientNoti
              ? recipientNoti.totalNotReadMessage
              : 0;
          }
        }
      }
    });

    for(let i =0; i < conversations.length; i++){
      let  performer, user;
      
      if (conversations[i].recipients) {
        if (conversations[i].recipients[0].source === 'performer' && conversations[i].recipients[1].source === 'performer') {
          user  = conversations[i].recipients[0].sourceId;
          performer = conversations[i].recipients[1].sourceId;
        }
        else {
          conversations[i].recipients.forEach(r => {
            if (r.source === 'user') {
              user = r.sourceId;
            } else if (r.source === 'performer') {
              performer = r.sourceId;
            }
          }
        );
      }
      const isBlocked = await  this.blockedByPerformerModel.countDocuments({performerId : toObjectId(performer), userId : toObjectId(user)});
      isBlocked ?  conversations[i].isBlocked = true : conversations[i].isBlocked = false;
      const count = await this.checkPaymentService.checkTipPerformer(
          performer,
          user
        );
        conversations[i].hasSentTip = count >= 1? true : false;
      }
            
      const per = await this.performerService.findById(performer);
      if(per){
      conversations[i].enableChat = per.enableChat;
      conversations[i].tipAmount = per.tipAmount;
      }
    }
    
    return {
      data: conversations,
      total
    };
  }

  public async findById(id: string | ObjectId) {
    return this.conversationModel
      .findOne({
        // type: CONVERSATION_TYPE.PRIVATE,
        _id: id
      })
      .lean()
      .exec();
  }

  public async findPerformerPublicConversation(performerId: string | ObjectId) {
    return this.conversationModel
      .findOne({
        type: `stream_${CONVERSATION_TYPE.PUBLIC}`,
        performerId
      })
      .lean()
      .exec();
  }

  public async getPrivateConversationByStreamId(streamId: string | ObjectId) {
    const conversation = await this.conversationModel.findOne({ streamId });
    if (!conversation) {
      throw new EntityNotFoundException();
    }
    return new ConversationDto(conversation);
  }

  public async addRecipient(
    conversationId: string | ObjectId,
    recipient: IRecipient
  ) {
    return this.conversationModel.updateOne({ _id: conversationId }, { $addToSet: { recipients: recipient } });
  }
}
