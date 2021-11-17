import {
    Controller,
    Injectable,
    Post,
    HttpCode,
    HttpStatus,
    Body,
    Headers
  } from '@nestjs/common';
  import { DataResponse } from 'src/kernel';
  import { VideoService } from '../services/video.service';
  import { VideoSearchService } from '../services/video-search.service';
  import { AuthService } from '../../auth/services';
  import Mux from '@mux/mux-node';

  @Injectable()
  @Controller('mux')
  export class MuxWebhooksController {
    constructor(
      private readonly videoService: VideoService,
      private readonly videoSearchService: VideoSearchService,
      private readonly authService: AuthService
    ) { }
  
    @Post('/webhook')
    @HttpCode(HttpStatus.OK)
    async webhook(
        @Headers() headers: any,
        @Body() payload: any
    ) {
        try {
            if (payload){
                const verifyHeaderResult = Mux.Webhooks.verifyHeader(JSON.stringify(payload), headers['mux-signature'], process.env.MUX_WEBHOOK_SIGNING_SECRET);  
                if (verifyHeaderResult){
                    if (payload.type == 'video.asset.ready'){
                        const assetId = payload.data?.id;
                        const video = await this.videoService.findOne({ "mux.assetId": assetId });
                        if (video) {
                            video.mux.processing = false;
                            await video.save();
                        }
                    }
                }
            }
        }
        catch(err){
        }

        return DataResponse.ok();
    }
}
  