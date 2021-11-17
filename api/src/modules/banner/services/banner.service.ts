import { Injectable, Inject, HttpException } from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import {
  QueueEventService,
  EntityNotFoundException
} from 'src/kernel';
import { FileDto } from 'src/modules/file';
import { UserDto } from 'src/modules/user/dtos';
import { FileService } from 'src/modules/file/services';
import { merge } from 'lodash';
import { REF_TYPE } from 'src/modules/file/constants';
import { BANNER_STATUS } from '../constants';
import { BannerDto } from '../dtos';
import { BannerCreatePayload, BannerUpdatePayload } from '../payloads';
import { BannerModel } from '../models';
import { BANNER_PROVIDER } from '../providers';

export const BANNER_CHANNEL = 'BANNER_CHANNEL';
// const FILE_PROCESSED_TOPIC = 'FILE_PROCESSED';

@Injectable()
export class BannerService {
  constructor(
    @Inject(BANNER_PROVIDER)
    private readonly bannerModel: Model<BannerModel>,
    private readonly queueEventService: QueueEventService,
    private readonly fileService: FileService
  ) {
    // this.queueEventService.subscribe(
    //   BANNER_CHANNEL,
    //   FILE_PROCESSED_TOPIC,
    //   this.handleFileProcessed.bind(this)
    // );
  }

  // public async handleFileProcessed(event: QueueEvent) {
  //   try {
  //     if ( ![EVENT.CREATED, EVENT.UPDATED].includes(event.eventName) ) return;
  //     const bannerId = event.data.meta && event.data.meta.bannerId;
  //     const [banner, file] = await Promise.all([
  //       bannerId && this.bannerModel.findById(bannerId),
  //       event.data.fileId && this.fileService.findById(event.data.fileId)
  //     ]);
  //     if (!banner) {
  //       // TODO - delete file?
  //       return;
  //     }
  //     banner.processing = false;
  //     if (file.status === 'error') {
  //       banner.status = BANNER_STATUS.FILE_ERROR;
  //     }
  //     await banner.save();
  //   } catch (e) {
  //     // TODO - log me
  //     console.log(e);
  //   }
  // }

  public async create(
    file: FileDto,
    payload: BannerCreatePayload,
    creator?: UserDto
  ): Promise<BannerDto> {
    if (!file) throw new HttpException('File is valid!', 400);
    if (!file.isImage()) {
      await this.fileService.removeIfNotHaveRef(file._id);
      throw new HttpException('Invalid image!', 400);
    }

    // process to create thumbnails
    // eslint-disable-next-line new-cap
    const banner = new this.bannerModel(payload);
    if (!banner.title) banner.title = file.name;

    banner.fileId = file._id;
    banner.createdAt = new Date();
    banner.updatedAt = new Date();
    if (creator) {
      banner.createdBy = creator._id;
      banner.updatedBy = creator._id;
    }
    banner.processing = false;
    await banner.save();
    await Promise.all([
      this.fileService.addRef(file._id, {
        itemType: REF_TYPE.BANNER,
        itemId: banner._id
      })
    ]);

    const dto = new BannerDto(banner);

    return dto;
  }

  public async updateInfo(
    id: string | ObjectId,
    payload: BannerUpdatePayload,
    updater?: UserDto
  ): Promise<BannerDto> {
    const banner = await this.bannerModel.findById(id);
    if (!banner) {
      throw new EntityNotFoundException();
    }

    merge(banner, payload);
    if (
      banner.status !== BANNER_STATUS.FILE_ERROR
      && payload.status !== BANNER_STATUS.FILE_ERROR
    ) {
      banner.status = payload.status;
    }
    updater && banner.set('updatedBy', updater._id);
    banner.updatedAt = new Date();
    await banner.save();
    const dto = new BannerDto(banner);

    return dto;
  }

  public async details(
    id: string | ObjectId
  ): Promise<BannerDto> {
    const banner = await this.bannerModel.findOne({ _id: id });
    if (!banner) {
      throw new EntityNotFoundException();
    }

    const dto = new BannerDto(banner);
    const [file] = await Promise.all([
      banner.fileId ? this.fileService.findById(banner.fileId) : null
    ]);
    if (file) {
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
    const banner = await this.bannerModel.findById(id);
    if (!banner) {
      throw new EntityNotFoundException();
    }

    await banner.remove();
    // TODO - should check ref and remove
    await this.fileService.remove(banner.fileId);
    return true;
  }
}
