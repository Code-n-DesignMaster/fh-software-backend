import { Injectable, Inject } from '@nestjs/common';
import { GalleryModel } from 'src/modules/performer-assets/models';
import { PerformerModel } from 'src/modules/performer/models';
import { Model } from 'mongoose';
import { PERFORMER_MODEL_PROVIDER } from 'src/modules/performer/providers';
import { PERFORMER_GALLERY_MODEL_PROVIDER } from 'src/modules/performer-assets/providers';

@Injectable()
export class PerformerGalleryCount {
  constructor(
    @Inject(PERFORMER_MODEL_PROVIDER)
    private readonly performerModel: Model<PerformerModel>,
    @Inject(PERFORMER_GALLERY_MODEL_PROVIDER)
    private readonly galleryModel: Model<GalleryModel>
  ) {}

  async up() {
    const performers = await this.performerModel.find({});
    // eslint-disable-next-line no-restricted-syntax
    for (const performer of performers) {
      // eslint-disable-next-line no-await-in-loop
      const galleryCount = await this.galleryModel.countDocuments({ performerId: performer._id, status: 'active' });
      // eslint-disable-next-line no-await-in-loop
      await this.performerModel.updateOne(
        { _id: performer._id },
        {
          'stats.totalGalleries': galleryCount
        }
      );
    }
  }
}
