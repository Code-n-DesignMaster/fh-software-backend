import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException,
  HttpException
} from '@nestjs/common';
import { PerformerService } from 'src/modules/performer/services';
import {
  VideoService,
  ProductService,
  GalleryService
} from 'src/modules/performer-assets/services';
import { CCBillService } from './ccbill.service';
import { UserDto } from 'src/modules/user/dtos';
import { CouponDto } from 'src/modules/coupon/dtos';
import {
  EntityNotFoundException,
  QueueEventService,
  QueueEvent
} from 'src/kernel';
import { EVENT } from 'src/kernel/constants';
import { PAYMENT_TRANSACTION_MODEL_PROVIDER } from '../providers';
import { PERFORMER_VIDEO_MODEL_PROVIDER,PERFORMER_GALLERY_MODEL_PROVIDER } from '../../performer-assets/providers';
import { Model } from 'mongoose';
import { PaymentTransactionModel } from '../models';
import {
  SubscribePerformerPayload,
  PurchaseProductsPayload,
  PurchaseVideoPayload,
  PurchaseGalleryPayload,
  SendTipPayload
} from '../payloads';
import { SUBSCRIPTION_TYPE } from '../../subscription/constants';
import {
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  PAYMENT_TARTGET_TYPE,
  TRANSACTION_SUCCESS_CHANNEL,
  PAYMENT_PROVIDER,
} from '../constants';
import {
  OverProductStockException,
  DifferentPerformerException,
  MissingConfigPaymentException
} from '../exceptions';
import { ObjectId } from 'mongodb';
import { CouponService } from 'src/modules/coupon/services';
import { SubscriptionService } from '../../subscription/services/subscription.service';
import { SettingService } from 'src/modules/settings';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import axios from 'axios';
import { SubscriptionDto } from 'src/modules/subscription/dtos/subscription.dto';
import { UPDATE_PERFORMER_SUBSCRIPTION_CHANNEL, SUBSCRIPTION_STATUS} from 'src/modules/subscription/constants';
import {SYS_NOTIFICATION_CHANNEL, MESSAGE_TYPE} from 'src/modules/message/constants';
import { ConversationService } from 'src/modules/message/services/conversation.service';
import { MessageService } from 'src/modules/message/services/message.service';
import { toObjectId } from 'src/kernel/helpers/string.helper';
import { FileDto } from 'src/modules/file/dtos/file.dto';
import { MessageCreatePayload } from 'src/modules/message/payloads/message-create.payload';
import { MoonlightService } from './moonlight.service';

