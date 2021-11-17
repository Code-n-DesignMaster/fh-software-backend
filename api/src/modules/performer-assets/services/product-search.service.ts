import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { PageableData } from 'src/kernel';
import { PerformerService } from 'src/modules/performer/services';
import { FileService } from 'src/modules/file/services';
import { PERFORMER_PRODUCT_MODEL_PROVIDER } from '../providers';
import { ProductModel } from '../models';
import { ProductDto } from '../dtos';
import { UserDto } from '../../user/dtos';
import { ProductSearchRequest } from '../payloads';

@Injectable()
export class ProductSearchService {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(PERFORMER_PRODUCT_MODEL_PROVIDER)
    private readonly productModel: Model<ProductModel>,
    private readonly fileService: FileService
  ) {}

  public async adminSearch(
    req: ProductSearchRequest
  ): Promise<PageableData<ProductDto>> {
    const query = {} as any;
    if (req.q) query.name = { $regex: req.q };
    if (req.performerId) query.performerId = req.performerId;
    if (req.status) query.status = req.status;

    let sort = {};
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.productModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.productModel.countDocuments(query)
    ]);

    const performerIds = data.map((d) => d.performerId);
    const imageIds = data.map((d) => d.imageId);
    const products = data.map((v) => new ProductDto(v));
    const [performers, images] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      imageIds.length ? this.fileService.findByIds(imageIds) : []
    ]);
    products.forEach((v) => {
      // TODO - should get picture (thumbnail if have?)
      const performer = performers.find(
        (p) => p._id.toString() === v.performerId.toString()
      );
      if (performer) {
        // eslint-disable-next-line no-param-reassign
        v.performer = {
          username: performer.username
        };
      }
      const file = images.length > 0 && v.imageId
        ? images.find((f) => f._id.toString() === v.imageId.toString())
        : null;
      // TODO - get default image for dto?
      if (file) {
        // eslint-disable-next-line no-param-reassign
        v.image = file.getUrl();
      }
    });

    return {
      data: products,
      total
    };
  }

  public async performerSearch(
    req: ProductSearchRequest,
    user: UserDto
  ): Promise<PageableData<ProductDto>> {
    const query = {} as any;
    if (req.q) query.name = { $regex: req.q };
    query.performerId = user._id;
    if (req.status) query.status = req.status;
    let sort = {};
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.productModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.productModel.countDocuments(query)
    ]);

    const performerIds = data.map((d) => d.performerId);
    const imageIds = data.map((d) => d.imageId);
    const products = data.map((v) => new ProductDto(v));
    const [performers, images] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      imageIds.length ? this.fileService.findByIds(imageIds) : []
    ]);
    products.forEach((v) => {
      // TODO - should get picture (thumbnail if have?)
      const performer = performers.find(
        (p) => p && p._id.toString() === v.performerId.toString()
      );
      if (performer) {
        // eslint-disable-next-line no-param-reassign
        v.performer = {
          username: performer.username
        };
      }
      // TODO - check user or performer
      const file = images.length > 0 && v.imageId
        ? images.find((f) => f._id.toString() === v.imageId.toString())
        : null;
      // TODO - get default image for dto?
      if (file) {
        // eslint-disable-next-line no-param-reassign
        v.image = file.getUrl();
      }
    });

    return {
      data: products,
      total
    };
  }

  public async userSearch(
    req: ProductSearchRequest
  ): Promise<PageableData<ProductDto>> {
    const query = {} as any;
    if (req.q) query.name = { $regex: req.q };
    if (req.performerId) query.performerId = req.performerId;
    if (req.excludedId) query._id = { $ne: req.excludedId };
    if (req.includedIds) query._id = { $in: req.includedIds.split(',') };
    query.status = 'active';
    let sort = {};
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.productModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.productModel.countDocuments(query)
    ]);

    const performerIds = data.map((d) => d.performerId);
    const imageIds = data.map((d) => d.imageId);
    const products = data.map((v) => new ProductDto(v));
    const [performers, images] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      imageIds.length ? this.fileService.findByIds(imageIds) : []
    ]);
    products.forEach((v) => {
      // TODO - should get picture (thumbnail if have?)
      const performer = performers.find(
        (p) => p._id.toString() === v.performerId.toString()
      );
      if (performer) {
        // eslint-disable-next-line no-param-reassign
        v.performer = {
          username: performer.username
        };
      }
      // TODO - check user or performer
      const file = images.length > 0 && v.imageId
        ? images.find((f) => f._id.toString() === v.imageId.toString())
        : null;
      // TODO - get default image for dto?
      if (file) {
        // eslint-disable-next-line no-param-reassign
        v.image = file.getUrl();
      }
    });

    return {
      data: products,
      total
    };
  }
}
