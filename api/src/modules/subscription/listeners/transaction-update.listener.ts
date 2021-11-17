import { Injectable, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { QueueEventService, QueueEvent } from 'src/kernel';
import {
  TRANSACTION_SUCCESS_CHANNEL,
  PAYMENT_TYPE
} from 'src/modules/payment/constants';
import { EVENT, STATUS } from 'src/kernel/constants';
import * as moment from 'moment';
import { SubscriptionModel } from '../models/subscription.model';
import { SUBSCRIPTION_MODEL_PROVIDER } from '../providers/subscription.provider';
import { SubscriptionDto } from '../dtos/subscription.dto';
import {
  UPDATE_PERFORMER_SUBSCRIPTION_CHANNEL,
  SUBSCRIPTION_TYPE
} from '../constants';

const UPDATE_SUBSCRIPTION_CHANNEL = 'UPDATE_SUBSCRIPTION_CHANNEL';

@Injectable()
export class TransactionSubscriptionListener {
  constructor(
    @Inject(SUBSCRIPTION_MODEL_PROVIDER)
    private readonly subscriptionModel: Model<SubscriptionModel>,
    private readonly queueEventService: QueueEventService
  ) {
    this.queueEventService.subscribe(
      TRANSACTION_SUCCESS_CHANNEL,
      UPDATE_SUBSCRIPTION_CHANNEL,
      this.handleListenSubscription.bind(this)
    );
  }

  public async handleListenSubscription(
    event: QueueEvent
    // transactionPayload: any, eventType?: string
  ): Promise<SubscriptionDto> {
    try {
      if (![EVENT.CREATED, EVENT.DELETED].includes(event.eventName)) {
        return null;
      }
      // TODO check cancelation or expried date by event.deleted
      const transaction = event.data;
      const performerId = transaction.performerId || transaction.targetId;
      if (
        ![
          PAYMENT_TYPE.MONTHLY_SUBSCRIPTION,
          PAYMENT_TYPE.YEARLY_SUBSCRIPTION
        ].includes(transaction.type)
      ) {
        return null;
      }
      const existSubscription = await this.subscriptionModel.findOne({
        userId: transaction.sourceId,
        performerId: performerId
      });
      const expiredAt = transaction.type === PAYMENT_TYPE.MONTHLY_SUBSCRIPTION
        ? moment()
          .add(30, 'days')
          .toDate()
        : moment()
          .add(180, 'days')
          .toDate();
      const subscriptionType = transaction.type === PAYMENT_TYPE.MONTHLY_SUBSCRIPTION
        ? SUBSCRIPTION_TYPE.MONTHLY
        : SUBSCRIPTION_TYPE.SEMIANNUAL;
      // eslint-disable-next-line no-nested-ternary
      const subscriptionId = transaction.paymentResponseInfo
        ? transaction.paymentResponseInfo.subscriptionId
        : (transaction.paymentResponseInfo
          && transaction.paymentResponseInfo.subscription_id
          ? transaction.paymentResponseInfo.subscription_id
          : null);
      const paymentResponseInfo = transaction.paymentResponseInfo
        ? transaction.paymentResponseInfo
        : ({} as any);
      const { paymentGateway } = transaction;
      const startRecurringDate = paymentResponseInfo.renewalDate || paymentResponseInfo.timestamp;
      const nextRecurringDate = paymentResponseInfo.nextRenewalDate;
      if (existSubscription) {
        existSubscription.expiredAt = new Date(expiredAt);
        existSubscription.updatedAt = new Date();
        existSubscription.subscriptionType = subscriptionType;
        existSubscription.transactionId = transaction._id;
        existSubscription.meta = paymentResponseInfo;
        existSubscription.subscriptionId = subscriptionId;
        existSubscription.paymentGateway = paymentGateway;
        existSubscription.startRecurringDate = startRecurringDate
          ? new Date(startRecurringDate)
          : new Date();
        existSubscription.nextRecurringDate = nextRecurringDate
          ? new Date(nextRecurringDate)
          : new Date(expiredAt);
        existSubscription.status = STATUS.ACTIVE;
        await existSubscription.save();
        return new SubscriptionDto(existSubscription);
      }
      const newSubscription = await this.subscriptionModel.create({
        performerId: performerId,
        userId: transaction.sourceId,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiredAt: new Date(expiredAt),
        subscriptionType,
        subscriptionId,
        meta: paymentResponseInfo,
        paymentGateway,
        startRecurringDate: startRecurringDate
          ? new Date(startRecurringDate)
          : new Date(),
        nextRecurringDate: nextRecurringDate
          ? new Date(nextRecurringDate)
          : new Date(expiredAt),
        transactionId: transaction._id,
        status: STATUS.ACTIVE
      });
      await this.queueEventService.publish(
        new QueueEvent({
          channel: UPDATE_PERFORMER_SUBSCRIPTION_CHANNEL,
          eventName: event.eventName,
          data: new SubscriptionDto(newSubscription)
        })
      );
      return new SubscriptionDto(newSubscription);
    } catch (e) {
      // TODO - log me
      // eslint-disable-next-line no-console
      console.log(e);
      return null;
    }
  }
}
