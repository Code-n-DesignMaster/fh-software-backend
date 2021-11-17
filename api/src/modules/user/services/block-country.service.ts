import { Injectable, Inject, HttpException } from '@nestjs/common';
import { Model } from 'mongoose';
import { BlockCountryModel } from '../models';
import { BLOCK_COUNTRY_PROVIDER } from '../providers';
import {
  BlockCountryCreatePayload
} from '../payloads';

@Injectable()
export class BlockCountryService {
  constructor(
    @Inject(BLOCK_COUNTRY_PROVIDER)
    private readonly blockCountryModel: Model<BlockCountryModel>
  ) {}

  public async create(payload: BlockCountryCreatePayload): Promise<any> {
    const country = await this.blockCountryModel.findOne({ countryCode: payload.countryCode });
    if (country) {
      return 'ALREADY_BLOCKED';
    }
    return this.blockCountryModel.create({
      countryCode: payload.countryCode,
      createdAt: new Date()
    });
  }

  public async search(): Promise<any> {
    return this.blockCountryModel.find({});
  }

  public async delete(code): Promise<any> {
    const country = await this.blockCountryModel.findOne({ countryCode: code });
    if (!country) {
      throw new HttpException('NOT_FOUND', 400);
    }
    await country.remove();
    return true;
  }

  public async checkCountryBlock(countryCode) {
    const country = await this.blockCountryModel.countDocuments({ countryCode });

    return { blocked: country > 0 };
  }
}
