import { Injectable, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { PageableData } from 'src/kernel';
import { COUPON_PROVIDER } from '../providers';
import { CouponModel } from '../models';
import { CouponSearchRequestPayload } from '../payloads';
import { CouponDto } from '../dtos';
@Injectable()
export class CouponSearchService {
  constructor(
    @Inject(COUPON_PROVIDER)
    private readonly couponModel: Model<CouponModel>
  ) {}

  // TODO - define category DTO
  public async search(
    req: CouponSearchRequestPayload
  ): Promise<PageableData<CouponDto>> {
    const query = {} as any;
    if (req.q) {
      query.$or = [
        {
          name: { $regex: req.q }
        },
        {
          code: { $regex: req.q }
        }
      ];
    }
    if (req.status) {
      query.status = req.status;
    }
    let sort = {};
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.couponModel
        .find(query)
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.couponModel.countDocuments(query)
    ]);

    return {
      data: data.map((item) => new CouponDto(item)), // TODO - define mdoel
      total
    };
  }
}
