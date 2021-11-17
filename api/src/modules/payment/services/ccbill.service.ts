import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { EntityNotFoundException } from 'src/kernel';
import { SUBSCRIPTION_TYPE } from '../../subscription/constants';

const crypto = require('crypto');

interface CCBillSubscription {
  salt: string;
  flexformId: string;
  subAccountNumber: string;
  price: number;
  transactionId: string | ObjectId;
  subscriptionType: string;
}

interface CCBillSinglePurchase {
  salt: string;
  flexformId: string;
  subAccountNumber: string;
  transactionId: string | ObjectId;
  price: number;
}

@Injectable()
export class CCBillService {
  public subscription(options: CCBillSubscription) {
    const { transactionId } = options;
    const { salt } = options;
    const { flexformId } = options;
    const { subAccountNumber } = options;
    const initialPrice = options.price.toFixed(2);
    const initialPeriod = options.subscriptionType === SUBSCRIPTION_TYPE.MONTHLY ? 30 : 180;
    const currencyCode = '840'; // usd
    if (!salt || !flexformId || !subAccountNumber || !transactionId || !initialPrice) {
      throw new EntityNotFoundException();
    }
    const formDigest = crypto.createHash('md5')
      .update(`${initialPrice}${initialPeriod}${initialPrice}${initialPeriod}99${currencyCode}${salt}`).digest('hex');
    return {
      paymentUrl: `https://api.ccbill.com/wap-frontflex/flexforms/${flexformId}?transactionId=${transactionId}&initialPrice=${initialPrice}&initialPeriod=${initialPeriod}&recurringPrice=${initialPrice}&recurringPeriod=${initialPeriod}&numRebills=99&clientSubacc=${subAccountNumber}&currencyCode=${currencyCode}&formDigest=${formDigest}`
    };
  }

  public singlePurchase(options: CCBillSinglePurchase) {
    const { transactionId } = options;
    const { salt } = options;
    const { flexformId } = options;
    const { subAccountNumber } = options;
    const initialPrice = options.price.toFixed(2);
    const currencyCode = '840';
    const initialPeriod = 30;
    if (!salt || !flexformId || !subAccountNumber || !transactionId || !initialPrice) {
      throw new EntityNotFoundException();
    }
    const formDigest = crypto.createHash('md5')
      .update(`${initialPrice}${initialPeriod}${currencyCode}${salt}`)
      .digest('hex');
    return {
      paymentUrl: `https://api.ccbill.com/wap-frontflex/flexforms/${flexformId}?transactionId=${transactionId}&initialPrice=${initialPrice}&initialPeriod=${initialPeriod}&clientSubacc=${subAccountNumber}&currencyCode=${currencyCode}&formDigest=${formDigest}`
    };
  }
}
