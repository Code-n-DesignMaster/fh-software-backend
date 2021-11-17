import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { PageableData } from 'src/kernel';
import { PerformerService } from 'src/modules/performer/services';
import { FileService } from 'src/modules/file/services';
import { UserDto } from 'src/modules/user/dtos';
import { VideoDto } from '../dtos';
import { VideoSearchRequest } from '../payloads';
import { VideoModel } from '../models';
import { PERFORMER_VIDEO_MODEL_PROVIDER } from '../providers';
import { ObjectId } from 'mongodb';
import { CheckPaymentService } from 'src/modules/payment/services/check-payment.service';
@Injectable()
export class VideoSearchService {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(PERFORMER_VIDEO_MODEL_PROVIDER)
    private readonly videoModel: Model<VideoModel>,
    private readonly fileService: FileService,
    private readonly checkPaymentService: CheckPaymentService,
  ) {}

  public async adminSearch(req: VideoSearchRequest): Promise<PageableData<VideoDto>> {
    const query = {} as any;
    if (req.q) query.title = { $regex: req.q };
    if (req.performerId) query.performerId = req.performerId;
    if (req.status) query.status = req.status;
    if (req.isSaleVideo) query.isSaleVideo = req.isSaleVideo;
    let sort = {};
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.videoModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.videoModel.countDocuments(query)
    ]);

    const performerIds = data.map((d) => d.performerId);
    const fileIds = [];
    data.forEach((v) => {
      v.thumbnailId && fileIds.push(v.thumbnailId);
      v.fileId && fileIds.push(v.fileId);
    });

    const [performers, files] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      fileIds.length ? this.fileService.findByIds(fileIds) : []
    ]);

    const videos = data.map((v) => new VideoDto(v));
    videos.forEach((v) => {
      const performer = performers.find((p) => p._id.toString() === v.performerId.toString());
      if (performer) {
        // eslint-disable-next-line no-param-reassign
        v.performer = {
          username: performer.username
        };
      }

      if (v.thumbnailId) {
        const thumbnail = files.find((f) => f._id.toString() === v.thumbnailId.toString());
        if (thumbnail) {
          // eslint-disable-next-line no-param-reassign
          v.thumbnail = thumbnail.getUrl();
        }
      }
      if (v.fileId) {
        const video = files.find((f) => f._id.toString() === v.fileId.toString());
        if (video) {
          // eslint-disable-next-line no-param-reassign
          v.video = {
            url: video.getUrl(),
            thumbnails: video.getThumbnails(),
            duration: video.duration
          };
        }
      }
    });

    return {
      data: videos,
      total
    };
  }

  public async performerSearch(req: VideoSearchRequest, performer?: UserDto): Promise<PageableData<VideoDto>> {
    const query = {} as any;
    if (req.q) query.title = { $regex: req.q };
    query.performerId = performer._id;
    if (req.isSaleVideo) query.isSaleVideo = req.isSaleVideo;
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
      this.videoModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.videoModel.countDocuments(query)
    ]);
    const performerIds = data.map((d) => d.performerId);
    const fileIds = [];
    data.forEach((v) => {
      v.thumbnailId && fileIds.push(v.thumbnailId);
      v.fileId && fileIds.push(v.fileId);
    });

    const [performers, files] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      fileIds.length ? this.fileService.findByIds(fileIds) : []
    ]);

    const videos = data.map((v) => new VideoDto(v));
    videos.forEach((v) => {
      const perforerFound = performers.find((p) => p._id.toString() === v.performerId.toString());
      if (perforerFound) {
        // eslint-disable-next-line no-param-reassign
        v.performer = {
          username: perforerFound.username
        };
      }

      if (v.thumbnailId) {
        const thumbnail = files.find((f) => f._id.toString() === v.thumbnailId.toString());
        if (thumbnail) {
          // eslint-disable-next-line no-param-reassign
          v.thumbnail = thumbnail.getUrl();
        }
      }
      if (v.fileId) {
        const video = files.find((f) => f._id.toString() === v.fileId.toString());
        if (video) {
          // eslint-disable-next-line no-param-reassign
          v.video = {
            url: video.getUrl(),
            thumbnails: video.getThumbnails(),
            duration: video.duration
          };
        }
      }
    });

    return {
      data: videos,
      total
    };
  }

  public async userSearch(req: VideoSearchRequest): Promise<PageableData<VideoDto>> {
    const query = {} as any;
    if (req.q) query.title = { $regex: req.q };
    if (req.performerId) query.performerId = req.performerId;
    //if (req.isSaleVideo) query.isSaleVideo = req.isSaleVideo;
    if (req.excludedId) query._id = { $ne: req.excludedId };
    if (req.ids && Array.isArray(req.ids)) {
      query._id = {
        $in: req.ids
      };
    }

    query.status = 'active';
    query.isSchedule = false;
    let sort = {
      createdAt: -1
    } as any;
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
      this.videoModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.videoModel.countDocuments(query)
    ]);
    const performerIds = data.map((d) => d.performerId);
    const fileIds = [];
    data.forEach((v) => {
      v.thumbnailId && fileIds.push(v.thumbnailId);
      v.fileId && fileIds.push(v.fileId);
    });

    const [performers, files] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      fileIds.length ? this.fileService.findByIds(fileIds) : []
    ]);

    const videos = data.map((v) => new VideoDto(v));
    videos.forEach((v) => {
      const performer = performers.find((p) => p._id.toString() === v.performerId.toString());
      if (performer) {
        // eslint-disable-next-line no-param-reassign
        v.performer = {
          username: performer.username
        };
      }
      // check login & subscriber filter data
      if (v.thumbnailId) {
        const thumbnail = files.find((f) => f._id.toString() === v.thumbnailId.toString());
        if (thumbnail) {
          // eslint-disable-next-line no-param-reassign
          v.thumbnail = thumbnail.getUrl();
        }
      }
      if (v.fileId) {
        const video = files.find((f) => f._id.toString() === v.fileId.toString());
        if (video) {
          // eslint-disable-next-line no-param-reassign
          v.video = {
            url: null, // video.getUrl(),
            thumbnails: video.getThumbnails(),
            duration: video.duration
          };
        }
      }
    });

    if (req.userId) {
      const user = new UserDto();
      user._id =  ObjectId.isValid(req.userId) ? new ObjectId(req.userId): new ObjectId();
      for (let i = 0; i < videos.length; i++) {
        if (videos[i].isSaleVideo) {
          const bought = await this.checkPaymentService.checkBoughtVideo(
            videos[i],
            user
          );
          videos[i].isBought = bought ? true : false;
        }
      }      
    }

    return {
      data: videos,
      total
    };
  }

  public async findByIdInChat(id: string | ObjectId) {
    const video = await this.videoModel.findById(id);
    return new VideoDto(video);
  }
}
