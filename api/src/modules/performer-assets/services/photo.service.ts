/* eslint-disable no-console */
import {
  Injectable, Inject, forwardRef, HttpException
} from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import {
  QueueEventService, QueueEvent, EntityNotFoundException,
  ForbiddenException, AgendaService
} from 'src/kernel';
import { FileDto } from 'src/modules/file';
import { UserDto } from 'src/modules/user/dtos';
import { FileService, FILE_EVENT } from 'src/modules/file/services';
import { merge, difference } from 'lodash';
import { PerformerService } from 'src/modules/performer/services';
import { EVENT, STATUS } from 'src/kernel/constants';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { REF_TYPE } from 'src/modules/file/constants';
import { PHOTO_STATUS } from '../constants';
import { PhotoDto, GalleryDto } from '../dtos';
import { PhotoCreatePayload, PhotoUpdatePayload } from '../payloads';
import { GalleryService } from './gallery.service';

import { PhotoModel } from '../models';
import { PERFORMER_PHOTO_MODEL_PROVIDER } from '../providers';
import { CheckPaymentService } from 'src/modules/payment/services';
import { toObjectId } from 'src/kernel/helpers/string.helper';
export const PERFORMER_PHOTO_CHANNEL = 'PERFORMER_PHOTO_CHANNEL';
export const PERFORMER_COVER_GALLERY_CHANNEL = 'PERFORMER_COVER_GALLERY_CHANNEL';
const FILE_PROCESSED_TOPIC = 'FILE_PROCESSED';
const UPDATE_DEFAULT_COVER_GALLERY = 'UPDATE_DEFAULT_COVER_GALLERY';
const DELETE_DEFAULT_COVER_GALLERY = 'DELETE_DEFAULT_COVER_GALLERY';
const CHECK_REF_REMOVE_PHOTO_AGENDA = 'CHECK_REF_REMOVE_PHOTO_AGENDA';

