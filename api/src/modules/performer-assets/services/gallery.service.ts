import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import {
  PERFORMER_GALLERY_MODEL_PROVIDER,
  PERFORMER_PHOTO_MODEL_PROVIDER
} from '../providers';
import { GalleryModel, PhotoModel } from '../models';
import { PerformerModel } from '../../performer/models';
import {
  EntityNotFoundException,
  PageableData,
  QueueEventService,
  StringHelper
} from 'src/kernel';
import { GalleryCreatePayload, GallerySearchRequest } from '../payloads';
import { PerformerService } from 'src/modules/performer/services';
import { UserDto } from 'src/modules/user/dtos';
import { GalleryDto,IGalleryResponse } from '../dtos';
import { ObjectId } from 'mongodb';
import { merge } from 'lodash';
import { GalleryUpdatePayload } from '../payloads/gallery-update.payload';
import { FileService } from 'src/modules/file/services';
import { PhotoService } from './photo.service';
import { ReactionService } from 'src/modules/reaction/services/reaction.service';
import { REACTION, REACTION_TYPE } from 'src/modules/reaction/constants';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { CheckPaymentService } from 'src/modules/payment/services/check-payment.service';
import { PERFORMER_MODEL_PROVIDER } from '../../performer/providers';

@Injectable()
export class GalleryService {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(PERFORMER_GALLERY_MODEL_PROVIDER)
    private readonly galleryModel: Model<GalleryModel>,
    @Inject(PERFORMER_MODEL_PROVIDER)
    private readonly performerModel: Model<PerformerModel>,
    // Circular dependency, cannot query
    @Inject(PERFORMER_PHOTO_MODEL_PROVIDER)
    private readonly photoModel: Model<PhotoModel>,
    private readonly fileService: FileService,
    private readonly checkPaymentService: CheckPaymentService,
    private readonly reactionService: ReactionService,
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => PhotoService))
    private readonly photoService: PhotoService
  ) {}

  public async create(
    payload: GalleryCreatePayload,
    creator?: UserDto
  ): Promise<GalleryDto> {
    if (payload.performerId) {
      const performer = await this.performerService.findById(
        payload.performerId
      );
      if (!performer) {
        throw new EntityNotFoundException('Performer not found!');
      }
    }

    // eslint-disable-next-line new-cap
    const model = new this.galleryModel(payload);
    model.createdAt = new Date();
    model.updatedAt = new Date();
    if (creator) {
      if (!model.performerId) {
        model.performerId = creator._id;
      }
      model.createdBy = creator._id;
      model.updatedBy = creator._id;
    }

    await model.save();
    await this.performerModel.updateOne(
      { _id: creator._id },
      {
        $inc: {
          'stats.totalGalleries': 1
        }
      }
    );
    return GalleryDto.fromModel(model);
  }

  public async update(
    id: string | ObjectId,
    payload: GalleryUpdatePayload,
    creator?: UserDto
  ): Promise<GalleryDto> {
    const gallery = await this.galleryModel.findById(id);
    const isUpdate = payload.status !== gallery.status;
    if (!gallery) {
      throw new EntityNotFoundException('Gallery not found!');
    }

    merge(gallery, payload);
    
    gallery.updatedAt = new Date();
    if (creator) {
      gallery.updatedBy = creator._id;
    }
    
    await gallery.save();
    if (isUpdate) {
      let increase = -1;
      if (payload.status === 'active') {
        increase = 1
      }
      await this.performerModel.updateOne(
        { _id: gallery.performerId },
        {
          $inc: {
            'stats.totalGalleries': increase
          }
        }
      );
    }
    return GalleryDto.fromModel(gallery);
  }

  public async findByIds(ids: string[] | ObjectId[]): Promise<GalleryDto[]> {
    const galleries = await this.galleryModel.find({
      _id: {
        $in: ids
      }
    });

    return galleries.map(g => new GalleryDto(g));
  }

  public async userGetDetails(
    galleryId: string | ObjectId,
    currentUser: UserDto,
    jwToken: string
  ): Promise<GalleryDto> {
    const gallery = await this.galleryModel.findById(galleryId);
    const photos = await this.photoModel.find( {galleryId: { $eq: galleryId} });
    const coverPhotoIds = photos.map(d => d._id);
   
    if (!gallery) throw new EntityNotFoundException();
    //const participantIds = gallery.participantIds.filter(p => StringHelper.isObjectId(p))
    const [
      performer,
      coverPhotos
      //galleryFile,
      //thumbnailFile,
      //participants
    ] = await Promise.all([
      this.performerService.findById(gallery.performerId),
      coverPhotoIds.length ? this.photoModel
      .find({ _id: { $in: coverPhotoIds } })
      .lean()
      .exec()
      :[]
      //this.fileService.findById(gallery.fileId),
      //gallery.thumbnailId ? this.fileService.findById(gallery.thumbnailId) : null,
      /*
      video.participantIds.length
        ? await this.performerService.findByIds(participantIds)
        : []
        */
    ]);

    // TODO - define interface or dto?
    const dto = new IGalleryResponse(gallery);
    dto.userReaction = await this.checkReaction(
      new GalleryDto(gallery),
      currentUser
    );
    const subscribed = await this.subscriptionService.checkSubscribed(
      dto.performerId,
      currentUser._id
    );
    dto.isSubscribed = subscribed ? true : false;
    const freeSubscribed = await this.subscriptionService.checkFreeSubscribed(
      dto.performerId,
      currentUser._id
    );
    dto.isFreeSubscribed = freeSubscribed? true : false;
    dto.subsribeSwitch = performer? performer.subsribeSwitch : true;
    dto.freeSubsribeSwitch = performer? performer.freeSubsribeSwitch : true;
    
    //dto.thumbnail = thumbnailFile ? thumbnailFile.getUrl() : null;
    // TODO check video for sale or subscriber
    if (!dto.isSaleGallery) {

      //dto.video = this.getVideoForView(videoFile, subscribed, dto, jwToken);
      //dto.isSubscribed = subscribed ? true : false;
      //dto.subsribeSwitch = performer? performer.subsribeSwitch : true;
    }
    if (dto.isSaleGallery) {
      const bought = await this.checkPaymentService.checkBoughtGallery(
        dto,
        currentUser
      );
      
      //dto.video = this.getVideoForView(videoFile, bought, dto, jwToken);
      dto.isBought = bought ? true : false;
      //dto.isSubscribed = subscribed ? true : false;
      //dto.subsribeSwitch = performer? performer.subsribeSwitch : true;
    }
    dto.performer = performer ? performer.toPublicDetailsResponse() : null;
    //dto.participants = participants.map(p => p.toSearchResponse());

    const fileIds = coverPhotos.map(c => c.fileId);
    const files = await this.fileService.findByIds(fileIds);
    if (gallery.coverPhotoId) {
      const coverPhoto = coverPhotos.find(
        c => c._id.toString() === gallery.coverPhotoId.toString()
      );
      if (coverPhoto) {
        const file = files.find(
          f => f._id.toString() === coverPhoto.fileId.toString()
        );
        if (file) {
          dto.coverPhoto = {
            url: file.getUrl(),
            thumbnails: file.getThumbnails()
          };
        }
      }
    }
    if(currentUser){
    dto.includeAdmin = currentUser.roles ? currentUser.roles.includes("admin") : false;
    }
    return dto;
  }

  private async checkReaction(gallery: GalleryDto, user: UserDto) {
    const [liked, favourited, watchedLater] = await Promise.all([
      this.reactionService.checkExisting(
        gallery._id,
        user._id,
        REACTION.LIKE,
        REACTION_TYPE.GALLERY
      ),
      this.reactionService.checkExisting(
        gallery._id,
        user._id,
        REACTION.FAVOURITE,
        REACTION_TYPE.GALLERY
      ),
      this.reactionService.checkExisting(
        gallery._id,
        user._id,
        REACTION.WATCH_LATER,
        REACTION_TYPE.GALLERY
      )
    ]);
    gallery.userReaction = {
      liked: liked ? true : false,
      favourited: favourited ? true : false,
      watchedLater: watchedLater ? true : false
    };
    return gallery.userReaction;
  }

  public async increaseView(id: string | ObjectId) {
    return await this.galleryModel.updateOne(
      { _id: id },
      {
        $inc: { 'stats.views': 1 }
      },
      { new: true }
    );
  }
  
    public async increaseComment(id: string | ObjectId, num = 1) {
    return await this.galleryModel.updateOne(
      { _id: id },
      {
        $inc: { 'stats.comments': num }
      },
      { new: true }
    );
  }
  
    public async increaseLike(id: string | ObjectId, num = 1) {
    await this.galleryModel.updateOne(
      { _id: id },
      {
        $inc: { 'stats.likes': num }
      },
      { new: true }
    );
  }
  
    public async increaseFavourite(id: string | ObjectId, num = 1) {
    await this.galleryModel.updateOne(
      { _id: id },
      {
        $inc: { 'stats.favourites': num }
      },
      { new: true }
    );
  }

  public async findById(id: string | ObjectId): Promise<GalleryDto> {
    const gallery = await this.galleryModel.findOne({ _id: id });
    if (!gallery) {
      throw new EntityNotFoundException();
    }
    return new GalleryDto(gallery);
  }

  public async findByIdInChat(id: string | ObjectId): Promise<GalleryDto> {
    const gallery = await this.galleryModel.findOne({ _id: id });
    return new GalleryDto(gallery);
  }

  public async details(id: string | ObjectId) {
    const gallery = await this.galleryModel.findOne({ _id: id });
    if (!gallery) {
      throw new EntityNotFoundException();
    }

    const dto = new GalleryDto(gallery);
    if (gallery.performerId) {
      const performer = await this.performerService.findById(
        gallery.performerId
      );
      if (performer) {
        dto.performer = {
          username: performer.username
        };
      }
    }

    return new GalleryDto(gallery);
  }

  public async adminSearch(
    req: GallerySearchRequest
  ): Promise<PageableData<GalleryDto>> {
    const query = {} as any;
    if (req.q) query.name = { $regex: req.q };
    if (req.performerId) query.performerId = req.performerId;
    if (req.status) query.status = req.status;
    let sort = {};
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.galleryModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.galleryModel.countDocuments(query)
    ]);

    const performerIds = data.map((d) => d.performerId);
    const galleries = data.map((g) => new GalleryDto(g));
    const coverPhotoIds = data.map((d) => d.coverPhotoId);

    const [performers, coverPhotos] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      coverPhotoIds.length
        ? this.photoModel
          .find({ _id: { $in: coverPhotoIds } })
          .lean()
          .exec()
        : []
    ]);
    const fileIds = coverPhotos.map((c) => c.fileId);
    const files = await this.fileService.findByIds(fileIds);

    galleries.forEach((g) => {
      // TODO - should get picture (thumbnail if have?)
      const performer = performers.find(
        (p) => p._id.toString() === g.performerId.toString()
      );
      if (performer) {
        // eslint-disable-next-line no-param-reassign
        g.performer = {
          username: performer.username
        };
      }
      if (g.coverPhotoId) {
        const coverPhoto = coverPhotos.find(
          (c) => c._id.toString() === g.coverPhotoId.toString()
        );
        if (coverPhoto) {
          const file = files.find(
            (f) => f._id.toString() === coverPhoto.fileId.toString()
          );
          if (file) {
            // eslint-disable-next-line no-param-reassign
            g.coverPhoto = {
              url: file.getUrl(),
              thumbnails: file.getThumbnails()
            };
          }
        }
      }
    });

    return {
      data: galleries,
      total
    };
  }

  public async performerSearch(
    req: GallerySearchRequest,
    user: UserDto,
    jwToken: string
  ): Promise<PageableData<GalleryDto>> {
    const query = {} as any;
    if (req.q) query.name = { $regex: req.q };
    query.performerId = user._id;
    if (req.status) query.status = req.status;
    let sort = {};
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }

    if(req.isPrivateChat){
      query.isPrivateChat = req.isPrivateChat;
    }
    const [data, total] = await Promise.all([
      this.galleryModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.galleryModel.countDocuments(query)
    ]);

    const performerIds = data.map((d) => d.performerId);
    const galleries = data.map((g) => new GalleryDto(g));
    const coverPhotoIds = data.map((d) => d.coverPhotoId);

    const [performers, coverPhotos] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      coverPhotoIds.length
        ? this.photoModel
            .find({ _id: { $in: coverPhotoIds } })
            .lean()
            .exec()
        : []
    ]);
    const fileIds = coverPhotos.map((c) => c.fileId);
    const files = await this.fileService.findByIds(fileIds);

    galleries.forEach((g) => {
      // TODO - should get picture (thumbnail if have?)
      const performer = performers.find(
        (p) => p._id.toString() === g.performerId.toString()
      );
      if (performer) {
        // eslint-disable-next-line no-param-reassign
        g.performer = {
          username: performer.username
        };
      }   
      if (g.coverPhotoId) {
        const coverPhoto = coverPhotos.find(
          (c) => c._id.toString() === g.coverPhotoId.toString()
        );
        if (coverPhoto) {
          const file = files.find(
            (f) => f._id.toString() === coverPhoto.fileId.toString()
          );
          if (file) {
            // eslint-disable-next-line no-param-reassign
            g.coverPhoto = {
              url: jwToken ? `${file.getUrl()}?photoId=${coverPhoto._id}&token=${jwToken}` : file.getUrl() || null,
              thumbnails: file.getThumbnails(),
              coverPhotoId: file._id
            };
          }
        }
      }
    });

    return {
      data: galleries,
      total
    };
  }

  public async userSearch(
    req: GallerySearchRequest,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    user?: UserDto
  ): Promise<PageableData<GalleryDto>> {
    const query = {} as any;
    if (req.q) query.name = { $regex: req.q };
    if (req.performerId) query.performerId = req.performerId;
    if (req.excludedId) query._id = { $ne: req.excludedId };
    query.status = 'active';
    let sort = {};
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    if(req.isPrivateChat){
      query.isPrivateChat = req.isPrivateChat;
    }
    else{
      query.isPrivateChat = {$ne : true}
    }
    const [data, total] = await Promise.all([
      this.galleryModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.galleryModel.countDocuments(query)
    ]);

    const performerIds = data.map((d) => d.performerId);
    const galleries = data.map((g) => new GalleryDto(g));
    const coverPhotoIds = data.map((d) => d.coverPhotoId);

    const [performers, coverPhotos] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      coverPhotoIds.length
        ? this.photoModel
            .find({ _id: { $in: coverPhotoIds } })
            .lean()
            .exec()
        : []
    ]);
    const fileIds = coverPhotos.map((c) => c.fileId);
    const files = await this.fileService.findByIds(fileIds);

    galleries.forEach((g) => {
      // TODO - should get picture (thumbnail if have?)
      const performer = performers.find(
        (p) => p._id.toString() === g.performerId.toString()
      );
      if (performer) {
        // eslint-disable-next-line no-param-reassign
        g.performer = {
          username: performer.username
        };
      }
      if (g.coverPhotoId) {
        const coverPhoto = coverPhotos.find(
          (c) => c._id.toString() === g.coverPhotoId.toString()
        );
        if (coverPhoto) {
          const file = files.find(
            (f) => f._id.toString() === coverPhoto.fileId.toString()
          );
          if (file) {
            // eslint-disable-next-line no-param-reassign
            g.coverPhoto = {
              url: file.getUrl(),
              thumbnails: file.getThumbnails()
            };
          }
        }
      }
    });
    if (req.userId) {
      user = new UserDto(user);
      user._id =  ObjectId.isValid(req.userId) ? new ObjectId(req.userId): new ObjectId();
      for (let i = 0; i < galleries.length; i++) {
        if (galleries[i].isSaleGallery) {
          const bought = await this.checkPaymentService.checkBoughtGallery(
            galleries[i],
            user
          );
          galleries[i].isBought = bought ? true : false;
        }
      }
    }

    return {
      data: galleries,
      total
    };
  }

  public async updateCover(
    galleryId: string | ObjectId,
    photoId: ObjectId
  ): Promise<boolean> {
    await this.galleryModel.updateOne(
      { _id: galleryId },
      {
        coverPhotoId: photoId
      }
    );
    return true;
  }

  public async delete(id: string | ObjectId) {
    const gallery = await this.galleryModel.findById(id);
    if (!gallery) {
      throw new EntityNotFoundException();
    }
    await gallery.remove();
    await this.photoService.deleteByGallery(gallery._id);
    await this.performerModel.updateOne(
      { _id: gallery.performerId },
      {
        $inc: {
          'stats.totalGalleries': -1
        }
      }
    );
    return true;
  }

  public async updateNumOfItems(id: string | ObjectId, num = 1) {
    const gallery = await this.galleryModel.findById(id);
    if (!gallery) {
      return;
    }
    await this.galleryModel.updateOne(
      { _id: gallery._id },
      {
        $inc: {
          numOfItems: num,
        }
      }
    );
  }
}
