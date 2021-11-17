import { Injectable, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import {
  PERFORMER_GALLERY_MODEL_PROVIDER, PERFORMER_PHOTO_MODEL_PROVIDER,
  PERFORMER_PRODUCT_MODEL_PROVIDER, PERFORMER_VIDEO_MODEL_PROVIDER
} from '../../performer-assets/providers';
import {
  GalleryModel, PhotoModel, ProductModel, VideoModel
} from '../../performer-assets/models';
import { USER_MODEL_PROVIDER } from '../../user/providers';
import { UserModel } from '../../user/models';
import { PERFORMER_MODEL_PROVIDER } from '../../performer/providers';
import { PerformerModel } from '../../performer/models';
import { SUBSCRIPTION_MODEL_PROVIDER } from '../../subscription/providers/subscription.provider';
import { SubscriptionModel } from '../../subscription/models/subscription.model';
import { ORDER_MODEL_PROVIDER } from '../../payment/providers';
import { OrderModel } from '../../payment/models';
import { EARNING_MODEL_PROVIDER } from '../../earning/providers/earning.provider';
import { EarningModel } from '../../earning/models/earning.model';
import { STATUS_ACTIVE, STATUS_INACTIVE, STATUS_PENDING_EMAIL_CONFIRMATION } from '../../user/constants';
import { PERFORMER_STATUSES } from '../../performer/constants';
import { ORDER_STATUS } from '../../payment/constants';

@Injectable()
export class StatisticService {
  constructor(
    @Inject(PERFORMER_GALLERY_MODEL_PROVIDER)
    private readonly galleryModel: Model<GalleryModel>,
    @Inject(PERFORMER_PHOTO_MODEL_PROVIDER)
    private readonly photoModel: Model<PhotoModel>,
    @Inject(PERFORMER_PRODUCT_MODEL_PROVIDER)
    private readonly productModel: Model<ProductModel>,
    @Inject(PERFORMER_VIDEO_MODEL_PROVIDER)
    private readonly videoModel: Model<VideoModel>,
    @Inject(USER_MODEL_PROVIDER)
    private readonly userModel: Model<UserModel>,
    @Inject(PERFORMER_MODEL_PROVIDER)
    private readonly performerModel: Model<PerformerModel>,
    @Inject(SUBSCRIPTION_MODEL_PROVIDER)
    private readonly subscriptionModel: Model<SubscriptionModel>,
    @Inject(ORDER_MODEL_PROVIDER)
    private readonly orderModel: Model<OrderModel>,
    @Inject(EARNING_MODEL_PROVIDER)
    private readonly earningModel: Model<EarningModel>
  ) { }

  public async stats(): Promise<any> {
    const totalActiveUsers = await this.userModel.countDocuments({ status: STATUS_ACTIVE });
    const totalInactiveUsers = await this.userModel.countDocuments({ status: STATUS_INACTIVE });
    const totalPendingUsers = await this.userModel.countDocuments({ status: STATUS_PENDING_EMAIL_CONFIRMATION });
    const totalActivePerformers = await this.performerModel.countDocuments({ status: STATUS_ACTIVE });
    const totalInactivePerformers = await this.performerModel.countDocuments({ status: STATUS_INACTIVE });
    const totalPendingPerformers = await this.performerModel.countDocuments({ status: PERFORMER_STATUSES.PENDING });
    const totalGalleries = await this.galleryModel.countDocuments({ });
    const totalPhotos = await this.photoModel.countDocuments({ });
    const totalVideos = await this.videoModel.countDocuments({});
    const totalActiveSubscribers = await this.subscriptionModel.countDocuments({ expiredAt: { $gt: new Date() } });
    const totalSubscribers = await this.subscriptionModel.countDocuments({ });
    const totalDeliveriedOrders = await this.orderModel.countDocuments({ deliveryStatus: ORDER_STATUS.DELIVERED });
    const totalShippingdOrders = await this.orderModel.countDocuments({ deliveryStatus: ORDER_STATUS.SHIPPING });
    const totalRefundedOrders = await this.orderModel.countDocuments({ deliveryStatus: ORDER_STATUS.REFUNDED });
    const totalProducts = await this.productModel.countDocuments({});
    const [totalGrossPrice, totalNetPrice] = await Promise.all([
      this.earningModel.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: '$grossPrice'
            }
          }
        }
      ]),
      this.earningModel.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: '$netPrice'
            }
          }
        }
      ])
    ]);
    return {
      totalActiveUsers,
      totalInactiveUsers,
      totalPendingUsers,
      totalActivePerformers,
      totalInactivePerformers,
      totalPendingPerformers,
      totalGalleries,
      totalPhotos,
      totalVideos,
      totalProducts,
      totalActiveSubscribers,
      totalSubscribers,
      totalDeliveriedOrders,
      totalShippingdOrders,
      totalRefundedOrders,
      totalGrossPrice: (totalGrossPrice && totalGrossPrice.length && totalGrossPrice[0].total) || 0,
      totalNetPrice: (totalGrossPrice && totalGrossPrice.length && totalNetPrice[0].total) || 0
    };
  }
}
