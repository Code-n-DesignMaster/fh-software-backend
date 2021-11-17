import { Injectable, Inject } from '@nestjs/common';
import { VideoModel } from 'src/modules/performer-assets/models';
import { PerformerModel } from 'src/modules/performer/models';
import { Model } from 'mongoose';
import { PERFORMER_MODEL_PROVIDER } from 'src/modules/performer/providers';
import { PERFORMER_VIDEO_MODEL_PROVIDER } from 'src/modules/performer-assets/providers';

@Injectable()
export class PerformerVideoCount {
  constructor(
    @Inject(PERFORMER_MODEL_PROVIDER)
    private readonly performerModel: Model<PerformerModel>,
    @Inject(PERFORMER_VIDEO_MODEL_PROVIDER)
    private readonly videoModel: Model<VideoModel>
  ) {}

  async up() {
    const performers = await this.performerModel.find({});
    // eslint-disable-next-line no-restricted-syntax
    for (const performer of performers) {
      // eslint-disable-next-line no-await-in-loop
      const videoCount = await this.videoModel.countDocuments({ performerId: performer._id, status: 'active', 
      $or:[ {isPrivateChat:{$exists:false}}, {isPrivateChat: false} ] 
      });
      // eslint-disable-next-line no-await-in-loop
      await this.performerModel.updateOne(
        { _id: performer._id },
        {
          'stats.totalVideos': videoCount
        }
      );
    }
  }
}
