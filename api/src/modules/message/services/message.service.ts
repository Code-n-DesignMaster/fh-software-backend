import {
  Injectable, Inject, ForbiddenException, HttpException, BadRequestException
} from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { QueueEventService, EntityNotFoundException } from 'src/kernel';
import { PerformerDto } from 'src/modules/performer/dtos';
import { UserDto } from 'src/modules/user/dtos';
import { FileDto } from 'src/modules/file';
import { FileService } from 'src/modules/file/services';
import { UserService } from 'src/modules/user/services';
import { PerformerService } from 'src/modules/performer/services';
import {
  MessageModel, IRecipient
} from '../models';
import { MESSAGE_MODEL_PROVIDER } from '../providers/message.provider';
import { MessageCreatePayload } from '../payloads/message-create.payload';
import { MESSAGE_CHANNEL, MESSAGE_EVENT, MESSAGE_PRIVATE_STREAM_CHANNEL, MESSAGE_TYPE, MESSAGE_PICKLIST_OPTION } from '../constants';
import { MessageDto } from '../dtos';
import { ConversationService } from './conversation.service';
import { MessageListRequest } from '../payloads/message-list.payload';
import { RecepientPayload } from '../payloads';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { CheckPaymentService } from 'src/modules/payment/services/check-payment.service';
import { GalleryService } from 'src/modules/performer-assets/services/gallery.service';
import { VideoSearchService } from 'src/modules/performer-assets/services/video-search.service';
import { PhotoService } from 'src/modules/performer-assets/services';



@Injectable()
export class MessageService {
  constructor(
    private readonly conversationService: ConversationService,
    @Inject(MESSAGE_MODEL_PROVIDER)
    private readonly messageModel: Model<MessageModel>,
    private readonly queueEventService: QueueEventService,
    private readonly fileService: FileService,
    private readonly userService: UserService,
    private readonly performerService: PerformerService,
    private readonly subscriptionService: SubscriptionService,
    private readonly checkPaymentService: CheckPaymentService,
    private readonly galleryService: GalleryService,
    private readonly videoSearchService: VideoSearchService,
    private readonly photoService: PhotoService
  ) { }

  public async createPrivateMessage(
    sender: IRecipient,
    recipient: IRecipient,
    payload: MessageCreatePayload
  ): Promise<MessageDto> {
    const conversation = await this.conversationService.createPrivateConversation(
      sender,
      recipient
    );

    const message = await this.messageModel.create({
      ...payload,
      senderId: sender.sourceId,
      senderSource: sender.source,
      conversationId: conversation._id
    });
    await message.save();

    const dto = new MessageDto(message);
    await this.queueEventService.publish({
      channel: MESSAGE_CHANNEL,
      eventName: MESSAGE_EVENT.CREATED,
      data: dto
    });
    return dto;
  }

