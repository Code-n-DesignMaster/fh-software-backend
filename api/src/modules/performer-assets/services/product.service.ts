import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import {
  EntityNotFoundException, QueueEventService, QueueEvent
} from 'src/kernel';
import { FileDto } from 'src/modules/file';
import { UserDto } from 'src/modules/user/dtos';
import { FileService } from 'src/modules/file/services';
import { PerformerService } from 'src/modules/performer/services';
import { merge, uniq } from 'lodash';
import { EVENT } from 'src/kernel/constants';
import { PRODUCT_TYPE } from '../constants';
import { ProductDto } from '../dtos';
import { ProductCreatePayload, ProductUpdatePayload } from '../payloads';
import { InvalidFileException } from '../exceptions';

import { ProductModel } from '../models';
import { PERFORMER_PRODUCT_MODEL_PROVIDER } from '../providers';

export const PERFORMER_PRODUCT_CHANNEL = 'PERFORMER_PRODUCT_CHANNEL';

@Injectable()
export class ProductService {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(PERFORMER_PRODUCT_MODEL_PROVIDER)
    private readonly productModel: Model<ProductModel>,
    private readonly fileService: FileService,
    private readonly queueEventService: QueueEventService
  ) {}

  public async findByIds(ids: any) {
    const productIds = uniq((ids as any).map((i) => i.toString()));

    const products = await this.productModel
      .find({
        _id: {
          $in: productIds
        }
      })
      .lean()
      .exec();
    return products.map((p) => new ProductDto(p));
  }

  public async create(
    payload: ProductCreatePayload,
    digitalFile: FileDto,
    imageFile: FileDto,
    creator?: UserDto
  ): Promise<ProductDto> {
    if (payload.type === PRODUCT_TYPE.DIGITAL && !digitalFile) {
      throw new InvalidFileException('Missing digital file');
    }

    // eslint-disable-next-line new-cap
    const product = new this.productModel(payload);
    if (digitalFile) product.digitalFileId = digitalFile._id;
    if (imageFile) product.imageId = imageFile._id;
    if (creator) {
      if (!product.performerId) {
        product.performerId = creator._id;
      }
      product.createdBy = creator._id;
      product.updatedBy = creator._id;
    }
    product.createdAt = new Date();
    product.updatedAt = new Date();

    await product.save();
    const dto = new ProductDto(product);

    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_PRODUCT_CHANNEL,
        eventName: EVENT.CREATED,
        data: dto
      })
    );
    return dto;
  }

  public async update(
    id: string | ObjectId,
    payload: ProductUpdatePayload,
    digitalFile: FileDto,
    imageFile: FileDto,
    updater?: UserDto
  ): Promise<ProductDto> {
    const product = await this.productModel.findOne({ _id: id });
    if (!product) {
      throw new EntityNotFoundException();
    }
    const oldStatus = product.status;

    if (
      payload.type === PRODUCT_TYPE.DIGITAL
      && !product.digitalFileId && !digitalFile
    ) {
      throw new InvalidFileException('Missing digital file');
    }

    merge(product, payload);
    const deletedFileIds = [];
    if (digitalFile) {
      product.digitalFileId && deletedFileIds.push(product.digitalFileId);
      product.digitalFileId = digitalFile._id;
    }

    if (imageFile) {
      product.imageId && deletedFileIds.push(product.imageId);
      product.imageId = imageFile._id;
    }
    if (updater) product.updatedBy = updater._id;
    await product.save();

    deletedFileIds.length
      && (await Promise.all(
        deletedFileIds.map((fileId) => this.fileService.remove(fileId))
      ));

    const dto = new ProductDto(product);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_PRODUCT_CHANNEL,
        eventName: EVENT.UPDATED,
        data: {
          ...dto,
          oldStatus
        }
      })
    );
    return dto;
  }

  public async delete(id: string | ObjectId): Promise<boolean> {
    const product = await this.productModel.findOne({ _id: id });
    if (!product) {
      throw new EntityNotFoundException();
    }

    await product.remove();
    product.digitalFileId
      && (await this.fileService.remove(product.digitalFileId));
    product.imageId && (await this.fileService.remove(product.imageId));

    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_PRODUCT_CHANNEL,
        eventName: EVENT.DELETED,
        data: new ProductDto(product)
      })
    );
    return true;
  }

  public async getDetails(id: string | ObjectId) {
    const product = await this.productModel.findOne({ _id: id });
    if (!product) {
      throw new EntityNotFoundException();
    }

    const [performer, image] = await Promise.all([
      this.performerService.findById(product.performerId),
      // product.digitalFileId ? this.fileService.findById(product.digitalFileId) : null,
      product.imageId ? this.fileService.findById(product.imageId) : null
    ]);

    const dto = new ProductDto(product);
    dto.image = image ? image.getUrl() : null;
    dto.performer = {
      username: performer.username
    };

    return dto;
  }

  public async updateStock(id: string | ObjectId, num = -1) {
    return this.productModel.updateOne(
      { _id: id },
      { $inc: { stock: num } },
      { new: true }
    );
  }
}
