import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UserService } from 'src/modules/user/services';
import { PerformerService } from 'src/modules/performer/services';
import { UserDto } from 'src/modules/user/dtos';
import { FileService } from 'src/modules/file/services';
import { Model } from 'mongoose';
import * as moment from 'moment';
import { ProductService } from 'src/modules/performer-assets/services';
import { PAYMENT_TRANSACTION_MODEL_PROVIDER } from '../providers';
import { PaymentTransactionModel } from '../models';
import { PaymentSearchPayload } from '../payloads';
import { PaymentDto } from '../dtos';
import { PerformerModel } from 'src/modules/performer/models';
import { PERFORMER_MODEL_PROVIDER } from 'src/modules/performer/providers';
import { USER_MODEL_PROVIDER } from 'src/modules/user/providers';
import { UserModel } from 'src/modules/user/models';

@Injectable()
export class PaymentSearchService {
  constructor(
    @Inject(forwardRef(() => FileService))
    private readonly fileService: FileService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(PAYMENT_TRANSACTION_MODEL_PROVIDER)
    private readonly paymentTransactionModel: Model<PaymentTransactionModel>,
    @Inject(PERFORMER_MODEL_PROVIDER)
    private readonly performerModel: Model<PerformerModel>,
    @Inject(USER_MODEL_PROVIDER)
    private readonly userModel: Model<UserModel>,
    private readonly userService: UserService,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService
  ) { }

  public async getUserTransactions(req: PaymentSearchPayload, user: UserDto) {
    const query = {
      source: 'user',
      sourceId: user._id
    } as any;
    if (req.type) query.type = req.type;
    if (req.status) query.status = req.status;
    if (req.performerId) query.performerId = req.performerId;
    if (req.performerIds) query.performerId = { $in: req.performerIds };
    if (req.fromDate && req.toDate) {
      query.createdAt = {
        $gt: moment(req.fromDate),
        $lt: moment(req.toDate)
      };
    }
    const sort = {
      [req.sortBy || 'updatedAt']: req.sort || -1
    };
    const [data, total] = await Promise.all([
      this.paymentTransactionModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.paymentTransactionModel.countDocuments(query)
    ]);
    const PIds = data.map((d) => d.performerId);
    const [performers] = await Promise.all([
      this.performerService.findByIds(PIds)
    ]);
    const transactions = data.map((v) => new PaymentDto(v));

    transactions.forEach((transaction) => {
      if (transaction.performerId) {
        const performerInfo = performers.find(
          (t) => t._id.toString() === transaction.performerId.toString()
        );
        if (performerInfo) {
          // eslint-disable-next-line no-param-reassign
          transaction.performerInfo = performerInfo.toResponse();
        }
      }
    });
    return {
      data: transactions.map((trans) => new PaymentDto(trans).toResponse(false)),
      total
    };
  }

  public async adminGetUserTransactions(req: PaymentSearchPayload) {
    const query = {} as any;
    let performerIds =[] as any;
    let userIds =[] as any;
    if (req.q) {
      const query_name = {} as any;
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ''),
        'i'
      );
      query_name.$or = [
        // {
        //   name: { $regex: regexp }
        // },
        // {
        //   email: { $regex: regexp }
        // },
        {
          username: { $regex: regexp }
        }
      ];

      const [performers, users] = await Promise.all([
        this.performerModel
          .find(query_name)
          .lean(),
        this.userModel
          .find(query_name)
          .lean()
      ]);

      performerIds = performers.map(p => {
          return p._id;
      });

      userIds = users.map(u => {
        return u._id;
      });

    }
    if (req.sourceId) query.sourceId = req.sourceId;
    if (req.source) query.source = req.source;
    if (req.type) query.type = req.type;
    if (req.status) query.status = req.status;
    if (req.target) query.target = req.target;
    if (req.targetId) query.targetId = req.targetId;
    if (req.performerId) query.performerId = req.performerId;
    if (req.performerIds) query.performerId = { $in: req.performerIds };
    if (req.paymentGateway) query.paymentGateway = req.paymentGateway;
    if (req.fromDate && req.toDate) {
      query.createdAt = {
        $gt: moment(req.fromDate),
        $lt: moment(req.toDate)
      };
    }
    const sort = {
      [req.sortBy || 'updatedAt']: req.sort || -1
    };
    if(performerIds.length > 0 || userIds.length > 0){
      query.$or =[
        {
          performerId: {$in: performerIds }
        },
        {
          sourceId: {$in: userIds.concat(...performerIds) }
        }
      ];
    }
    
    const [data, total] = await Promise.all([
      this.paymentTransactionModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.paymentTransactionModel.countDocuments(query)
    ]); 
    const UIds = data.map((d) => d.sourceId);
    let PIds = data.map((d) => d.targetId);
    PIds = PIds.concat(...UIds);
    const [users, performers] = await Promise.all([
      this.userService.findByIds(UIds),
      this.performerService.findByIds(PIds)
    ]);
    const transactions = data.map((v) => new PaymentDto(v));
    transactions.forEach((transaction) => {
      if (transaction.sourceId) {
        let sourceInfo = users.find(
          (t) => t._id.toString() === transaction.sourceId.toString()
        );
        if(!sourceInfo){
          const performerInfo = performers.find(
            (t) => t._id.toString() === transaction.sourceId.toString()
          );
          if(performerInfo){
          sourceInfo = new UserDto();
          sourceInfo.email = performerInfo.email ;
          sourceInfo.name = performerInfo.name;
          sourceInfo.firstName = performerInfo.firstName;
          sourceInfo.lastName = performerInfo.lastName;
          sourceInfo._id = performerInfo._id;
          sourceInfo.avatarPath = performerInfo.avatar;
          sourceInfo.createdAt = performerInfo.createdAt;
          sourceInfo.isOnline = performerInfo.isOnline;
          sourceInfo.username = performerInfo.username;
          }
        }
        if (sourceInfo) {
          // eslint-disable-next-line no-param-reassign
          transaction.sourceInfo = sourceInfo.toResponse();
        }
      }
      if (transaction.performerId) {
        const performerInfo = performers.find(
          (t) => t._id.toString() === transaction.performerId.toString()
        );
        if (performerInfo) {
          // eslint-disable-next-line no-param-reassign
          transaction.performerInfo = performerInfo.toResponse();
        }
      }
    });
    return {
      data: transactions.map((trans) => new PaymentDto(trans).toResponse(true)),
      total
    };
  }
}
