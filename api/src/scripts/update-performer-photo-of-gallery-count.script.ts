import { Injectable, Inject } from '@nestjs/common';
import { GalleryModel } from 'src/modules/performer-assets/models';
import { PerformerModel } from 'src/modules/performer/models';
import { PhotoModel } from 'src/modules/performer-assets/models'; 
import { Model } from 'mongoose';
import { PERFORMER_MODEL_PROVIDER } from 'src/modules/performer/providers';
import { PERFORMER_GALLERY_MODEL_PROVIDER, PERFORMER_PHOTO_MODEL_PROVIDER } from 'src/modules/performer-assets/providers';

@Injectable()
export class PerformerPhotoOfGalleryCount {
  constructor(
    @Inject(PERFORMER_MODEL_PROVIDER)
    private readonly performerModel: Model<PerformerModel>,
    @Inject(PERFORMER_GALLERY_MODEL_PROVIDER)
    private readonly galleryModel: Model<GalleryModel>,
    @Inject(PERFORMER_PHOTO_MODEL_PROVIDER)
    private readonly photoModel: Model<PhotoModel>
  ) {}

  async up() {
    const performers = await this.performerModel.find({});
    // eslint-disable-next-line no-restricted-syntax
    for (const performer of performers) {
      // eslint-disable-next-line no-await-in-loop
      const galleries = await this.galleryModel.find({ performerId: performer._id, status: 'active' });
      for (const gallery of galleries) {
        const photoCount = await this.photoModel.countDocuments({ galleryId: gallery._id, status: 'active' });
        await this.galleryModel.updateOne(
            { _id: gallery._id },
            {
                numOfItems: photoCount
            }
        )
      }
    }
  }
}
