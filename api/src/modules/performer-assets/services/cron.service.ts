import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { AuthService } from 'src/modules/auth';
import { FileService } from 'src/modules/file/services';
import { VideoService } from './video.service';
import { VideoModel } from '../models';
import { PERFORMER_VIDEO_MODEL_PROVIDER } from '../providers';
const Mux = require('@mux/mux-node');

@Injectable()
export class CronService {
    constructor(
        private readonly videoService: VideoService,
        private readonly authService: AuthService,
        private readonly fileService: FileService,
        @Inject(PERFORMER_VIDEO_MODEL_PROVIDER)
        private readonly videoModel: Model<VideoModel>,
    
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    async handleMuxVideosCron() {
        const video = await this.videoService.findOne({ "mux.playbackId": ""});

        if (video){
            const { Video } = new Mux();

            const auth = { _id: '', source: 'performer', sourceId: video.performerId }
            const authToken = this.authService.generateJWT(auth);
    
            const file = await this.fileService.findById(video.fileId);
    
            const videoUrl = process.env.BASE_URL + file.path + '?' + 'videoId=' + video.id + '&token=' + authToken;

            const asset = await Video.Assets.create({
                input: videoUrl
            });
    
            const playbackId = await Video.Assets.createPlaybackId(asset.id, {
                policy: 'public',
            });

            await this.videoModel.findByIdAndUpdate(video.id, {
                mux: { assetId: asset.id, playbackId: playbackId.id, processing: true }
            });
        }
    }
}