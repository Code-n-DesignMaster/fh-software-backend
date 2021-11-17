import {
  Injectable,
  Inject,
  forwardRef
} from '@nestjs/common';
import { PerformerService } from 'src/modules/performer/services';
import {
  ProductService
} from 'src/modules/performer-assets/services';
import { UserDto } from 'src/modules/user/dtos';
import {
  EntityNotFoundException
} from 'src/kernel';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import * as moment from 'moment';
import { UserService } from 'src/modules/user/services';
import { MailerService } from 'src/modules/mailer';
import { ORDER_MODEL_PROVIDER } from '../providers';
import { OrderModel } from '../models';
import {
  OrderSearchPayload, OrderUpdatePayload
} from '../payloads';
import {
  ORDER_STATUS
} from '../constants';
import { OrderDto } from '../dtos';

@Injectable()
export class OrderService {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
    @Inject(ORDER_MODEL_PROVIDER)
    private readonly orderModel: Model<OrderModel>,
    private readonly mailService: MailerService,
    private readonly userService: UserService
  ) { }

  public async findById(id: string | ObjectId) {
    return this.orderModel.findById(id);
  }

  public async findByIds(ids: any) {
    return this.orderModel.find({ _id: { $in: ids } });
  }

  public async search(req: OrderSearchPayload, user: any) {
    const query = {
      performerId: user.isPerformer ? user._id : ''
    } as any;
    if (!user.isPerformer) delete query.performerId;
    if (req.deliveryStatus) query.deliveryStatus = req.deliveryStatus;
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
      this.orderModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.orderModel.countDocuments(query)
    ]);
    const PIds = data.map((d) => d.performerId);
    const UIds = data.map((d) => d.userId);
    const [performers, users] = await Promise.all([
      this.performerService.findByIds(PIds),
      this.userService.findByIds(UIds)
    ]);
    const orders = data.map((v) => new OrderDto(v));
    orders.forEach(async (order) => {
      if (order.performerId) {
        const performerInfo = performers.find(
          (t) => t._id.toString() === order.performerId.toString()
        );
        if (performerInfo) {
          // eslint-disable-next-line no-param-reassign
          order.performerInfo = performerInfo.toResponse();
        }
      }
      if (order.userId) {
        const userInfo = users.find(
          (t) => t._id.toString() === order.userId.toString()
        );
        if (userInfo) {
          // eslint-disable-next-line no-param-reassign
          order.userInfo = userInfo.toResponse();
        }
      }
    });
    return {
      data: orders,
      total
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async findOne(id: string, currentUser?: any) {
    const order = await this.findById(id);
    if (!order) {
      throw new EntityNotFoundException();
    }

    const [user, performer, products] = await Promise.all([
      this.userService.findById(order.userId),
      this.performerService.findById(order.performerId),
      this.productService.findByIds(order.productIds)
    ]);
    const newOrder = new OrderDto(order);
    if (user) {
      newOrder.userInfo = new UserDto(user).toResponse();
    }
    if (performer) {
      newOrder.performerInfo = new UserDto(performer).toResponse();
    }
    if (products) {
      newOrder.productsInfo = products;
    }
    return newOrder;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async update(id: string, payload: OrderUpdatePayload, currentUser?: any) {
    const data = { ...payload };
    const order = await this.findById(id);
    if (!order) {
      throw new EntityNotFoundException();
    }
    await this.orderModel.updateOne({ _id: id }, data, { new: true });
    if (data.deliveryStatus !== ORDER_STATUS.PROCESSING) {
      const user = await this.userService.findById(order.userId);
      if (user) {
        order.shippingCode = payload.shippingCode;
        await this.mailService.send({
          subject: 'Order Status Changed',
          to: user.email,
          data: {
            user,
            order,
            deliveryStatus: data.deliveryStatus
          },
          template: 'update-order-status.html'
        });
      }
    }
    return { success: true };
  }
}
