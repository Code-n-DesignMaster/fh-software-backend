import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Get,
  UseGuards,
  Query,
  Post,
  Body,
  Delete,
  Param
} from '@nestjs/common';
import { RoleGuard, AuthGuard } from 'src/modules/auth/guards';
import { DataResponse, PageableData } from 'src/kernel';
import { CurrentUser, Roles } from 'src/modules/auth';
import { UserDto } from 'src/modules/user/dtos';
import {
  SubscriptionCreatePayload,
  SubscriptionSearchRequestPayload,
  FreeSubscriptionCreatePayload,
  FreeSubscriptionDeletePayload
} from '../payloads';
import {
  SubscriptionDto,
  ISubscriptionResponse
} from '../dtos/subscription.dto';
import { SubscriptionService } from '../services/subscription.service';
import { SUBSCRIPTION_TYPE } from '../constants';

@Injectable()
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'subadmin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @Body() payload: SubscriptionCreatePayload
  ): Promise<DataResponse<SubscriptionDto>> {
    const data = await this.subscriptionService.adminCreate(payload);
    return DataResponse.ok(data);
  }

  @Post('/user')
  @HttpCode(HttpStatus.OK)
  @Roles('user', 'performer')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createFreeSubscrption(
    @Body() payload: FreeSubscriptionCreatePayload
  ): Promise<DataResponse<SubscriptionDto>> {
    payload.subscriptionType =  SUBSCRIPTION_TYPE.FREE;
    const data = await this.subscriptionService.userCreate(payload);
    return DataResponse.ok(data);
  }

  @Get('/admin/search')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'subadmin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async adminSearch(
    @Query() req: SubscriptionSearchRequestPayload
  ): Promise<DataResponse<PageableData<SubscriptionDto>>> {
    const data = await this.subscriptionService.adminSearch(req);
    return DataResponse.ok(data);
  }

  @Get('/performer/search')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async performerSearch(
    @Query() req: SubscriptionSearchRequestPayload,
    @CurrentUser() user: UserDto
  ): Promise<DataResponse<PageableData<SubscriptionDto>>> {
    const data = await this.subscriptionService.performerSearch(req, user);
    return DataResponse.ok(data);
  }

  @Get('/user/search')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async userSearch(
    @Query() req: SubscriptionSearchRequestPayload,
    @CurrentUser() user: UserDto
  ): Promise<DataResponse<PageableData<ISubscriptionResponse>>> {
    const data = await this.subscriptionService.userSearch(req, user);
    return DataResponse.ok({
      total: data.total,
      data: data.data.map((s) => s.toResponse(false))
    });
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async delete(@Param('id') id: string): Promise<any> {
    const resp = await this.subscriptionService.delete(id);
    return DataResponse.ok(resp);
  }

  @Delete('/user/delete')
  @HttpCode(HttpStatus.OK)
  @Roles('user')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async deleteFreeSubscription(@Body() req: FreeSubscriptionDeletePayload ): Promise<any> {
    const sub = await this.subscriptionService.findOneFreeSubscription(req.performerId, req.userId);
    const resp = await this.subscriptionService.delete(sub.id);
    return DataResponse.ok(resp);
  }
}
