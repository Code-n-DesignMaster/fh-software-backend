import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { EntityNotFoundException } from 'src/kernel';
import { SUBSCRIPTION_TYPE } from '../../subscription/constants';
import axios from 'axios';
const querystring = require('querystring');

interface MoonlightSubscription {
  transactionId: string | ObjectId;
  price: number;
  subscriptionType: string;
  paymentToken: string;
}

interface MoonlightSinglePurchase {
  transactionId: string | ObjectId;
  price: number;
  paymentToken: string;
}

@Injectable()
export class MoonlightService {
  public async subscription(options: MoonlightSubscription) {
    console.log('MOONLIGHT', 'subscription', 'options:', options);

    const { transactionId, paymentToken } = options;
    const amount = options.price.toFixed(2);
    const initialPeriod = options.subscriptionType === SUBSCRIPTION_TYPE.MONTHLY ? 30 : 180;

    if (!transactionId || !amount || !paymentToken) {
      throw new EntityNotFoundException();
    }

    let postData = {
      'type': 'sale',
      'billing_method': 'recurring',
      'initiated_by': 'customer',
      'stored_credential_indicator': 'stored',
      'recurring': 'add_subscription',
      'plan_payments': 0,
      'plan_amount': amount,
      'amount': amount,
      'day_frequency': initialPeriod,
      'payment_token': paymentToken,
      'security_key': process.env.MOONLIGHT_SECURITY_KEY,
      'orderid': transactionId.toString()
    };

    return await this.purchase(postData);
  }

  public async cancelSubscription(subscriptionId: string) {
    console.log('MOONLIGHT', 'cancelSubscription', 'subscriptionId:', subscriptionId);

    let postData: any = {
      'recurring': 'delete_subscription',
      'subscription_id': subscriptionId,
      'security_key': process.env.MOONLIGHT_SECURITY_KEY
    };

    return await this.purchase(postData);
  }

  public async singlePurchase(options: MoonlightSinglePurchase) {
    const { transactionId, paymentToken } = options;
    const amount = options.price.toFixed(2);
    if (!transactionId || !amount || !paymentToken) {
      throw new EntityNotFoundException();
    }

    let postData: any = {
      'type': 'sale',
      'amount': amount,
      'payment_token': paymentToken,
      'security_key': process.env.MOONLIGHT_SECURITY_KEY,
      'orderid': transactionId.toString()
    };

    return await this.purchase(postData);
  }

  async purchase(postData: any) {
    console.log('MOONLIGHT', 'purchase', 'postData:', postData);
    postData = querystring.stringify(postData);

    const requestUrl = 'https://allyypay.transactiongateway.com/api/transact.php';

    try {
      const resp = await axios.post(requestUrl, postData, {
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });

      let parsedResponse = querystring.parse(resp.data);
      console.log("parsedResponse:", parsedResponse);

      if (resp.data && parsedResponse && parsedResponse.response=='1') {
        const paymentResponseInfo = {
          transactionId: parsedResponse.orderid,
          subscriptionId: parsedResponse.subscription_id,
          moonlightTransactionId: parsedResponse.transactionid
        }

        return { success: true, transactionId: paymentResponseInfo.transactionId, subscriptionId: paymentResponseInfo.subscriptionId, response: paymentResponseInfo };
      }
    }
    catch (err) {
    }

    return { success: false };
  }


}
