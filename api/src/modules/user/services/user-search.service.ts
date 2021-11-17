import { Injectable, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { PageableData, PerformerPageableAggregateData } from 'src/kernel/common';
import { UserModel } from '../models';
import { USER_MODEL_PROVIDER } from '../providers';
import { UserDto } from '../dtos';
import { UserSearchRequestPayload } from '../payloads';
import { STATUSES, STATUS_ACTIVE, STATUS_INACTIVE, STATUS_PENDING_EMAIL_CONFIRMATION, GENDERS, GENDER_MALE, GENDER_FEMALE } from '../../user/constants';
@Injectable()
export class UserSearchService {
  constructor(
    @Inject(USER_MODEL_PROVIDER)
    private readonly userModel: Model<UserModel>
  ) {}

  // TODO - should create new search service?
  public async search(
    req: UserSearchRequestPayload
  ): Promise<PerformerPageableAggregateData<UserDto>> {
    const query = {} as any;
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ''),
        'i'
      );
      query.$or = [
        {
          name: { $regex: regexp }
        },
        {
          username: { $regex: regexp }
        },
        {
          email: { $regex: regexp }
        }
      ];
    }
    if (req.role) {
      query.roles = { $in: [req.role] };
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
    const aggregate = await this.userModel.find(query, ["status","gender"]);
    const [data, totalactive, totalinactive, totalpending, totalmale, totalfemale, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
        aggregate.map(agg => agg.status === STATUS_ACTIVE).filter(v => v === true).length,
        aggregate.map(agg => agg.status === STATUS_INACTIVE).filter(v => v === true).length,
        aggregate.map(agg => agg.status === STATUS_PENDING_EMAIL_CONFIRMATION).filter(v => v === true).length,
        aggregate.map(agg => agg.gender === GENDER_MALE).filter(v => v === true).length,
        aggregate.map(agg => agg.gender === GENDER_FEMALE).filter(v => v === true).length,
      this.userModel.countDocuments(query)
    ]);
    return {
      data: data.map((item) => new UserDto(item)),
      totalactive,
      totalinactive,
      totalpending,
      totalmale,
      totalfemale,
      total
    };
  }

  public async searchByKeyword(
    req: UserSearchRequestPayload
  ): Promise<any> {
    const query = {} as any;
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ''),
        'i'
      );
      query.$or = [
        {
          name: { $regex: regexp }
        },
        {
          email: { $regex: regexp }
        },
        {
          username: { $regex: regexp }
        }
      ];
    }

    const [data] = await Promise.all([
      this.userModel
        .find(query)
    ]);
    return data;
  }
}
