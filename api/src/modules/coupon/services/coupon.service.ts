import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  NotAcceptableException
} from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { StringHelper } from 'src/kernel';
import * as moment from 'moment';
import { PAYMENT_TRANSACTION_MODEL_PROVIDER } from 'src/modules/payment/providers';
import { PaymentTransactionModel } from 'src/modules/payment/models';
import { PAYMENT_STATUS } from 'src/modules/payment/constants';
import { CouponCreatePayload, CouponUpdatePayload } from '../payloads';
import { CouponDto } from '../dtos';
import { CouponModel } from '../models';
import { COUPON_PROVIDER } from '../providers';

@Injectable()
export class CouponService {
  constructor(
    @Inject(COUPON_PROVIDER)
    private readonly couponModel: Model<CouponModel>,
    @Inject(PAYMENT_TRANSACTION_MODEL_PROVIDER)
    private readonly paymentModel: Model<PaymentTransactionModel>
  ) {}

  public async findByIdOrCode(id: string | ObjectId): Promise<CouponDto> {
    const query = id instanceof ObjectId || StringHelper.isObjectId(id)
      ? { _id: id }
      : { code: id };
    const coupon = await this.couponModel.findOne(query);
    if (!coupon) return null;
    return new CouponDto(coupon);
  }

  public async checkExistingCode(code: string, id?: string | ObjectId) {
    const query = { code } as any;
    if (id) {
      query._id = { $ne: id };
    }
    const count = await this.couponModel.countDocuments(query);

    return count > 0;
  }

  public async create(payload: CouponCreatePayload): Promise<CouponDto> {
    const data = {
      ...payload,
      expiredDate: new Date(payload.expiredDate),
      updatedAt: new Date(),
      createdAt: new Date()
    };
    const existedCode = await this.checkExistingCode(payload.code);
    if (existedCode) {
      throw new ConflictException('Code is duplicated');
    }
    const coupon = await this.couponModel.create(data);
    return new CouponDto(coupon);
  }

  public async update(
    id: string | ObjectId,
    payload: CouponUpdatePayload
  ) {
    const coupon = await this.findByIdOrCode(id);
    if (!coupon) {
      throw new NotFoundException();
    }
    const existedCode = await this.checkExistingCode(payload.code, id);
    if (existedCode) {
      throw new ConflictException('Code is duplicated');
    }

    const data = {
      ...payload,
      expiredDate: new Date(payload.expiredDate),
      updatedAt: new Date()
    } as any;
    return this.couponModel.updateOne({ _id: id }, data, { new: true });
  }

  public async delete(id: string | ObjectId | CouponModel): Promise<boolean> {
    const coupon = id instanceof CouponModel ? id : await this.findByIdOrCode(id);
    if (!coupon) {
      // should log?
      throw new NotFoundException('Coupon not found');
    }
    await this.couponModel.deleteOne({ _id: id });
    return true;
  }

  public async applyCoupon(
    code: string,
    userId: string | ObjectId
  ): Promise<CouponDto> {
    const coupon = await this.findByIdOrCode(code);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    if (moment().isAfter(coupon.expiredDate)) {
      throw new NotAcceptableException('Coupon expired');
    }
    if (coupon.numberOfUses <= 0) {
      throw new NotAcceptableException('Coupon expired');
    }
    const usedCoupon = await this.checkUsedCoupon(code, userId);
    if (usedCoupon) {
      throw new NotAcceptableException('You have used this coupon');
    }
    return new CouponDto(coupon);
  }

  public async checkUsedCoupon(
    code: string,
    userId: string | ObjectId
  ): Promise<boolean> {
    const count = await this.paymentModel.countDocuments({
      'couponInfo.code': code,
      sourceId: userId,
      status: PAYMENT_STATUS.SUCCESS
    });
    return count > 0;
  }
}
