import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Post,
  Body,
  Get,
  Query,
  Param,
  BadRequestException,
  Headers
} from '@nestjs/common';
import { RoleGuard, AuthGuard } from 'src/modules/auth/guards';
import { DataResponse, SearchRequest } from 'src/kernel';
import {
  SubscribePerformerPayload,
  PurchaseProductsPayload,
  PurchaseVideoPayload,
  PurchaseGalleryPayload,
  SendTipPayload
} from '../payloads';
import { UserDto } from '../../user/dtos';
import { CurrentUser, Roles } from 'src/modules/auth';
import { PaymentService } from '../services/payment.service';
import * as crypto from 'crypto';

@Injectable()
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('/subscribe/performers')
  @HttpCode(HttpStatus.OK)
  @Roles('user', 'performer')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @CurrentUser() user: UserDto,
    @Body() payload: SubscribePerformerPayload
  ): Promise<DataResponse<any>> {
    // TODO - check business logic like user is subscribe a model

    const info = await this.paymentService.subscribePerformer(payload, user);
    return DataResponse.ok(info);
  }

  @Post('/purchase-gallery/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('user', 'performer')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async purchaseGallery(
    @CurrentUser() user: UserDto,
    @Param('id') galleryId: string,
    @Body() payload: PurchaseGalleryPayload
  ): Promise<DataResponse<any>> {
    const info = await this.paymentService.purchaseGallery(
      galleryId,
      user,
      payload
    );
    return DataResponse.ok(info);
  }

  @Post('/send-tip-model/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('user', 'performer')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async sendTipModel(
    @CurrentUser() user: UserDto,
    @Param('id') PerformerId: string,
    @Body() payload: SendTipPayload
  ): Promise<DataResponse<any>> {
    const info = await this.paymentService.sendTipModel(
      PerformerId,
      user,
      payload
    );
    return DataResponse.ok(info);
  }

  @Post('/purchase-video/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('user', 'performer')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async purchaseVideo(
    @CurrentUser() user: UserDto,
    @Param('id') videoId: string,
    @Body() payload: PurchaseVideoPayload
  ): Promise<DataResponse<any>> {
    const info = await this.paymentService.purchaseVideo(
      videoId,
      user,
      payload
    );
    return DataResponse.ok(info);
  }

  @Post('/purchase-products')
  @HttpCode(HttpStatus.OK)
  @Roles('user')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async purchaseProducts(
    @CurrentUser() user: UserDto,
    @Body() payload: PurchaseProductsPayload
  ): Promise<DataResponse<any>> {
    const info = await this.paymentService.purchaseProducts(payload, user);
    return DataResponse.ok(info);
  }

  @Post('/ccbill/callhook')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async ccbillCallhook(
    @Body() payload: Record<string, string>,
    @Query() req: Record<string, string>
  ): Promise<DataResponse<any>> {
    if (!['NewSaleSuccess', 'RenewalSuccess'].includes(req.eventType)) {
      return DataResponse.ok(false);
    }

    let info;
    const data = {
      ...payload,
      ...req
    };
    switch (req.eventType) {
      case 'RenewalSuccess':
        info = await this.paymentService.renewalSuccessWebhook(data);
        break;
      default:
        info = await this.paymentService.singlePaymentSuccessWebhook(data);
        break;
    }
    return DataResponse.ok(info);
  }

  @Post('/ccbill/cancel-subscription/:performerId')
  @HttpCode(HttpStatus.OK)
  @Roles('user')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async ccbillCancel(
    @Param('performerId') performerId: string,
    @CurrentUser() user: UserDto
  ): Promise<DataResponse<any>> {
    const data = await this.paymentService.cancelSubscription(performerId, user);
    return DataResponse.ok(data);
  }

  @Post('/ccbill/admin/cancel-subscription/:subscriptionId')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async adminCancelCCbill(
    @Param('subscriptionId') subscriptionId: string
  ): Promise<DataResponse<any>> {
    const data = await this.paymentService.adminCancelSubscription(subscriptionId);
    return DataResponse.ok(data);
  }

  // MoonlightPayments

  IPtoNum(ip){
    return Number(
      ip.split(".")
        .map(d => ("000"+d).substr(-3) )
        .join("")
    );
  }

  @Post('/moonlight/webhook')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async moonlightWebhook(
    @Body() payload: Record<string, string>,
    @Query() req: Record<string, string>,
    @Headers() headers: Record<string, string>
  ): Promise<DataResponse<any>> {
    //validate IP address
    // 104.192.32.81 through 104.192.32.87
    // 104.192.36.81 through 104.192.36.87
    const ipAddress = headers['cf-connecting-ip'];
    const ipAddressNum = this.IPtoNum(ipAddress);
    console.log('ipAddress', ipAddress);

    if ((this.IPtoNum('104.192.32.81') <= ipAddressNum && ipAddressNum <= this.IPtoNum('104.192.32.87')) 
     || (this.IPtoNum('104.192.36.81') <= ipAddressNum && ipAddressNum <= this.IPtoNum('104.192.36.87'))){
      console.log('IP IS IN RANGE');
      await this.paymentService.logWebhook('MoonlightPayments', payload);

      if (!['transaction.sale.success'].includes(payload.event_type)) {
        return DataResponse.ok(false);
      }

      const payloadEventBody: any = payload.event_body;
      const transactionId = payloadEventBody.order_id;

      let info = await this.paymentService.successWebhook(payload, transactionId);
      return DataResponse.ok(info);
    }
    else{
      console.log('IP IS NOT IN RANGE');
      return DataResponse.ok({ success: false });
    }
  }

  @Post('/moonlight/cancel-subscription/:performerId')
  @HttpCode(HttpStatus.OK)
  @Roles('user')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async moonlightCancel(
    @Param('performerId') performerId: string,
    @CurrentUser() user: UserDto
  ): Promise<DataResponse<any>> {
    const data = await this.paymentService.cancelSubscription(performerId, user);
    return DataResponse.ok(data);
  }

  @Post('/moonlight/admin/cancel-subscription/:subscriptionId')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async adminCancelMoonlight(
    @Param('subscriptionId') subscriptionId: string
  ): Promise<DataResponse<any>> {
    const data = await this.paymentService.adminCancelSubscription(subscriptionId);
    return DataResponse.ok(data);
  }
}
