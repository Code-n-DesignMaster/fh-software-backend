import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UserDto } from 'src/modules/user/dtos';
import { EntityNotFoundException } from 'src/kernel';
import { PAYMENT_TRANSACTION_MODEL_PROVIDER } from '../providers';
import { Model } from 'mongoose';
import { PaymentTransactionModel } from '../models';
import {
  PAYMENT_STATUS,
  PAYMENT_TYPE
} from '../constants';
import { VideoDto, GalleryDto } from 'src/modules/performer-assets/dtos';
import { ObjectId } from 'mongodb';
@Injectable()
export class CheckPaymentService {
  constructor(
    @Inject(PAYMENT_TRANSACTION_MODEL_PROVIDER)
    private readonly paymentTransactionModel: Model<PaymentTransactionModel>
  ) { }

  public checkBoughtVideo = async (video: VideoDto, user: UserDto) => {
    if (!video || (video && !video.isSaleVideo) || (video && !video.price)) {
      throw new EntityNotFoundException();
    }
    if (video.performerId.toString() === user._id.toString()) {
      return 1;
    }
    return this.paymentTransactionModel.countDocuments({
      type: PAYMENT_TYPE.SALE_VIDEO,
      targetId: video._id,
      sourceId: user._id,
      status: PAYMENT_STATUS.SUCCESS
    });
  }

  public checkBoughtGallery = async (gallery: GalleryDto, user: UserDto) => {
    if (!gallery || (gallery && !gallery.isSaleGallery) || (gallery && !gallery.price)) {
      throw new EntityNotFoundException();
    }
    if (gallery.performerId.toString() === user._id.toString()) {
      return 1
    }
    return this.paymentTransactionModel.countDocuments({
      type: PAYMENT_TYPE.SALE_GALLERY,
      targetId: gallery._id,
      sourceId: user._id,
      status: PAYMENT_STATUS.SUCCESS
    });
  }

  public checkTipPerformer = async (performer: string | ObjectId, user: string | ObjectId) => {
    if (!performer || !user) {
      throw new EntityNotFoundException();
    }
    if (performer.toString() === user.toString()) {
      return 1
    }
    return this.paymentTransactionModel.countDocuments({
      type: PAYMENT_TYPE.SEND_TIP,
      targetId: performer,
      sourceId: user,
      status: PAYMENT_STATUS.SUCCESS
    });
  }

 
}