  public async createPrivateFileMessage(
    sender: IRecipient,
    recipients: IRecipient[],
    file: FileDto,
    payload: MessageCreatePayload
  ): Promise<MessageDto> {
    if (!file) throw new HttpException('File is valid!', 400);
    if (file.type === 'message-video' && !file.isVideo()) {
      await this.fileService.removeIfNotHaveRef(file._id);
      throw new HttpException('Invalid video!', 400);
    }
    
    if (file.type === 'message-photo' && !file.isImage()) {
      await this.fileService.removeIfNotHaveRef(file._id);
      throw new HttpException('Invalid image!', 400);
    }
    let dto;
    let MessageDTOs = [];
    for(let i =0; i < recipients.length; i++){
      const conversation = await this.conversationService.createPrivateConversation(
        sender,
        recipients[i]
      );
     
      const message = await this.messageModel.create({
        ...payload,
        type: payload.type === MESSAGE_TYPE.SUBAUTO ? MESSAGE_TYPE.SUBAUTO : 'photo',
        senderId: sender.sourceId,
        fileId: file._id,
        senderSource: sender.source,
        conversationId: conversation._id,
        mimeType: file.mimeType
      });
      await message.save();

      dto = new MessageDto(message);
      if(payload.type === MESSAGE_TYPE.SUBAUTO){
        if (dto.mimeType && dto.mimeType.includes("image")) {
          dto.imageUrl = file.getUrl();
          dto.videoUrl = null;
        } else if (dto.mimeType && dto.mimeType.includes("video")) {               
          dto.videoUrl = file.getUrl();
          dto.imageUrl = null;
        }else{
          dto.videoUrl = null;
          dto.imageUrl = null;
        }
      }
      else{
       dto.imageUrl = file.getUrl();
      }
      
      const user = new UserDto({_id : recipients[i].sourceId});
      if ((dto.type && dto.type === MESSAGE_TYPE.PHOTO ) && (dto.mimeType && dto.mimeType === 'image')) {
        const gallery = await this.galleryService.findByIdInChat(dto.mediaId);
        dto.isSale = gallery.isSaleGallery ? gallery.isSaleGallery : false;
        if (gallery._id && gallery.isSaleGallery) {         
          const bought = await this.checkPaymentService.checkBoughtGallery(
            gallery,
            user
          );
          dto.isBought = bought ? true : false;
        }
        dto.price = gallery.price;
       
      }
      else if ((dto.type && dto.type === MESSAGE_TYPE.PHOTO) && (dto.mimeType && dto.mimeType === 'video')) {
        const video = await this.videoSearchService.findByIdInChat(dto.mediaId);
        dto.isSale = video.isSaleVideo ? video.isSaleVideo : false;
        if (video._id && video.isSaleVideo) {
          const bought = await this.checkPaymentService.checkBoughtVideo(
            video,
            user
          );
          dto.isBought = bought ? true : false;
        }
        dto.price = video.price;
       
      }
    
      
      MessageDTOs.push(dto);
    }
    
    await this.queueEventService.publish({
      channel: MESSAGE_CHANNEL,
      eventName: MESSAGE_EVENT.CREATED,
      data: MessageDTOs
    });

  
    return dto;
  }

