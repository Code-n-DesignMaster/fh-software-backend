import { Injectable, Inject } from "@nestjs/common";
import { Model } from "mongoose";
import { SystemAccessModel } from "../models/system.access.model";
import { SYSTEM_ACCESS_MODEL_PROVIDER } from "../providers/system.access.provider";
import { SystemAccessPayload } from "../payloads/system.access.payload";
import { PageableData } from "src/kernel";



@Injectable()
export class SystemAccessService {
  constructor(
    @Inject(SYSTEM_ACCESS_MODEL_PROVIDER)
    private readonly systemAccessModel: Model<SystemAccessModel>
  ) { }

    public async createSystemAcessLog(
        ip: string,
        account: string,
        userType: string,
    ): Promise<void> {
        const accessLog = await this.systemAccessModel.create({
            account,
            ip,
            userType
        });

        await accessLog.save();
    }

    public async search(
      req: SystemAccessPayload,
    ): Promise<PageableData<SystemAccessModel>> {
      const query = {} as any;
      if (req.q) {
        const regexp = new RegExp(
          req.q.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ''),
          'i'
        );
         query.$or = [
          {
            account: { $regex: regexp }
          },
          {
            ip: { $regex: regexp }
          }
        ];
      }
      /*
      if (req.ip) {
        query.ip = req.ip;
      }
      if (req.account) {
        query.account = req.account;
      }
      */
      if (req.fromDate && req.toDate) {
        query.createdAt = {
          $gt: new Date(req.fromDate),
          $lte: new Date(req.toDate)
        };
      }
      
      let sort = {};
      if (req.sort && req.sortBy) {
        sort = {
          [req.sortBy]: req.sort
        };
      }

      const [data,  total] = await Promise.all([
        this.systemAccessModel
          .find(query)
          .sort(sort)
          .limit(parseInt(req.limit as string, 10))
          .skip(parseInt(req.offset as string, 10)),
          this.systemAccessModel.countDocuments(query)
      ]);
      return {
        data,
        total
      };
     
    }
}