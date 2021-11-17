import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    PERFORMER_GALLERY_MODEL_PROVIDER,
    PERFORMER_PHOTO_MODEL_PROVIDER
} from '../providers';
import { GalleryModel, PhotoModel } from '../models';
import {
    EntityNotFoundException,
    PageableData,
    QueueEventService,
    StringHelper
} from 'src/kernel';
import { GalleryCreatePayload, GallerySearchRequest } from '../payloads';
import { PerformerService } from 'src/modules/performer/services';

import { GalleryDto, IGalleryResponse } from '../dtos';
import { UserDto } from 'src/modules/user/dtos';
import { FileService } from 'src/modules/file/services';
import { CheckPaymentService } from 'src/modules/payment/services/check-payment.service';
import { ObjectId } from 'mongodb';
@Injectable()
export class GallerySearchService {
    constructor(
        @Inject(forwardRef(() => PerformerService))
        private readonly performerService: PerformerService,
        @Inject(PERFORMER_GALLERY_MODEL_PROVIDER)
        private readonly galleryModel: Model<GalleryModel>,
        private readonly fileService: FileService,
        @Inject(PERFORMER_PHOTO_MODEL_PROVIDER)
        private readonly photoModel: Model<PhotoModel>,
        private readonly checkPaymentService: CheckPaymentService
    ) { }

    public async userSearch(req: GallerySearchRequest): Promise<PageableData<GalleryDto>> {
        const query = {} as any;
        if (req.q) query.title = { $regex: req.q };
        if (req.performerId) query.performerId = req.performerId;
        if (req.isSaleGallery) query.isSaleVideo = req.isSaleGallery;
        if (req.excludedId) query._id = { $ne: req.excludedId };
        if (req.ids && Array.isArray(req.ids)) query._id = {
            $in: req.ids
        };

        query.status = 'active';
        let sort = {
            createdAt: -1
        } as any;
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
                .limit(parseInt(req.limit as string))
                .skip(parseInt(req.offset as string)),
            this.galleryModel.countDocuments(query)
        ]);
        const performerIds = data.map(d => d.performerId);
        /*
        const fileIds = [];
        data.forEach(v => {
            v.thumbnailId && fileIds.push(v.thumbnailId);
            v.fileId && fileIds.push(v.fileId);
        });
        */
        const galleryIds = data.map(d => d._id);
        const [performers, photos] = await Promise.all([
            performerIds.length ? this.performerService.findByIds(performerIds) : [],
           // fileIds.length ? this.fileService.findByIds(fileIds) : []
           galleryIds.length? this.photoModel
           .find({
            galleryId: {
               $in: galleryIds
             }
           })
           .lean()
           .exec():[]
        ]);
        const galleries = data.map(v => new GalleryDto(v));

        const fileIds = photos.map(c => c.fileId);
        const files = await this.fileService.findByIds(fileIds);
        galleries.forEach(v => {
            const performer = performers.find(p => p._id.toString() === v.performerId.toString());
            if (performer) {
                v.performer = {
                    username: performer.username
                };
            }
            /*
            // check login & subscriber filter data
            if (v.thumbnailId) {
                const thumbnail = files.find(f => f._id.toString() === v.thumbnailId.toString());
                if (thumbnail) {
                    v.thumbnail = thumbnail.getUrl();
                }
            }
            if (v.fileId) {
                const video = files.find(f => f._id.toString() === v.fileId.toString());
                if (video)
                    v.video = {
                        url: null, //video.getUrl(),
                        thumbnails: video.getThumbnails(),
                        duration: video.duration
                    };
            }
            */

           if (v.coverPhotoId) {
            const coverPhoto = photos.find(
              c => c._id.toString() === v.coverPhotoId.toString()
            );
            if (coverPhoto) {
              const file = files.find(
                f => f._id.toString() === coverPhoto.fileId.toString()
              );
              if (file) {
                v.coverPhoto = {
                  url: file.getUrl(),
                  thumbnails: file.getThumbnails()
                };
              }
            }
          }

        });

        if (req.userId) {
            const user = new UserDto();
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
}