  public async loadMessages(req: MessageListRequest, user: UserDto,  jwToken: string) {
    const conversation = await this.conversationService.findById(
      req.conversationId
    );
    if (!conversation) {
      throw new EntityNotFoundException();
    }

    const found = conversation.recipients.find(
      (recipient) => recipient.sourceId.toString() === user._id.toString()
    );
    if (!found) {
      throw new EntityNotFoundException();
    }

    const query = { conversationId: conversation._id };
    const [data, total] = await Promise.all([
      this.messageModel
        .find(query)
        .sort({ createdAt: -1 })
        .lean()
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.messageModel.countDocuments(query)
    ]);

    const fileIds = data.map((d) => d.fileId);
    const files = await this.fileService.findByIds(fileIds);
    const messages = data.map((m) => new MessageDto(m));
    messages.forEach((message) => {
      if (message.fileId) {
        const file = files.find((f) => f._id.toString() === message.fileId.toString());
        // eslint-disable-next-line no-param-reassign
        if (message.type === MESSAGE_TYPE.SUBAUTO) {
          if (message.mimeType && message.mimeType.includes("image")) {
            message.imageUrl = file ? file.getUrl() : null;
            message.videoUrl = null;
          } else if (message.mimeType && message.mimeType.includes("video")) {
            message.videoUrl = file ? file.getUrl() : null;
            message.imageUrl = null;
          }
        } 
        // else if (message.type === MESSAGE_TYPE.PHOTO) {
        //   if (message.mimeType && (message.mimeType.includes("image") || message.mimeType.includes("video"))) {
           
        //     message.imageUrl = file ? (jwToken ? `${file.getUrl()}?photoId=${file._id}&token=${jwToken}` : file.getUrl() || null) : null;
        //     message.videoUrl = null;
        //   }
        // }
        else {
          message.imageUrl = file ? file.getUrl() : null;
        }
      }
    });
    
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].fileId) {
        const file = files.find((f) => f._id.toString() === messages[i].fileId.toString());
        if(file){
        const photo = await this.photoService.findByFileId(file._id);
        const photoId = photo ? photo._id : null;
        messages[i].imageUrl = file ? (jwToken ? `${file.getUrl()}?photoId=${photoId}&token=${jwToken}` : file.getUrl() || null) : null;
        messages[i].videoUrl = null;
        }
      }
      if ((messages[i].type && messages[i].type === MESSAGE_TYPE.PHOTO ) && (messages[i].mimeType && messages[i].mimeType === 'image')) {
        const gallery = await this.galleryService.findByIdInChat(messages[i].mediaId);
        messages[i].isSale = gallery.isSaleGallery ? gallery.isSaleGallery : false;
        if (gallery._id && gallery.isSaleGallery) {
          const bought = await this.checkPaymentService.checkBoughtGallery(
            gallery,
            user
          );
          messages[i].isBought = bought ? true : false;
        }
        messages[i].price = gallery.price;
       
      }
      else if ((messages[i].type && messages[i].type === MESSAGE_TYPE.PHOTO) && (messages[i].mimeType && messages[i].mimeType === 'video')) {
        const video = await this.videoSearchService.findByIdInChat(messages[i].mediaId);
        messages[i].isSale = video.isSaleVideo ? video.isSaleVideo : false;
        if (video._id && video.isSaleVideo) {
          const bought = await this.checkPaymentService.checkBoughtVideo(
            video,
            user
          );
          messages[i].isBought = bought ? true : false;
        }
        messages[i].price = video.price;
       
      }
    }

    return {
      data: messages,
      total
    };
  }

  public async createPrivateMessageFromConversation(
    //conversationId: string | ObjectId,
    payload: MessageCreatePayload,
    sender: IRecipient,
    recepients: IRecipient[],
  ) {    
    let dto;
    let MessageDTOs = [];
    for(let i = 0; i < recepients.length; i++){
     const conversation =  await this.conversationService.getConversation(sender, recepients[i]);
      const message = await this.messageModel.create({
        ...payload,
        senderId: sender.sourceId,
        senderSource: sender.source,
        conversationId: conversation._id
      });
      await message.save();
      
      dto = new MessageDto(message);
      MessageDTOs.push(dto);
    }

    await this.queueEventService.publish({
      channel: MESSAGE_CHANNEL,
      eventName: MESSAGE_EVENT.CREATED,
      data: MessageDTOs
    });
  
    return dto;
  }

  public async loadPublicMessages(req: MessageListRequest) {
    const conversation = await this.conversationService.findById(
      req.conversationId
    );
    if (!conversation) {
      throw new EntityNotFoundException();
    }

    const query = { conversationId: conversation._id };
    const [data, total] = await Promise.all([
      this.messageModel
        .find(query)
        .sort({ createdAt: -1 })
        .lean()
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.messageModel.countDocuments(query)
    ]);

    const senderIds = data.map((d) => d.senderId);
    const [users, performers] = await Promise.all([
      senderIds.length ? this.userService.findByIds(senderIds) : [],
      senderIds.length ? this.performerService.findByIds(senderIds) : []
    ]);

    const messages = data.map((message) => {
      let user = null;
      user = users.find((u) => u._id.toString() === message.senderId.toString());
      if (!user) {
        user = performers.find(
          (p) => p._id.toString() === message.senderId.toString()
        );
      }

      return {
        ...message,
        senderInfo:
          user && user.roles && user.roles.includes('user')
            ? new UserDto(user).toResponse()
            : new PerformerDto(user).toResponse()
      };
    });

    return {
      data: messages.map((m) => new MessageDto(m)),
      total
    };
  }

  public async deleteMessage(messageId: string, user: UserDto) {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new EntityNotFoundException();
    }
    if (
      user.roles
      && !user.roles.includes('admin')
      && message.senderId.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException();
    }
    await message.remove();
    // Emit event to user
    await this.queueEventService.publish({
      channel: MESSAGE_PRIVATE_STREAM_CHANNEL,
      eventName: MESSAGE_EVENT.DELETED,
      data: new MessageDto(message)
    });
    return message;
  }

  public async createPublicStreamMessageFromConversation(
    conversationId: string | ObjectId,
    payload: MessageCreatePayload,
    sender: IRecipient,
    user: UserDto
  ) {
    const conversation = await this.conversationService.findById(
      conversationId
    );
    if (!conversation) {
      throw new EntityNotFoundException();
    }

    const message = await this.messageModel.create({
      ...payload,
      senderId: sender.sourceId,
      senderSource: sender.source,
      conversationId: conversation._id
    });
    await message.save();

    const dto = new MessageDto(message);
    dto.senderInfo = user;
    await this.queueEventService.publish({
      channel: MESSAGE_PRIVATE_STREAM_CHANNEL,
      eventName: MESSAGE_EVENT.CREATED,
      data: dto
    });
    return dto;
  }

  public async createStreamMessageFromConversation(
    conversationId: string | ObjectId,
    payload: MessageCreatePayload,
    sender: IRecipient
  ) {
    const conversation = await this.conversationService.findById(
      conversationId
    );
    if (!conversation) {
      throw new EntityNotFoundException();
    }

    const found = conversation.recipients.find(
      (recipient) => recipient.sourceId.toString() === sender.sourceId.toString()
    );
    if (!found) {
      throw new EntityNotFoundException();
    }

    const message = await this.messageModel.create({
      ...payload,
      senderId: sender.sourceId,
      senderSource: sender.source,
      conversationId: conversation._id
    });
    await message.save();

    const dto = new MessageDto(message);
    await this.queueEventService.publish({
      channel: MESSAGE_PRIVATE_STREAM_CHANNEL,
      eventName: MESSAGE_EVENT.CREATED,
      data: dto
    });
    return dto;
  }

  public async deleteAllMessageInConversation(
    conversationId: string,
    user: any
  ) {
    const conversation = await this.conversationService.findById(
      conversationId
    );
    if (!conversation) {
      throw new EntityNotFoundException();
    }
    if (
      user.isPerformer
      && conversation.performerId.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException();
    }

    await this.messageModel.deleteMany({ conversationId: conversation._id });
    return { success: true };
  }

  public async retrieveSubscriers(
    sender: IRecipient,
    picklistOption: string
  ): Promise<IRecipient[]> {
    let recepients = []; 
    let query = {} as any;
    if(picklistOption === MESSAGE_PICKLIST_OPTION.SUBSCRIBED_FREE){
      query = { performerId : sender.sourceId, subscriptionType: 'free' ,  expiredAt: { $gt: new Date() }};
    }else if(picklistOption === MESSAGE_PICKLIST_OPTION.SUBSCRIBED_PAID){
      query.subscriptionType = { $in : ['monthly', 'semiannual'] };
      query.performerId = sender.sourceId;
      query.expiredAt = { $gt: new Date() };
    }else if(picklistOption === MESSAGE_PICKLIST_OPTION.SUBSCRIBED_ALL){
      query = { performerId : sender.sourceId,  expiredAt: { $gt: new Date() }};
    }
    const subscriptions = await this.subscriptionService.findSubscriptionList(query);
    const UIds = subscriptions.map(s => s.userId);
    const [performers, users] = await Promise.all([
      this.performerService.findByIds(UIds) || [],
      this.userService.findByIds(UIds) || []
    ]);

    performers.forEach(v =>{
       recepients.push(
        {
          source: 'performer',
          sourceId: v._id
        }
       );
    });

    users.forEach(v =>{
      recepients.push(
       {
         source: 'user',
         sourceId: v._id
       }
      );
   });
   
    return recepients;
  }

  public async extractRecepients(
    req: any,
    picklistOption: string,
    recepientsPayload: RecepientPayload[]
  ): Promise<IRecipient[]> {
    let recepients =[];
    switch (picklistOption) {
      case MESSAGE_PICKLIST_OPTION.MUTIPLE_INDIVIDUAL:
       recepientsPayload.forEach(r => {
          if (req.authUser.sourceId.toString() === r.recipientId.toString()) {
            throw new ForbiddenException();
          }
          recepients.push({
            source: r.recipientType,
            sourceId: r.recipientId
          });
        });
        break;
      case MESSAGE_PICKLIST_OPTION.SUBSCRIBED_FREE:
        recepients = await this.retrieveSubscriers({
            source: req.authUser.source,
            sourceId: req.authUser.sourceId
          }, MESSAGE_PICKLIST_OPTION.SUBSCRIBED_FREE);
        break;
      case MESSAGE_PICKLIST_OPTION.SUBSCRIBED_PAID:
        recepients = await this.retrieveSubscriers({
          source: req.authUser.source,
          sourceId: req.authUser.sourceId
        }, MESSAGE_PICKLIST_OPTION.SUBSCRIBED_PAID);
        break;
      case MESSAGE_PICKLIST_OPTION.SUBSCRIBED_ALL:
        recepients = await this.retrieveSubscriers({
          source: req.authUser.source,
          sourceId: req.authUser.sourceId
        }, MESSAGE_PICKLIST_OPTION.SUBSCRIBED_ALL);
        break;
      default:
        throw new BadRequestException();
    }      
    return recepients;
  }

}
