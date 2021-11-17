import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { QueueEventService, QueueEvent } from 'src/kernel';
import {
  TRANSACTION_SUCCESS_CHANNEL,
  PAYMENT_TYPE
} from 'src/modules/payment/constants';
import { EVENT } from 'src/kernel/constants';
import { PerformerService } from 'src/modules/performer/services';
import { SettingService } from 'src/modules/settings';
import { EarningDto } from '../dtos/earning.dto';
import { EARNING_MODEL_PROVIDER } from '../providers/earning.provider';
import { EarningModel } from '../models/earning.model';
import { PAYMENT_STATUS } from '../../payment/constants';
import { SETTING_KEYS } from '../../settings/constants';

const UPDATE_EARNING_CHANNEL = 'EARNING_CHANNEL';

@Injectable()
export class TransactionEarningListener {
  constructor(
    @Inject(forwardRef(() => SettingService))
    private readonly settingService: SettingService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(EARNING_MODEL_PROVIDER)
    private readonly earningModel: Model<EarningModel>,
    private readonly queueEventService: QueueEventService
  ) {
    this.queueEventService.subscribe(
      TRANSACTION_SUCCESS_CHANNEL,
      UPDATE_EARNING_CHANNEL,
      this.handleListenEarning.bind(this)
    );
  }

  public async handleListenEarning(
    event: QueueEvent
    // transactionPayload: any, eventType?: string
  ): Promise<EarningDto> {
    try {
      if (event.eventName !== EVENT.CREATED) {
        return;
      }
      const transaction = event.data;
      if (!transaction || transaction.status !== PAYMENT_STATUS.SUCCESS) {
        return;
      }
      const [
        performerCommissions,
        settingMonthlyCommission,
        settingYearlyCommission,
        settingProductCommission,
        settingVideoCommission,
        settingTipCommission,
        settingGalleryCommission
      ] = await Promise.all([
        this.performerService.getCommissions(transaction.performerId),
        this.settingService.getKeyValue(
          SETTING_KEYS.MONTHLY_SUBSCRIPTION_COMMISSION
        ),
        this.settingService.getKeyValue(
          SETTING_KEYS.YEARLY_SUBSCRIPTION_COMMISSION
        ),
        this.settingService.getKeyValue(SETTING_KEYS.PRODUCT_SALE_COMMISSION),
        this.settingService.getKeyValue(SETTING_KEYS.VIDEO_SALE_COMMISSION),
        this.settingService.getKeyValue(SETTING_KEYS.TIP_COMMISSION),
        this.settingService.getKeyValue(SETTING_KEYS.GALLERY_SALE_COMMISSION)
      ]);

      let commission = 0.2;
      if (transaction.type === PAYMENT_TYPE.MONTHLY_SUBSCRIPTION) {
        commission = (performerCommissions && performerCommissions.monthlySubscriptionCommission)
          || (settingMonthlyCommission && settingMonthlyCommission)
          || 0.2;
      }
      if (transaction.type === PAYMENT_TYPE.YEARLY_SUBSCRIPTION) {
        commission = (performerCommissions && performerCommissions.yearlySubscriptionCommission)
          || (settingYearlyCommission && settingYearlyCommission)
          || 0.2;
      }
      if (transaction.type === PAYMENT_TYPE.SALE_VIDEO) {
        commission = (performerCommissions && performerCommissions.videoSaleCommission)
          || (settingVideoCommission && settingVideoCommission)
          || 0.2;
      }
      if (transaction.type === PAYMENT_TYPE.SALE_GALLERY) {
        commission = (performerCommissions && performerCommissions.gallerySaleCommission)
          || (settingGalleryCommission && settingGalleryCommission)
          || 0.2;
      }
      if (transaction.type === PAYMENT_TYPE.PRODUCT) {
        commission = (performerCommissions && performerCommissions.productSaleCommission)
          || (settingProductCommission && settingProductCommission)
          || 0.2;
      }
      if (transaction.type === PAYMENT_TYPE.SEND_TIP) {
        commission = (performerCommissions && performerCommissions.tipCommission)
          || (settingTipCommission && settingTipCommission)
          || 0.2;
      }

      const netPrice = transaction.totalPrice - transaction.totalPrice * commission;
      // eslint-disable-next-line new-cap
      const newEarning = new this.earningModel();
      newEarning.set('commission', commission);
      newEarning.set('grossPrice', transaction.totalPrice);
      newEarning.set('netPrice', netPrice);
      newEarning.set('performerId', transaction.performerId);
      newEarning.set('userId', transaction.sourceId);
      newEarning.set('transactionId', transaction._id);
      newEarning.set('sourceType', transaction.target);
      newEarning.set('createdAt', new Date(transaction.createdAt));
      newEarning.set('isPaid', true);
      newEarning.set('transactionStatus', transaction.status);
      await newEarning.save();
    } catch (e) {
      // TODO - log me
      // console.log(e);
    }
  }
}
