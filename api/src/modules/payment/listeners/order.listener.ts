import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { QueueEventService, QueueEvent } from 'src/kernel';
import {
  TRANSACTION_SUCCESS_CHANNEL,
  PAYMENT_TYPE
} from 'src/modules/payment/constants';
import { EVENT } from 'src/kernel/constants';
import { ProductService } from 'src/modules/performer-assets/services';
import { OrderDto, PaymentDto } from '../dtos';
import { ORDER_MODEL_PROVIDER } from '../providers';
import { OrderModel } from '../models';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants';
import { PRODUCT_TYPE } from '../../performer-assets/constants';

const ORDER_CHANNEL = 'ORDER_CHANNEL';

@Injectable()
export class OrderListener {
  constructor(
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
    @Inject(ORDER_MODEL_PROVIDER)
    private readonly orderModel: Model<OrderModel>,
    private readonly queueEventService: QueueEventService
  ) {
    this.queueEventService.subscribe(
      TRANSACTION_SUCCESS_CHANNEL,
      ORDER_CHANNEL,
      this.handleListen.bind(this)
    );
  }

  public async handleListen(
    event: QueueEvent
    // transactionPayload: any, eventType?: string
  ): Promise<OrderDto> {
    try {
      if (event.eventName !== EVENT.CREATED) {
        return;
      }
      const transaction = event.data as PaymentDto;
      if (!transaction || transaction.status !== PAYMENT_STATUS.SUCCESS || (transaction && transaction.type !== PAYMENT_TYPE.PRODUCT)) {
        return;
      }
      const proIds = transaction.products.map((p) => p.productId);
      const products = await this.productService.findByIds(proIds);
      const ids = products.map((p) => p.type === PRODUCT_TYPE.PHYSICAL && p._id.toString());
      if (!ids || !ids.length) {
        return;
      }
      let quantity = 0;
      let totalPrice = 0;
      const newProds = transaction.products.filter((p: any) => ids.includes(p.productId));
      newProds.forEach((p) => {
        quantity += p.quantity;
        totalPrice += parseFloat(p.price.toString());
      });

      // delivery address
      const address = transaction.deliveryAddress ? transaction.deliveryAddress : transaction.paymentResponseInfo && `${transaction.paymentResponseInfo.address1}, ${transaction.paymentResponseInfo.city}, ${transaction.paymentResponseInfo.state}, ${transaction.paymentResponseInfo.country}`;

      this.orderModel.create({
        transactionId: transaction._id,
        performerId: transaction.performerId,
        userId: transaction.sourceId,
        orderNumber: transaction._id.toString().slice(16, 24).toUpperCase(),
        shippingCode: '',
        postalCode: (transaction.paymentResponseInfo && transaction.paymentResponseInfo.postalCode) || '',
        productIds: newProds.map((p) => p.productId),
        quantity,
        totalPrice,
        deliveryAddress: address || '',
        deliveryStatus: ORDER_STATUS.PROCESSING,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (e) {
      // TODO - log me
      console.log(e);
    }
  }
}
