import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { QueueEventService, QueueEvent } from 'src/kernel';
import { TRANSACTION_SUCCESS_CHANNEL } from 'src/modules/payment/constants';
import { FileDto } from 'src/modules/file';
import { FileService } from 'src/modules/file/services';
import { EVENT } from 'src/kernel/constants';
import { MailerService } from 'src/modules/mailer/services';
import { PerformerService } from 'src/modules/performer/services';
import { UserService } from 'src/modules/user/services';
import { PAYMENT_TYPE } from '../../payment/constants';
import { ProductService } from '../services';

const UPDATE_STOCK_CHANNEL = 'UPDATE_STOCK_CHANNEL';

@Injectable()
export class StockProductListener {
  constructor(
    private readonly queueEventService: QueueEventService,
    private readonly productService: ProductService,
    private readonly mailService: MailerService,
    private readonly fileService: FileService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService
  ) {
    this.queueEventService.subscribe(
      TRANSACTION_SUCCESS_CHANNEL,
      UPDATE_STOCK_CHANNEL,
      this.handleStockProducts.bind(this)
    );
  }

  public async handleStockProducts(event: QueueEvent) {
    try {
      if (![EVENT.CREATED].includes(event.eventName)) {
        return false;
      }
      const transaction = event.data;
      if (transaction.type !== PAYMENT_TYPE.PRODUCT || !transaction.products || !transaction.products.length) {
        return false;
      }
      const prodIds = transaction.products.map((p) => p.productId);
      const performer = await this.performerService.findById(transaction.performerId);
      const user = await this.userService.findById(transaction.sourceId);
      const products = await this.productService.findByIds(prodIds);
      transaction.products.forEach((prd) => {
        this.productService.updateStock(prd.productId, -prd.quantity);
      });
      products.forEach((prod) => {
        if (prod.digitalFileId) {
          this.sendDigitalProductLink(transaction, performer, user, prod.digitalFileId);
        }
      });
      return true;
    } catch (e) {
      // TODO - log me
      return false;
    }
  }

  public async sendDigitalProductLink(transaction, performer, user, fileId) {
    const file = await this.fileService.findById(fileId);
    if (file) {
      const digitalLink = new FileDto(file).getUrl();
      this.mailService.send({
        subject: 'Digital file',
        to: user.email,
        data: {
          performer,
          user,
          transaction,
          digitalLink
        },
        template: 'send-user-digital-product.html'
      });
    }
  }
}