@Injectable()
export class PhotoService {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(PERFORMER_PHOTO_MODEL_PROVIDER)
    private readonly photoModel: Model<PhotoModel>,
    private readonly queueEventService: QueueEventService,
    private readonly fileService: FileService,
    private readonly subscriptionService: SubscriptionService,
    private readonly agenda: AgendaService,
    @Inject(forwardRef(() => GalleryService))
    private readonly galleryService: GalleryService,
    @Inject(forwardRef(() => CheckPaymentService))
    private readonly checkPaymentService: CheckPaymentService
  ) {
    this.queueEventService.subscribe(
      PERFORMER_PHOTO_CHANNEL,
      FILE_PROCESSED_TOPIC,
      this.handleFileProcessed.bind(this)
    );

    this.queueEventService.subscribe(
      PERFORMER_PHOTO_CHANNEL,
      UPDATE_DEFAULT_COVER_GALLERY,
      this.handleDefaultCoverGallery.bind(this)
    );

    this.queueEventService.subscribe(
      PERFORMER_COVER_GALLERY_CHANNEL,
      DELETE_DEFAULT_COVER_GALLERY,
      this.handleDefaultCoverGalleryByDelete.bind(this)
    );
    

    this.agenda.define(CHECK_REF_REMOVE_PHOTO_AGENDA, { }, this.checkRefAndRemoveFile.bind(this));
    this.agenda.every('24 hours', CHECK_REF_REMOVE_PHOTO_AGENDA, {});
  }

  private async checkRefAndRemoveFile(job: any, done: any): Promise<void> {
    try {
      const files = await this.fileService.findByRefType(REF_TYPE.PHOTO);
      const photoIds = files.map((f) => f.refItems[0].itemId.toString());
      const photos = await this.photoModel.find({ _id: { $in: photoIds } });
      const Ids = photos.map((v) => v._id.toString());
      const difIds = difference(photoIds, Ids);
      const difFileIds = files.filter((file) => difIds.includes(file.refItems[0].itemId.toString()));
      difFileIds.forEach(async (fileId) => {
        await this.fileService.remove(fileId);
      });
    } catch (e) {
      console.log('Check ref & remove files error', e);
    } finally {
      done();
    }
  }

  public async handleFileProcessed(event: QueueEvent) {
    try {
      if (event.eventName !== FILE_EVENT.PHOTO_PROCESSED) return;

      const { photoId } = event.data.meta;
      const [photo, file] = await Promise.all([
        this.photoModel.findById(photoId),
        this.fileService.findById(event.data.fileId)
      ]);
      if (!photo) {
        // TODO - delete file?
        await this.fileService.remove(event.data.fileId);
        return;
      }
      photo.processing = false;
      if (file.status === 'error') {
        photo.status = PHOTO_STATUS.FILE_ERROR;
      }
      await photo.save();
    } catch (e) {
      // TODO - log me
    }
  }

  private async handleDefaultCoverGalleryByDelete(event: QueueEvent) {
    if (![EVENT.DELETED].includes(event.eventName)) {
      return;
    }
   
    const photo = event.data as PhotoDto;
    if (!photo.galleryId) return;
    const defaultCover = await this.photoModel.findOne({
      galleryId : photo.galleryId,
      _id : {$ne: photo._id }
    }).sort({createdBy : -1});
    
    await this.galleryService.updateCover(photo.galleryId, defaultCover ? defaultCover._id : null);

    // update cover field in the photo list
    const photoCover = await this.photoModel.findOne({
      galleryId: photo.galleryId,
      isGalleryCover: true
    });
    if (!defaultCover || (photoCover && photoCover._id.toString() === defaultCover.toString())) return;
    await this.photoModel.updateOne(
      { _id: defaultCover._id },
      {
        isGalleryCover: true
      }
    );
  }

  private async handleDefaultCoverGallery(event: QueueEvent) {
    if (![EVENT.CREATED, EVENT.UPDATED].includes(event.eventName)) {
      return;
    }

    const photo = event.data as PhotoDto;
    if (!photo.galleryId) return;
    
    const defaultCover = await this.photoModel.findOne({
      galleryId: photo.galleryId,
      status: PHOTO_STATUS.ACTIVE
    });
    await this.galleryService.updateCover(photo.galleryId, defaultCover ? defaultCover._id : null);

    // update cover field in the photo list
    const photoCover = await this.photoModel.findOne({
      galleryId: photo.galleryId,
      isGalleryCover: true
    });
    if (!defaultCover || (photoCover && photoCover._id.toString() === defaultCover.toString())) return;
    await this.photoModel.updateOne(
      { _id: defaultCover._id },
      {
        isGalleryCover: true
      }
    );
  }

  public async create(file: FileDto, payload: PhotoCreatePayload, creator?: UserDto): Promise<PhotoDto> {
    if (!file) throw new HttpException('File is valid!', 400);
    if (!file.isImage()) {
      await this.fileService.removeIfNotHaveRef(file._id);
      throw new HttpException('Invalid image!', 400);
    }

    // process to create thumbnails
    // eslint-disable-next-line new-cap
    const photo = new this.photoModel(payload);
    if (!photo.title) photo.title = file.name;

    photo.fileId = file._id;
    photo.createdAt = new Date();
    photo.updatedAt = new Date();
    if (creator) {
      if (!photo.performerId) {
        photo.performerId = creator._id;
      }
      photo.createdBy = creator._id;
      photo.updatedBy = creator._id;
    }
    photo.processing = true;
    await photo.save();
    await Promise.all([
      this.fileService.addRef(file._id, {
        itemType: REF_TYPE.PHOTO,
        itemId: photo._id
      }),
      this.fileService.queueProcessPhoto(file._id, {
        meta: {
          photoId: photo._id
        },
        publishChannel: PERFORMER_PHOTO_CHANNEL,
        thumbnailSize: {
          width: 250,
          height: 250
        }
      })
    ]);

    const dto = new PhotoDto(photo);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_PHOTO_CHANNEL,
        eventName: EVENT.CREATED,
        data: dto
      })
    );
    if (photo.galleryId) {
      await this.galleryService.updateNumOfItems(photo.galleryId, 1)
    }
    return dto;
  }

  public async updateInfo(id: string | ObjectId, payload: PhotoUpdatePayload, updater?: UserDto): Promise<PhotoDto> {
    const photo = await this.photoModel.findById(id);
    if (!photo) {
      throw new EntityNotFoundException();
    }

    const oldStatus = photo.status;

    merge(photo, payload);
    if (photo.status !== PHOTO_STATUS.FILE_ERROR && payload.status !== PHOTO_STATUS.FILE_ERROR) {
      photo.status = payload.status;
    }
    updater && photo.set('updatedBy', updater._id);
    photo.updatedAt = new Date();
    await photo.save();
    const dto = new PhotoDto(photo);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_PHOTO_CHANNEL,
        eventName: EVENT.UPDATED,
        data: {
          ...dto,
          oldStatus
        }
      })
    );
    if (oldStatus !== payload.status && photo.galleryId) {
      if (payload.status === STATUS.ACTIVE) {
        await this.galleryService.updateNumOfItems(photo.galleryId, 1)
      } else {
        await this.galleryService.updateNumOfItems(photo.galleryId, -1)
      }
    }
    return dto;
  }

  public async updatePhotoPosition(item: PhotoUpdatePayload, updater: UserDto): Promise<PhotoDto> {
    const photo = await this.photoModel.findById(item._id);
    if (!photo) {
      throw new EntityNotFoundException();
    }

    await this.photoModel.updateOne(
      { _id: photo._id },
      {
        $set: {
        position: item.position,
        updatedAt: new Date(),
         updatedBy: updater._id
        }
      }
    );

    const dto = new PhotoDto(photo);
    
    return dto;
  }

  public async updateCover(id: string | ObjectId): Promise<PhotoDto> {
    const photo = await this.photoModel.findById(id);
    if (!photo) {
      throw new EntityNotFoundException();
    }

    await this.galleryService.updateCover(photo.galleryId, toObjectId(photo.id));
    // update cover field in the photo list
    const photoCover = await this.photoModel.findOne({
      galleryId: photo.galleryId,
      isGalleryCover: true
    });
    await this.photoModel.updateOne(
      { _id: photoCover._id },
      {
        isGalleryCover: false
      }
    );
    await this.photoModel.updateOne(
      { _id: photo._id },
      {
        isGalleryCover: true
      }
    );

    const dto = new PhotoDto(photo);
    
    return dto;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async details(id: string | ObjectId, userDto?: UserDto,  jwToken?: string): Promise<PhotoDto> {
    const photo = await this.photoModel.findOne({ _id: id });
    if (!photo) {
      throw new EntityNotFoundException();
    }

    const dto = new PhotoDto(photo);
    if(userDto && jwToken){
    const [performer, gallery, file] = await Promise.all([
      photo.performerId ? this.performerService.findById(photo.performerId) : null,
      photo.galleryId ? this.galleryService.findById(photo.galleryId) : null,
      photo.fileId ? this.fileService.findById(photo.fileId) : null
    ]);
    if (performer) dto.performer = { username: performer.username };
    if (gallery) dto.gallery = new GalleryDto(gallery);
    if (file)
      dto.photo = {
        url: file.getUrl(),
        thumbnails: file.getThumbnails(),
        width: file.width,
        height: file.height
      };
    }
    return dto;
  }

  public async delete(id: string | ObjectId) {
    const photo = await this.photoModel.findById(id);
    if (!photo) {
      throw new EntityNotFoundException();
    }

    const dto = new PhotoDto(photo);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_COVER_GALLERY_CHANNEL,
        eventName: EVENT.DELETED,
        data: dto
      })
    );

    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_PHOTO_CHANNEL,
        eventName: EVENT.DELETED,
        data: dto
      })
    );

    await photo.remove();
    // TODO - should check ref and remove
    await this.fileService.remove(photo.fileId);
    if (photo.galleryId) {
      this.galleryService.updateNumOfItems(photo.galleryId, -1);
    }
    return true;
  }

  public async deleteByGallery(galleryId: string | ObjectId) {
    const photos = await this.photoModel.find({ galleryId });
    if (photos && photos.length > 0) {
      await Promise.all(
        photos.map(async (photo) => {
          await photo.remove();
          await this.queueEventService.publish(
            new QueueEvent({
              channel: PERFORMER_PHOTO_CHANNEL,
              eventName: EVENT.DELETED,
              data: new PhotoDto(photo)
            })
          );
          await this.fileService.remove(photo.fileId);
        })
      );
    }
    return true;
  }

  public async findByFileId(id: string | ObjectId) {
    const photo = await this.photoModel.findOne({fileId : id});
    return new PhotoDto(photo);
  }

  public async checkAuth(req: any, user: UserDto) {
    const { query } = req;
    if (!query.photoId) {
      throw new ForbiddenException();
    }
    if (user.roles && user.roles.indexOf('admin') > -1) {
      return true;
    }
    // check type video
    const photo = await this.photoModel.findById(query.photoId);
    if (!photo) throw new EntityNotFoundException();
    if (user._id.toString() === photo.performerId.toString()) {
      return true;
    }
    const gallery = await this.galleryService.findById(photo.galleryId);
    if(!gallery) throw new EntityNotFoundException();
    if (!gallery.isSaleGallery) {
      const PerBubSwitch = await this.performerService.findById(gallery.performerId);
      if (!PerBubSwitch) throw new EntityNotFoundException();
      // check subscription
      if (PerBubSwitch.subsribeSwitch) {
        const checkSubscribed = await this.subscriptionService.checkSubscribed(
          photo.performerId,
          user._id
        );
        if (!checkSubscribed) {
          if(PerBubSwitch.freeSubsribeSwitch){
            const checkFreeSubscribed = await this.subscriptionService.checkFreeSubscribed(
              photo.performerId,
              user._id
            );
            if (!checkFreeSubscribed) {
              throw new ForbiddenException();
            }
            return true;
          }
          throw new ForbiddenException();
        }
      }
      return true;
    }
    if (gallery.isSaleGallery) {
      // check bought
      const bought = await this.checkPaymentService.checkBoughtGallery(new GalleryDto(gallery), user);
      if (!bought) {
        throw new ForbiddenException();
      }
      return true;
    }
    throw new ForbiddenException();
  }
}
