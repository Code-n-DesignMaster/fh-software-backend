import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { PageableData, PerformerPageableAggregateData } from 'src/kernel/common';
import { PerformerModel, BlockedByPerformerModel, BankingModel } from '../models';
import { PERFORMER_MODEL_PROVIDER, BLOCKED_BY_PERFORMER_PROVIDER, PERFORMER_BANKING_SETTING_MODEL_PROVIDER } from '../providers';
import { PerformerDto } from '../dtos';
import { PerformerSearchPayload } from '../payloads';
import { PerformerService } from './performer.service';
import {PERFORMER_STATUSES} from '../constants'
import { GENDERS, GENDER_MALE, GENDER_FEMALE, USER_ROLES } from '../../user/constants';
import { toObjectId, queryPerformerSearch } from 'src/kernel/helpers/string.helper';

@Injectable()
export class PerformerSearchService {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(PERFORMER_MODEL_PROVIDER)
    private readonly performerModel: Model<PerformerModel>,
    @Inject(BLOCKED_BY_PERFORMER_PROVIDER)
    private readonly blockedByPerformerModel: Model<BlockedByPerformerModel>,
    @Inject(PERFORMER_BANKING_SETTING_MODEL_PROVIDER)
    private readonly bankingSettingModel: Model<BankingModel>,
  ) { }

  // TODO - should create new search service?
  public async search(
    req: PerformerSearchPayload,
    role?: string
  ): Promise<PerformerPageableAggregateData<PerformerDto>> {
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

    if(req.userId && (role !== USER_ROLES.ADMIN)){
      const items = await this.blockedByPerformerModel.find({userId: req.userId}).lean();
      const ids = items.map(i => toObjectId(i.performerId));
      query._id =  { $nin: ids };
    }

    if (req.performerIds) {
      const ids =  req.performerIds.toString().split(",").map(id => toObjectId(id));
      query._id = { $in: ids };
    }
    if (req.status) {
      query.status = req.status;
    }
    if (req.gender) {
      query.gender = req.gender;
    }
    let sort = {};
    if (role === USER_ROLES.ADMIN) {
      sort = { 'feature': -1, 'createdAt': -1 };  
    } else {
      if (req.sort && req.sortBy) {
        if (req.sort === 'desc' && req.sortBy === 'updatedAt') {
            sort = {
              ['feature']: req.sort,
              [req.sortBy]: req.sort
            };
        } 
        else 
        {
            sort = {
              [req.sortBy]: req.sort
            };           
        }

      }
    }
    if (req.sort === 'latest') {
      sort = '-createdAt';
    }
    if (req.sort === 'oldest') {
      sort = 'createdAt';
    }
    if (req.sort === 'popular') {
      sort = '-stats.views';
    }
    if (req.sort === 'feature') {
      sort = '-feature';
    }
    if(role === USER_ROLES.ADMIN){
    const aggregate = await this.performerModel.find(query, ["status","gender"]);
    const [data, totalactive, totalinactive, totalpending, totalmale, totalfemale, total] = await Promise.all([
      this.performerModel
        .find(query)
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
        aggregate.map(agg => agg.status === PERFORMER_STATUSES.ACTIVE).filter(v => v === true).length,
        aggregate.map(agg => agg.status === PERFORMER_STATUSES.INACTIVE).filter(v => v === true).length,
        aggregate.map(agg => agg.status === PERFORMER_STATUSES.PENDING).filter(v => v === true).length,
        //aggregate.map(agg => agg.status === PERFORMER_STATUSES.DELETED).filter(v => v === true).length,
        aggregate.map(agg => agg.gender === GENDER_MALE).filter(v => v === true).length,
        aggregate.map(agg => agg.gender === GENDER_FEMALE).filter(v => v === true).length,
        this.performerModel.countDocuments(query)
    ]);
    if(req.exportcsv){
      let items = [];
      for(let i = 0; i < data.length; i++){
        const dto = new PerformerDto(data[i]);
        dto.bankingInformation = await this.bankingSettingModel.findOne({
          performerId: data[i]._id
        });
        items.push(dto);
      }
     
      return {
        data: items,
        totalactive,
        totalinactive,
        totalpending,
        //totaldeleted,
        totalmale,
        totalfemale,
        total
      };
    }
    return {
      data: data.map((item) => new PerformerDto(item)),
      totalactive,
      totalinactive,
      totalpending,
      //totaldeleted,
      totalmale,
      totalfemale,
      total
    };
   }
   else{
    query.$and = queryPerformerSearch;
    const [data,  total] = await Promise.all([
      this.performerModel
        .find(query)
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
        this.performerModel.countDocuments(query)
    ]);
    return {
      data: data.map((item) => new PerformerDto(item)),
      total
    };
   }
  }

  public async searchByKeyword(
    req: PerformerSearchPayload
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
      this.performerModel
        .find(query)
    ]);
    return data;
  }

  public async topPerformers(
    req: PerformerSearchPayload
  ): Promise<PageableData<PerformerDto>> {
    const query = {} as any;
    query.status = 'active';
    if (req.gender) {
      query.gender = req.gender;
    }
    const sort = {
      score: -1,
      'stats.subscribers': -1,
      'stats.views': -1
    };
    if(req.userId){
      const items = await this.blockedByPerformerModel.find({userId: req.userId}).lean();
      const ids = items.map(i => toObjectId(i.performerId));
      query._id =  { $nin: ids };
    }
    query.$or = queryPerformerSearch;
    const [data, total] = await Promise.all([
      this.performerModel
        .find(query)
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.performerModel.countDocuments(query)
    ]);
    return {
      data: data.map((item) => new PerformerDto(item)),
      total
    };
  }

  // public async advancedSearch(
  //   req: PerformerSearchPayload,
  //   user?: UserDto
  // ): Promise<PageableData<PerformerDto>> {
  //   const query = {} as any;
  //   if (req.q) {
  //     query.$or = [
  //       {
  //         name: { $regex: req.q }
  //       },
  //       {
  //         email: { $regex: req.q }
  //       },
  //       {
  //         username: { $regex: req.q }
  //       }
  //     ];
  //   }
  //   if (req.status) {
  //     query.status = req.status;
  //   }
  //   if (req.gender) {
  //     query.gender = req.gender;
  //   }
  //   if (req.category) {
  //     query.categoryIds = new ObjectId(req.category);
  //   }
  //   if (req.country) {
  //     query.country = req.country;
  //   }
  //   if (req.tags) {
  //     query.tags = req.tags;
  //   }
  //   // online status on top priority
  //   let sort = {
  //     isOnline: -1,
  //     onlineAt: -1,
  //     createdAt: -1
  //   } as any;
  //   if (req.sort && req.sortBy) {
  //     sort = {
  //       [req.sortBy]: req.sort,
  //       isOnline: -1,
  //       onlineAt: -1
  //     };
  //   }
  //   const [data, total] = await Promise.all([
  //     this.performerModel
  //       .find(query)
  //       .sort(sort)
  //       .limit(parseInt(req.limit as string))
  //       .skip(parseInt(req.offset as string)),
  //     this.performerModel.countDocuments(query)
  //   ]);

  //   const performers = data.map(item => new PerformerDto(item));
  //   if (user) {
  //     const performerIds = performers.map(p => p._id);
  //     if (performerIds.length) {
  //       const favorites = await this.favoriteService.find({
  //         favoriteId: { $in: performerIds },
  //         ownerId: user._id
  //       });

  //       favorites.length &&
  //         performers.forEach(p => {
  //           if (
  //             favorites.find(f => f.favoriteId.toString() === p._id.toString())
  //           ) {
  //             p.isFavorite = true;
  //           }
  //         });
  //     }
  //   }

  //   return {
  //     data: performers,
  //     total
  //   };
  // }
}