const ccbillCancelUrl = 'https://datalink.ccbill.com/utils/subscriptionManagement.cgi';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PERFORMER_GALLERY_MODEL_PROVIDER)
    private readonly galleryService: GalleryService,
    @Inject(PERFORMER_VIDEO_MODEL_PROVIDER)
    private readonly videoService: VideoService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
    @Inject(forwardRef(() => CouponService))
    private readonly couponService: CouponService,
    @Inject(PAYMENT_TRANSACTION_MODEL_PROVIDER)
    private readonly paymentTransactionModel: Model<PaymentTransactionModel>,
    private readonly ccbillService: CCBillService,
    private readonly moonlightService: MoonlightService,
    private readonly queueEventService: QueueEventService,
    private readonly subscriptionService: SubscriptionService,
    private readonly settingService: SettingService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService
  ) { }

  public async findById(id: string | ObjectId) {
    return this.paymentTransactionModel.findById(id);
  }

  public async subscribePerformer(
    payload: SubscribePerformerPayload,
    user: UserDto
  ) {
    const { type, performerId } = payload;
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    let ccbillFlexformId: string;
    let ccbillSubAccountNumber: string;
    let ccbillSalt: string;
    if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.CCBILL){
      const performerPaymentSetting = await this.performerService.getPaymentSetting(
        performerId,
        PAYMENT_PROVIDER.CCBILL
      );
      ccbillFlexformId = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.flexformId ? performerPaymentSetting.value.flexformId : null;
      ccbillSubAccountNumber = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.subscriptionSubAccountNumber ? performerPaymentSetting.value.subscriptionSubAccountNumber : null;
      ccbillSalt = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.salt ? performerPaymentSetting.value.salt : null;

      if (!ccbillFlexformId || !ccbillSubAccountNumber || !ccbillSalt) {
        ccbillSubAccountNumber = process.env.WEBSITE=='honeydrip' ? await this.settingService.getKeyValue('ccbillHoneyDripSubAccountNumber') : await this.settingService.getKeyValue('ccbillSubAccountNumber');
        ccbillFlexformId = await this.settingService.getKeyValue('ccbillFlexformId');
        ccbillSalt = await this.settingService.getKeyValue('ccbillSalt');
        if (!ccbillFlexformId || !ccbillSubAccountNumber || !ccbillSalt) {
          throw new MissingConfigPaymentException();
        }
      }
    }

    const transaction = await this.createSubscriptionPaymentTransaction(
      type,
      performer,
      user
    );

    let price = (type === SUBSCRIPTION_TYPE.MONTHLY) ? parseFloat(performer.monthlyPrice.toFixed(2)) : parseFloat(performer.yearlyPrice.toFixed(2));

    if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.CCBILL){
      return this.ccbillService.subscription({
        salt: ccbillSalt,
        flexformId: ccbillFlexformId,
        subAccountNumber: ccbillSubAccountNumber,
        price: price,
        transactionId: transaction._id,
        subscriptionType: type
      });  
    }
    else if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.MOONLIGHT){
      const resp = await this.moonlightService.subscription({
        price: price,
        transactionId: transaction._id,
        subscriptionType: type,
        paymentToken: payload.paymentToken
      });  

      console.log('!! SUB', 'resp', resp);

      if (resp.success && resp.response){
        transaction.paymentResponseInfo = resp.response;
        await transaction.save();

        console.log('!!! SUB', 'transaction', transaction);
      }

      return resp;
    }
  }

  public async createSubscriptionPaymentTransaction(type, performer, user) {
    // eslint-disable-next-line new-cap
    const paymentTransaction = new this.paymentTransactionModel();
    paymentTransaction.paymentGateway = process.env.PAYMENT_PROVIDER;
    paymentTransaction.source = 'user';
    paymentTransaction.sourceId = user._id;
    paymentTransaction.target = PAYMENT_TARTGET_TYPE.PERFORMER;
    paymentTransaction.targetId = performer._id;
    paymentTransaction.performerId = performer._id;
    paymentTransaction.type = type === SUBSCRIPTION_TYPE.MONTHLY
      ? PAYMENT_TYPE.MONTHLY_SUBSCRIPTION
      : PAYMENT_TYPE.YEARLY_SUBSCRIPTION;
    (paymentTransaction.totalPrice = type === SUBSCRIPTION_TYPE.MONTHLY
      ? performer.monthlyPrice.toFixed(2)
      : performer.yearlyPrice.toFixed(2));
    (paymentTransaction.products = [
      {
        name: performer.username,
        description: `${type}_subscription ${performer.username}`,
        price:
            type === SUBSCRIPTION_TYPE.MONTHLY
              ? performer.monthlyPrice.toFixed(2)
              : performer.yearlyPrice.toFixed(2),
        productId: performer._id,
        productType: PAYMENT_TARTGET_TYPE.PERFORMER,
        performerId: performer._id,
        quantity: 1
      }
    ]);
    paymentTransaction.paymentResponseInfo = {};
    paymentTransaction.status = PAYMENT_STATUS.PENDING;
    paymentTransaction.createdAt = new Date();
    paymentTransaction.updatedAt = new Date();
    return paymentTransaction.save();
  }

  public async createRenewalPaymentTransaction(transaction, payload) {
    // eslint-disable-next-line new-cap

    const paymentTransaction = new this.paymentTransactionModel();
    paymentTransaction.paymentGateway = transaction.paymentGateway ? transaction.paymentGateway : process.env.PAYMENT_PROVIDER;
    paymentTransaction.source = 'user';
    paymentTransaction.sourceId = transaction.sourceId;
    paymentTransaction.target = PAYMENT_TARTGET_TYPE.PERFORMER;
    paymentTransaction.targetId = transaction.targetId;
    paymentTransaction.type = transaction.type;
    paymentTransaction.totalPrice = transaction.totalPrice;
    paymentTransaction.products = [
      {
        name: transaction.products[0].name,
        description: `renewal ${transaction.products[0].description}`,
        price: transaction.totalPrice,
        productId: transaction.targetId,
        productType: PAYMENT_TARTGET_TYPE.PERFORMER,
        performerId: transaction.targetId,
        quantity: 1
      }
    ];
    if (paymentTransaction.paymentGateway == PAYMENT_PROVIDER.CCBILL){
      paymentTransaction.paymentResponseInfo = payload;
    }
    else if (paymentTransaction.paymentGateway == PAYMENT_PROVIDER.MOONLIGHT){
      paymentTransaction.paymentResponseInfo = {
        transactionId: payload.event_body.order_id,
        subscriptionId: transaction.paymentResponseInfo.subscriptionId,
        moonlightTransactionId: payload.event_body.transaction_id || payload.event_body.transactionid || paymentTransaction.paymentResponseInfo.moonlightTransactionId
      }
    }
    paymentTransaction.status = PAYMENT_STATUS.PENDING;
    paymentTransaction.createdAt = new Date();
    paymentTransaction.updatedAt = new Date();

    return paymentTransaction.save();
  }

  public async createTipModelPaymentTransaction(
    performer,
    user,
    payload
  ){
    const paymentTransaction = new this.paymentTransactionModel();
    paymentTransaction.originalPrice = payload.amount.toFixed(2);
    paymentTransaction.note = payload.note;
    paymentTransaction.paymentGateway = process.env.PAYMENT_PROVIDER;
    paymentTransaction.source = 'user';
    paymentTransaction.sourceId = user._id;
    paymentTransaction.target = PAYMENT_TARTGET_TYPE.PERFORMER_TIP;
    paymentTransaction.targetId = performer._id;
    paymentTransaction.performerId = performer._id;
    paymentTransaction.type = PAYMENT_TYPE.SEND_TIP;
    paymentTransaction.products = [
      {
        name: performer.username,
        description: payload.note,
        price: payload.amount.toFixed(2),
        productId: performer._id,
        productType: PAYMENT_TARTGET_TYPE.PERFORMER_TIP,
        quantity: 1
      }
    ];
    paymentTransaction.totalPrice = payload.amount.toFixed(2);
    paymentTransaction.paymentResponseInfo = {};
    paymentTransaction.status = PAYMENT_STATUS.PENDING;
    paymentTransaction.createdAt = new Date();
    paymentTransaction.updatedAt = new Date();
    return await paymentTransaction.save();
  }
  
    public async createSaleGalleryPaymentTransaction(
    gallery,
    user,
    couponInfo?: CouponDto
  ){
    const paymentTransaction = new this.paymentTransactionModel();
    paymentTransaction.originalPrice = gallery.price.toFixed(2);
    paymentTransaction.paymentGateway = process.env.PAYMENT_PROVIDER;
    paymentTransaction.source = 'user';
    paymentTransaction.sourceId = user._id;
    paymentTransaction.target = PAYMENT_TARTGET_TYPE.GALLERY;
    paymentTransaction.targetId = gallery._id;
    paymentTransaction.performerId = gallery.performerId;
    paymentTransaction.type = PAYMENT_TYPE.SALE_GALLERY;
    paymentTransaction.products = [
      {
        name: gallery.name,
        description: `purchase gallery ${gallery.name}`,
        price: gallery.price.toFixed(2),
        productId: gallery._id,
        productType: PAYMENT_TARTGET_TYPE.GALLERY,
        performerId: gallery.performerId,
        quantity: 1
      }
    ];
    paymentTransaction.totalPrice = couponInfo
    ? gallery.price.toFixed(2) -
    parseFloat((gallery.price * couponInfo.value).toFixed(2))
    : gallery.price.toFixed(2);
    paymentTransaction.paymentResponseInfo = {};
    paymentTransaction.status = PAYMENT_STATUS.PENDING;
    paymentTransaction.couponInfo = couponInfo || null;
    paymentTransaction.createdAt = new Date();
    paymentTransaction.updatedAt = new Date();
    return await paymentTransaction.save();
  }

  public async createSaleVideoPaymentTransaction(
    video,
    user,
    couponInfo?: CouponDto
  ) {
    // eslint-disable-next-line new-cap
    const paymentTransaction = new this.paymentTransactionModel();
    paymentTransaction.originalPrice = video.price.toFixed(2);
    paymentTransaction.paymentGateway = process.env.PAYMENT_PROVIDER;
    paymentTransaction.source = 'user';
    paymentTransaction.sourceId = user._id;
    paymentTransaction.target = PAYMENT_TARTGET_TYPE.VIDEO;
    paymentTransaction.targetId = video._id;
    paymentTransaction.performerId = video.performerId;
    paymentTransaction.type = PAYMENT_TYPE.SALE_VIDEO;
    paymentTransaction.products = [
      {
        name: video.title,
        description: `purchase video ${video.title}`,
        price: video.price.toFixed(2),
        productId: video._id,
        productType: PAYMENT_TARTGET_TYPE.VIDEO,
        performerId: video.performerId,
        quantity: 1
      }
    ];
    paymentTransaction.totalPrice = couponInfo
      ? video.price.toFixed(2)
      - parseFloat((video.price * couponInfo.value).toFixed(2))
      : video.price.toFixed(2);
    paymentTransaction.paymentResponseInfo = {};
    paymentTransaction.status = PAYMENT_STATUS.PENDING;
    paymentTransaction.couponInfo = couponInfo || null;
    paymentTransaction.createdAt = new Date();
    paymentTransaction.updatedAt = new Date();
    return paymentTransaction.save();
  }

  public async sendTipModel(
    id: string | ObjectId,
    user: UserDto,
    payload?: SendTipPayload
  ) {
    const performerId = id;
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    let ccbillFlexformId: string;
    let ccbillSubAccountNumber: string;
    let ccbillSalt: string;
    if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.CCBILL){
      const performerPaymentSetting = await this.performerService.getPaymentSetting(
        performerId,
        'ccbill'
      );
      ccbillFlexformId = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.flexformId ? performerPaymentSetting.value.flexformId : null;
      ccbillSubAccountNumber = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.singlePurchaseSubAccountNumber ? performerPaymentSetting.value.singlePurchaseSubAccountNumber : null;
      ccbillSalt = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.salt ? performerPaymentSetting.value.salt : null;
      if (!ccbillFlexformId || !ccbillSubAccountNumber || !ccbillSalt) {
        ccbillSubAccountNumber = process.env.WEBSITE=='honeydrip' ? await this.settingService.getKeyValue('ccbillHoneyDripPurAccountNumber') : await this.settingService.getKeyValue('ccbillPurAccountNumber');
        ccbillFlexformId = await this.settingService.getKeyValue('ccbillFlexformId');
        ccbillSalt = await this.settingService.getKeyValue('ccbillSalt'); 
        if (!ccbillFlexformId || !ccbillSubAccountNumber || !ccbillSalt) {
          throw new EntityNotFoundException();
        }
      }
    }

    const transaction = await this.createTipModelPaymentTransaction(
      performer,
      user,
      payload
    );

    const price = parseFloat(payload.amount.toFixed(2));

    if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.CCBILL){
      return this.ccbillService.singlePurchase({
        salt: ccbillSalt,
        flexformId: ccbillFlexformId,
        subAccountNumber: ccbillSubAccountNumber,
        price: price,
        transactionId: transaction._id
      });
    }
    else if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.MOONLIGHT){
      return this.moonlightService.singlePurchase({
        paymentToken: payload.paymentToken,
        price: price,
        transactionId: transaction._id
      })
    }
  }
  
  public async purchaseGallery(
    id: string | ObjectId,
    user: UserDto,
    payload?: PurchaseGalleryPayload
  ) {
    const gallery = await this.galleryService.findById(id);
    if (!gallery || (gallery && !gallery.isSaleGallery) || (gallery && !gallery.price)) {
      throw new EntityNotFoundException();
    }
    const performerId = gallery.performerId;
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }


    let ccbillFlexformId: string;
    let ccbillSubAccountNumber: string;
    let ccbillSalt: string;
    if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.CCBILL){
      const performerPaymentSetting = await this.performerService.getPaymentSetting(
        performerId,
        'ccbill'
      );
      ccbillFlexformId = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.flexformId ? performerPaymentSetting.value.flexformId : null;
      ccbillSubAccountNumber = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.singlePurchaseSubAccountNumber ? performerPaymentSetting.value.singlePurchaseSubAccountNumber : null;
      ccbillSalt = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.salt ? performerPaymentSetting.value.salt : null;
      if (!ccbillFlexformId || !ccbillSubAccountNumber || !ccbillSalt) {
        ccbillSubAccountNumber = process.env.WEBSITE=='honeydrip' ? await this.settingService.getKeyValue('ccbillHoneyDripPurAccountNumber') : await this.settingService.getKeyValue('ccbillPurAccountNumber');
          ccbillFlexformId = await this.settingService.getKeyValue('ccbillFlexformId');
          ccbillSalt = await this.settingService.getKeyValue('ccbillSalt'); 
        if (!ccbillFlexformId || !ccbillSubAccountNumber || !ccbillSalt) {
          throw new EntityNotFoundException();
        }
      }
    }

    let coupon = null;
    if (payload.couponCode) {
      coupon = await this.couponService.applyCoupon(
        payload.couponCode,
        user._id
      );
    }
    const transaction = await this.createSaleGalleryPaymentTransaction(
      gallery,
      user,
      coupon
    );

    const price = coupon ? parseFloat(gallery.price.toFixed(2)) - parseFloat((gallery.price * coupon.value).toFixed(2)) : parseFloat(gallery.price.toFixed(2));

    if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.CCBILL){
      return this.ccbillService.singlePurchase({
        salt: ccbillSalt,
        flexformId: ccbillFlexformId,
        subAccountNumber: ccbillSubAccountNumber,
        price: price,
        transactionId: transaction._id
      });
    }
    else if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.MOONLIGHT){
      return this.moonlightService.singlePurchase({
        paymentToken: payload.paymentToken,
        price: price,
        transactionId: transaction._id
      })
    }
  }

  public async purchaseVideo(
    id: string | ObjectId,
    user: UserDto,
    payload?: PurchaseVideoPayload
  ) {
    const video = await this.videoService.findById(id);
    if (!video || (video && !video.isSaleVideo) || (video && !video.price)) {
      throw new EntityNotFoundException();
    }
    const { performerId } = video;
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    let ccbillFlexformId: string;
    let ccbillSubAccountNumber: string;
    let ccbillSalt: string;
    if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.CCBILL){
      const performerPaymentSetting = await this.performerService.getPaymentSetting(
        performerId,
        'ccbill'
      );
      ccbillFlexformId = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.flexformId ? performerPaymentSetting.value.flexformId : null;
      ccbillSubAccountNumber = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.singlePurchaseSubAccountNumber ? performerPaymentSetting.value.singlePurchaseSubAccountNumber : null;
      ccbillSalt = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.salt ? performerPaymentSetting.value.salt : null;
  
      if (!ccbillFlexformId || !ccbillSubAccountNumber || !ccbillSalt) {
        ccbillSubAccountNumber = process.env.WEBSITE=='honeydrip' ? await this.settingService.getKeyValue('ccbillHoneyDripPurAccountNumber') : await this.settingService.getKeyValue('ccbillPurAccountNumber');
        ccbillFlexformId = await this.settingService.getKeyValue('ccbillFlexformId');
        ccbillSalt = await this.settingService.getKeyValue('ccbillSalt'); 
        if (!ccbillFlexformId || !ccbillSubAccountNumber || !ccbillSalt) {
        throw new EntityNotFoundException();
        }
      }
    }


    let coupon = null;
    if (payload.couponCode) {
      coupon = await this.couponService.applyCoupon(
        payload.couponCode,
        user._id
      );
    }
    const transaction = await this.createSaleVideoPaymentTransaction(
      video,
      user,
      coupon
    );
    
    const price = coupon ? parseFloat(video.price.toFixed(2)) - parseFloat((video.price * coupon.value).toFixed(2)) : parseFloat(video.price.toFixed(2));
    if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.CCBILL){
      return this.ccbillService.singlePurchase({
        salt: ccbillSalt,
        flexformId: ccbillFlexformId,
        subAccountNumber: ccbillSubAccountNumber,
        price: price,
        transactionId: transaction._id
      });
    }
    else if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.MOONLIGHT){
      return this.moonlightService.singlePurchase({
        paymentToken: payload.paymentToken,
        price: price,
        transactionId: transaction._id
      })
    }
  }

  public async createProductsPaymentTransaction(
    products: any[],
    totalPrice: number,
    user: UserDto,
    couponInfo?: CouponDto,
    deliveryAddress?: string
  ) {
    // eslint-disable-next-line new-cap
    const paymentTransaction = new this.paymentTransactionModel();
    paymentTransaction.originalPrice = totalPrice;
    if (couponInfo) {
      // eslint-disable-next-line no-param-reassign
      totalPrice -= parseFloat((totalPrice * couponInfo.value).toFixed(2));
    }
    paymentTransaction.paymentGateway = process.env.PAYMENT_PROVIDER;
    paymentTransaction.source = 'user';
    paymentTransaction.sourceId = user._id;
    paymentTransaction.target = PAYMENT_TARTGET_TYPE.PRODUCT;
    paymentTransaction.targetId = products[0].performerId
      ? products[0].performerId
      : null;
    paymentTransaction.performerId = products[0].performerId
      ? products[0].performerId
      : null;
    paymentTransaction.type = PAYMENT_TYPE.PRODUCT;
    paymentTransaction.totalPrice = totalPrice;
    paymentTransaction.products = products;
    paymentTransaction.paymentResponseInfo = {};
    paymentTransaction.status = PAYMENT_STATUS.PENDING;
    paymentTransaction.couponInfo = couponInfo || null;
    paymentTransaction.deliveryAddress = deliveryAddress || '';
    paymentTransaction.createdAt = new Date();
    paymentTransaction.updatedAt = new Date();
    return paymentTransaction.save();
  }

  public async purchaseProducts(
    payload: PurchaseProductsPayload,
    user: UserDto
  ) {
    const { products, deliveryAddress } = payload;
    const productIds = payload.products.map((p) => p._id);
    const prods = await this.productService.findByIds(productIds);
    if (!products.length || !prods.length) {
      throw new EntityNotFoundException();
    }
    const checkSamePerformerProducts = prods.filter((p) => p.performerId.toString() === prods[0].performerId.toString());
    if (checkSamePerformerProducts.length !== prods.length) {
      throw new DifferentPerformerException();
    }
    const { performerId } = prods[0];
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    let ccbillFlexformId: string;
    let ccbillSubAccountNumber: string;
    let ccbillSalt: string;
    if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.CCBILL){
      const performerPaymentSetting = await this.performerService.getPaymentSetting(
        performerId,
        'ccbill'
      );
      ccbillFlexformId = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.flexformId ? performerPaymentSetting.value.flexformId : null;
      ccbillSubAccountNumber = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.singlePurchaseSubAccountNumber ? performerPaymentSetting.value.singlePurchaseSubAccountNumber : null;
      ccbillSalt = performerPaymentSetting && performerPaymentSetting.value && performerPaymentSetting.value.salt ? performerPaymentSetting.value.salt : null;

      if (!ccbillFlexformId || !ccbillSubAccountNumber || !ccbillSalt) {
        ccbillSubAccountNumber = process.env.WEBSITE=='honeydrip' ? await this.settingService.getKeyValue('ccbillHoneyDripPurAccountNumber') : await this.settingService.getKeyValue('ccbillPurAccountNumber');
        ccbillFlexformId = await this.settingService.getKeyValue('ccbillFlexformId');
        ccbillSalt = await this.settingService.getKeyValue('ccbillSalt');
        if (!ccbillFlexformId || !ccbillSubAccountNumber || !ccbillSalt) { 
        throw new EntityNotFoundException();
        }
      }
    }

    const storeProducts = [];
    let totalPrice = 0;
    // TOTO check coupon code for future use
    prods.forEach((p) => {
      const prd = products.find(
        (prod) => prod._id.toString() === p._id.toString()
      );
      const quantity = prd.quantity ? prd.quantity : 1;
      if (quantity > p.stock) {
        throw new OverProductStockException();
      }
      totalPrice += parseFloat((quantity * p.price).toFixed(2));
      storeProducts.push({
        price: (quantity * p.price).toFixed(2),
        quantity,
        name: p.name,
        description: `purchase product ${p.name} (x${quantity})`,
        productId: p._id,
        productType: PAYMENT_TARTGET_TYPE.PRODUCT,
        performerId: p.performerId
      });
    });
    let coupon = null;
    if (payload.couponCode) {
      coupon = await this.couponService.applyCoupon(
        payload.couponCode,
        user._id
      );
    }
    const transaction = await this.createProductsPaymentTransaction(
      storeProducts,
      totalPrice,
      user,
      coupon,
      deliveryAddress
    );

    const price = coupon ? (totalPrice - totalPrice * coupon.value) : totalPrice;

    if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.CCBILL){
      return this.ccbillService.singlePurchase({
        salt: ccbillSalt,
        flexformId: ccbillFlexformId,
        subAccountNumber: ccbillSubAccountNumber,
        price: price,
        transactionId: transaction._id
      });
    }
    else if (process.env.PAYMENT_PROVIDER == PAYMENT_PROVIDER.MOONLIGHT){
      return this.moonlightService.singlePurchase({
        price: price,
        transactionId: transaction._id,
        paymentToken: payload.paymentToken
      });
    }
  }

  public async singlePaymentSuccessWebhook(payload: Record<string, any>) {
    const transactionId = payload['X-transactionId'] || payload.transactionId || payload.event_body.order_id;
    if (!transactionId) {
      throw new BadRequestException();
    }
    const checkForHexRegExp = new RegExp('^[0-9a-fA-F]{24}$');
    if (!checkForHexRegExp.test(transactionId)) {
      return { ok: false };
    }
    const transaction = await this.paymentTransactionModel.findById(
      transactionId
    );
    if (!transaction) {
      return { ok: false };
    }
    transaction.status = PAYMENT_STATUS.SUCCESS;
    transaction.paymentResponseInfo = payload;
    transaction.updatedAt = new Date();
    await transaction.save();
    if(transaction.type === PAYMENT_TYPE.SEND_TIP){
      await this.queueEventService.publish(
        new QueueEvent({
          channel: SYS_NOTIFICATION_CHANNEL,
          eventName: EVENT.CREATED,
          data: transaction
        })
      );
    }
     
    await this.queueEventService.publish(
      new QueueEvent({
        channel: TRANSACTION_SUCCESS_CHANNEL,
        eventName: EVENT.CREATED,
        data: transaction
      })
    );

    //const subscriptionId = payload['subscriptionId'] || payload.subscriptionId || payload.subscription_id;
    if (transaction.type === PAYMENT_TYPE.SEND_TIP) {
      const sender = {
        source: transaction.source,
        sourceId: transaction.sourceId
      };    
      const receiver = {
        source: 'performer',
        sourceId: toObjectId(transaction.targetId)
      };
      
      const messagePayload = new MessageCreatePayload();
      messagePayload.text = transaction.note ? transaction.note : "";
      messagePayload.tipAmount = transaction.totalPrice;
      messagePayload.type = MESSAGE_TYPE.TIPAUTO;
      await this.conversationService.createPrivateConversation(sender, receiver);
      const recepients = [];
      recepients.push(receiver);
      await this.messageService.createPrivateMessageFromConversation(messagePayload, sender, recepients);
    }
    else if(transaction.type === PAYMENT_TYPE.MONTHLY_SUBSCRIPTION || transaction.type === PAYMENT_TYPE.YEARLY_SUBSCRIPTION){
      const sender = {
        source: transaction.target,
        sourceId: transaction.targetId
      };
      const receiver = {
        source: transaction.source,
        sourceId: toObjectId(transaction.sourceId)
      };
  
      const performer = await this.performerService.findById(transaction.targetId);
      if(performer && performer.enableWelcomeMessage){
      const file = new FileDto();    
      if(performer.welcomeMessageMimeType && performer.welcomeMessageMimeType.includes("image")){
        file._id = performer.welcomeImgfileId;
        file.mimeType = performer.welcomeMessageMimeType;
        file.path = performer.welcomeImgPath;
      }
      else if(performer.welcomeMessageMimeType && performer.welcomeMessageMimeType.includes("video")){
        file._id = performer.welcomeMessageVideoId;
        file.mimeType = performer.welcomeMessageMimeType;
        file.path = performer.welcomeMessageVideoPath;
      }
      const messagePayload = new MessageCreatePayload();
      messagePayload.type =  MESSAGE_TYPE.SUBAUTO;
      messagePayload.text = performer.welcomeMessage;
      let recipients = [];
      recipients.push(receiver);
      await this.messageService.createPrivateFileMessage(sender, recipients, file, messagePayload);
      }
    }
    return { ok: true };
  }

  public async successWebhook(payload: Record<string, any>, transactionId: string) {
    if (!transactionId) {
      throw new BadRequestException();
    }
    const checkForHexRegExp = new RegExp('^[0-9a-fA-F]{24}$');
    if (!checkForHexRegExp.test(transactionId)) {
      return { ok: false };
    }
    const transaction = await this.paymentTransactionModel.findById(
      transactionId
    );
    if (!transaction) {
      return { ok: false };
    }

    if (transaction.type === PAYMENT_TYPE.MONTHLY_SUBSCRIPTION || transaction.type === PAYMENT_TYPE.YEARLY_SUBSCRIPTION) {
      return await this.renewalSuccessWebhook(payload);
    }
    else{
      return await this.singlePaymentSuccessWebhook(payload);
    }
  }

  public async renewalSuccessWebhook(payload: any) {
    let transaction: PaymentTransactionModel;
    const transacitonId = payload.event_body.order_id;
    if (transacitonId != undefined){
      transaction = await this.paymentTransactionModel.findById(transacitonId);
    }
    else{
      const subscriptionId = payload.subscriptionId || payload.subscription_id || transaction.paymentResponseInfo.subscriptionId;
      if (!subscriptionId) {
        throw new BadRequestException();
      }
      transaction = await this.paymentTransactionModel.findOne({
        'paymentResponseInfo.subscriptionId': subscriptionId
      });
    }
    if (!transaction) {
      return { ok: false };
    }
    const newTransaction = await this.createRenewalPaymentTransaction(
      transaction,
      payload
    );
    await this.queueEventService.publish(
      new QueueEvent({
        channel: TRANSACTION_SUCCESS_CHANNEL,
        eventName: EVENT.CREATED,
        data: newTransaction
      })
    );
   
    return { ok: true };
  }

  public async cancelSubscription(performerId: any, user: UserDto) {
    const subscription = await this.subscriptionService.findOneSubscription(performerId, user._id);
    if (!subscription || !subscription.transactionId) {
      throw new EntityNotFoundException();
    }
    const transaction = await this.findById(subscription.transactionId);        
    if (!transaction || !transaction.paymentResponseInfo || !transaction.paymentResponseInfo.subscriptionId) {
      subscription.status = SUBSCRIPTION_STATUS.DEACTIVATED;
      subscription.updatedAt = new Date();
      await subscription.save();
      return { success: true };
    }

    let info;

    if (transaction.paymentGateway == PAYMENT_PROVIDER.CCBILL){
      let { subscriptionId, clientAccnum, clientSubacc } = transaction.paymentResponseInfo;  
      let ccbillClientAccNo = clientAccnum ? clientAccnum : await this.settingService.getKeyValue(SETTING_KEYS.CCBILL_CLIENT_ACCOUNT_NUMBER);
      const ccbillUserName = process.env.CCBILL_USERNAME;
      const ccbillPWD = process.env.CCBILL_PASSWORD;
      if (!ccbillClientAccNo || !clientSubacc || !ccbillUserName || !ccbillPWD) {
        throw new EntityNotFoundException();
      }

      try {
        //const resp = await axios.get(`${ccbillCancelUrl}?subscriptionId=${subscriptionId}&action=cancelSubscription&clientAccnum=${ccbillClientAccNo}`); 
        const resp = await axios.get(`${ccbillCancelUrl}?clientSubacc=&usingSubacc=${clientSubacc}&subscriptionId=${subscriptionId}&username=${ccbillUserName}&password=${ccbillPWD}&action=cancelSubscription&clientAccnum=${ccbillClientAccNo}`);
        if (resp.data && resp.data.includes('"results"\n"1"\n')) {
          info = { success: true };
        }
        else{
          info = { success: false };
        }
      } catch (e) {
        throw new HttpException(e, 400);
      }
    }
    else if (transaction.paymentGateway == PAYMENT_PROVIDER.MOONLIGHT){
      const subscriptionId = transaction.paymentResponseInfo.subscriptionId;
      console.log('cancelSubscription', 'subscriptionId', subscriptionId);
      info = await this.moonlightService.cancelSubscription(subscriptionId);
    }

    console.log('cancelSubscription', 'info', info);

    if (info.success == true){
      await this.queueEventService.publish(
        new QueueEvent({
          channel: UPDATE_PERFORMER_SUBSCRIPTION_CHANNEL,
          eventName: EVENT.DELETED,
          data: new SubscriptionDto(subscription)
        })
      );
      subscription.status = SUBSCRIPTION_STATUS.DEACTIVATED;
      subscription.updatedAt = new Date();
      await subscription.save();

      transaction.status = PAYMENT_STATUS.CANCELLED;
      transaction.updatedAt = new Date();
      await transaction.save();
    }

    return info;
  }

  public async adminCancelSubscription(id: string) {
    const subscription = await this.subscriptionService.findById(id);
    if (!subscription) {
      throw new EntityNotFoundException();
    }
    if (subscription && !subscription.transactionId) {
      subscription.status = SUBSCRIPTION_STATUS.DEACTIVATED;
      subscription.updatedAt = new Date();
      await subscription.save();
      return { success: true };
    }
    const transaction = await this.findById(subscription.transactionId);
    if (!transaction || !transaction.paymentResponseInfo || !transaction.paymentResponseInfo.subscriptionId) {
      subscription.status = SUBSCRIPTION_STATUS.DEACTIVATED;
      subscription.updatedAt = new Date();
      await subscription.save();
      return { success: true };
    }
    let { subscriptionId, clientAccnum, clientSubacc  } = transaction.paymentResponseInfo;

    if (transaction.paymentGateway == PAYMENT_PROVIDER.CCBILL){
      let ccbillClientAccNo = clientAccnum ? clientAccnum : await this.settingService.getKeyValue(SETTING_KEYS.CCBILL_CLIENT_ACCOUNT_NUMBER);
      const ccbillUserName = process.env.CCBILL_USERNAME;
      const ccbillPWD = process.env.CCBILL_PASSWORD;
      if (!ccbillClientAccNo || !clientSubacc || !ccbillUserName || !ccbillPWD) {
        throw new EntityNotFoundException();
      }
      try {
        //const resp = await axios.get(`${ccbillCancelUrl}?subscriptionId=${subscriptionId}&action=cancelSubscription&clientAccnum=${ccbillClientAccNo}`);
        const resp = await axios.get(`${ccbillCancelUrl}?clientSubacc=&usingSubacc=${clientSubacc}&subscriptionId=${subscriptionId}&username=${ccbillUserName}&password=${ccbillPWD}&action=cancelSubscription&clientAccnum=${ccbillClientAccNo}`);
        if (resp.data && resp.data.includes('"results"\n"1"\n')) {
          await this.queueEventService.publish(
            new QueueEvent({
              channel: UPDATE_PERFORMER_SUBSCRIPTION_CHANNEL,
              eventName: EVENT.DELETED,
              data: new SubscriptionDto(subscription)
            })
          );
          subscription.status = SUBSCRIPTION_STATUS.DEACTIVATED;
          subscription.updatedAt = new Date();
          await subscription.save();

          transaction.status = PAYMENT_STATUS.CANCELLED;
          transaction.updatedAt = new Date();
          await transaction.save();
          return { success: true };
        }
        return { success: false };
      } catch (e) {
        throw new HttpException(e, 400);
      }
    }
    else if (transaction.paymentGateway == PAYMENT_PROVIDER.CCBILL){
      return await this.moonlightService.cancelSubscription(subscriptionId);
    }
  }

  public async logWebhook(paymentProcessor: string, data: any) {
    console.log('Webhook', paymentProcessor, 'data:', data);
  }

}
