import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { PERFORMER_GALLERY_MODEL_PROVIDER, PERFORMER_PHOTO_MODEL_PROVIDER } from '../providers';
import { GalleryModel, PhotoModel } from '../models';
import { PageableData, EntityNotFoundException } from 'src/kernel';
import { PhotoDto, GalleryDto, IGalleryResponse } from '../dtos';
import { PerformerService } from 'src/modules/performer/services';
import { PhotoSearchRequest } from '../payloads';
import { GalleryService } from './gallery.service';
import { FileService } from 'src/modules/file/services';
import { ObjectId } from 'mongodb';
import { UserDto } from 'src/modules/user/dtos';
import { CheckPaymentService } from 'src/modules/payment/services/check-payment.service';

@Injectable()
export class PhotoSearchService {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(PERFORMER_GALLERY_MODEL_PROVIDER)
    private readonly galleryModel: Model<GalleryModel>,
    @Inject(PERFORMER_PHOTO_MODEL_PROVIDER)
    private readonly photoModel: Model<PhotoModel>,
    private readonly galleryService: GalleryService,
    private readonly fileService: FileService,
    private readonly checkPaymentService: CheckPaymentService
  ) { }

  public async adminSearch(req: PhotoSearchRequest, jwToken: string): Promise<PageableData<PhotoDto>> {
    const query = {} as any;
    if (req.q) query.title = { $regex: req.q };
    if (req.performerId) query.performerId = req.performerId;
    if (req.galleryId) query.galleryId = req.galleryId;
    if (req.status) query.status = req.status;
    let sort = {};
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.photoModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.photoModel.countDocuments(query)
    ]);

    const performerIds = data.map((d) => d.performerId);
    const galleryIds = data.map((d) => d.galleryId);
    const fileIds = data.map((d) => d.fileId);
    const photos = data.map((v) => new PhotoDto(v));
    const [performers, galleries, files] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      galleryIds.length ? this.galleryService.findByIds(galleryIds) : [],
      fileIds.length ? this.fileService.findByIds(fileIds) : []
    ]);
    photos.forEach((v) => {
      // TODO - should get picture (thumbnail if have?)
      const performer = performers.find((p) => p._id.toString() === v.performerId.toString());
      if (performer) {
        // eslint-disable-next-line no-param-reassign
        v.performer = {
          username: performer.username
        };
      }

      if (v.galleryId) {
        const gallery = galleries.find((p) => p._id.toString() === v.galleryId.toString());
        // eslint-disable-next-line no-param-reassign
        if (gallery) v.gallery = gallery;
      }

      const file = files.find((f) => f._id.toString() === v.fileId.toString());
      if (file) {
        const url = file.getUrl();
        // eslint-disable-next-line no-param-reassign
        v.photo = {
          thumbnails: file.getThumbnails(),
          url: jwToken ? `${url}?photoId=${v._id}&token=${jwToken}` : url || null,
          width: file.width,
          height: file.height,
          mimeType: file.mimeType
        };
      }
    });

    return {
      data: photos,
      total
    };
  }

  public async performerSearch(req: PhotoSearchRequest, user: UserDto, jwToken: string): Promise<PageableData<PhotoDto>> {
    const query = {} as any;
    if (req.q) query.title = { $regex: req.q };
    query.performerId = user._id;
    if (req.galleryId) query.galleryId = req.galleryId;
    if (req.status) query.status = req.status;
    const [data, total] = await Promise.all([
      this.photoModel
        .find(query)
        .lean()
        .sort('-createdAt')
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.photoModel.countDocuments(query)
    ]);

    const performerIds = data.map((d) => d.performerId);
    const galleryIds = data.map((d) => d.galleryId);
    const fileIds = data.map((d) => d.fileId);
    const photos = data.map((v) => new PhotoDto(v));
    const [performers, galleries, files] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      galleryIds.length ? this.galleryService.findByIds(galleryIds) : [],
      fileIds.length ? this.fileService.findByIds(fileIds) : []
    ]);
    photos.forEach((v) => {
      // TODO - should get picture (thumbnail if have?)
      const performer = performers.find((p) => p._id.toString() === v.performerId.toString());
      if (performer) {
        // eslint-disable-next-line no-param-reassign
        v.performer = {
          username: performer.username
        };
      }

      if (v.galleryId) {
        const gallery = galleries.find((p) => p._id.toString() === v.galleryId.toString());
        // eslint-disable-next-line no-param-reassign
        if (gallery) v.gallery = gallery;
      }

      const file = files.find((f) => f._id.toString() === v.fileId.toString());
      if (file) {
        const url = file.getUrl();
        // eslint-disable-next-line no-param-reassign
        v.photo = {
          thumbnails: file.getThumbnails(),
          url: jwToken ? `${url}?photoId=${v._id}&token=${jwToken}` : url || null,
          width: file.width,
          height: file.height,
          mimeType: file.mimeType
        };
      }
    });

    
    return {
      data: photos,
      total
    };
  }

  public async getModelPhotosWithGalleryCheck(req: PhotoSearchRequest, user: UserDto, jwToken: string) {
    const query = {
      performerId: req.performerId,
      status: 'active',
      processing: false
      // isGalleryCover: false,
    } as any;
    if (req.galleryId) query.galleryId = req.galleryId;
    const sort = { createdAt: -1 };
    // // if gallery photo, do not response gallery item
    // query.$or = [
    //   {
    //     isGalleryCover: true
    //   },
    //   {
    //     isGalleryCover: false,
    //     galleryId: null
    //   }
    // ];
    const [data, total] = await Promise.all([
      this.photoModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.photoModel.countDocuments(query)
    ]);

    const fileIds = data.map(d => d.fileId);
    let photos = data.map(v => new PhotoDto(v));

    // check subscribe
    //const check = await this.performerService.checkSubscribed(query.performerId, user);
    //const gallery = await this.galleryModel.findById(req.galleryId);
    //const dto = new IGalleryResponse(gallery);
    /*
    const bought = await this.checkPaymentService.checkBoughtGallery(
      dto,
      user
    );
    */
    const galleryIds = data.filter(d => d.galleryId).map(p => p.galleryId);
    const [galleries, files] = await Promise.all([
      galleryIds.length ? this.galleryService.findByIds(galleryIds) : [],
      fileIds.length ? this.fileService.findByIds(fileIds) : []
    ]);
    photos.forEach(v => {
      if (v.galleryId) {
        const gallery = galleries.find(
          p => p._id.toString() === v.galleryId.toString()
        );
        if (gallery) v.gallery = gallery;
      }

      const file = files.find(f => f._id.toString() === v.fileId.toString());

      if (file) {
        const url = file.getUrl();
        v.photo = {
          thumbnails: file.getThumbnails(),
          url: jwToken ? `${url}?photoId=${v._id}&token=${jwToken}` : url || null,
          width: file.width,
          height: file.height,
          mimeType: file.mimeType
        };
      }
    });


    /*
   //don't response all the photoes under gallery, if user doesn't pay for it.
   if ((!dto.isSaleGallery && check.subscribed) || (dto.isSaleGallery && bought)) {
   if (dto.isSaleGallery) {
     if(!bought && photos.length){
       photos = photos.splice(0,1);
     }
   }
  }
  */
    return {
      data: photos,
      total
    };
  }

}
