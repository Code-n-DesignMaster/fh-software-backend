import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { QueueEventService, QueueEvent } from 'src/kernel';
import { TRANSACTION_SUCCESS_CHANNEL, PAYMENT_TYPE } from 'src/modules/payment/constants';
import { EVENT } from 'src/kernel/constants';
import { MailerService } from 'src/modules/mailer/services';
import { SettingService } from 'src/modules/settings';
import { PerformerService } from 'src/modules/performer/services';
import { UserService } from 'src/modules/user/services';
import { PAYMENT_STATUS } from '../../payment/constants';

const MAILER_TRANSACTION = 'MAILER_TRANSACTION';

@Injectable()
export class TransactionMailerListener {
  constructor(
    private readonly queueEventService: QueueEventService,
    private readonly mailService: MailerService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService
  ) {
    this.queueEventService.subscribe(
      TRANSACTION_SUCCESS_CHANNEL,
      MAILER_TRANSACTION,
      this.handleMailerTransaction.bind(this)
    );
  }

  public async handleMailerTransaction(event: QueueEvent) {
    try {
      if (![EVENT.CREATED, EVENT.DELETED].includes(event.eventName)) {
        return false;
      }
      const transaction = event.data;
      // TOTO handle more event transaction
      if (transaction.status !== PAYMENT_STATUS.SUCCESS) {
        return false;
      }
      const adminEmail = SettingService.getByKey('adminEmail').value || process.env.ADMIN_EMAIL;
      const performer = await this.performerService.findById(transaction.performerId);
      const user = await this.userService.findById(transaction.sourceId);
      if (!user || !performer) {
        return false;
      }
      // mail to performer
      if (performer.email) {
        if (transaction.type === PAYMENT_TYPE.SEND_TIP) {
          await this.mailService.send({
            subject: 'New payment success',
            to: performer.email,
            data: {
              performer,
              user,
              transactionId: transaction._id.slice(16, 24).toString().toUpperCase(),
              tipamount: transaction.totalPrice,
              tipnote: transaction.note
            },
            template: 'performer-payment-tip-success.html'
          });
        }
        else {
          await this.mailService.send({
            subject: 'New payment success',
            to: performer.email,
            data: {
              performer,
              user,
              transactionId: transaction._id.slice(16, 24).toString().toUpperCase(),
              products: transaction.products
            },
            template: 'performer-payment-success.html'
          });
        }
      }
      // mail to admin
      if (adminEmail) {
        await this.mailService.send({
          subject: 'New payment success',
          to: adminEmail,
          data: {
            performer,
            user,
            transactionId: transaction._id.slice(16, 24).toString().toUpperCase(),
            products: transaction.products
          },
          template: 'admin-payment-success.html'
        });
      }
      // mail to user
      if (user.email) {
        if (transaction.type === PAYMENT_TYPE.SEND_TIP) {
          await this.mailService.send({
            subject: 'New payment success',
            to: user.email,
            data: {
              user,
              transactionId: transaction._id.slice(16, 24).toString().toUpperCase(),
              totalPrice: transaction.totalPrice
            },
            template: 'user-payment-tip-success.html'
          });
        }
        else {
          await this.mailService.send({
            subject: 'New payment success',
            to: user.email,
            data: {
              user,
              transactionId: transaction._id.slice(16, 24).toString().toUpperCase(),
              products: transaction.products
            },
            template: 'user-payment-success.html'
          });
        }
      }
      return true;
    } catch (e) {
      // TODO - log me
      return false;
    }
  }
}
