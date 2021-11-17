import {
  Controller,
  Injectable,
  UseGuards,
  Body,
  Post,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Put,
  Param,
  Delete,
  Get,
  Query
} from '@nestjs/common';
import { CouponService, CouponSearchService } from '../services';
import { RoleGuard, AuthGuard } from 'src/modules/auth/guards';
import { DataResponse, PageableData } from 'src/kernel';
import { CurrentUser, Roles } from 'src/modules/auth';
import { UserDto } from 'src/modules/user/dtos';
import {
  CouponCreatePayload,
  CouponUpdatePayload,
  CouponSearchRequestPayload
} from '../payloads';
import { CouponDto, ICouponResponse } from '../dtos';

@Injectable()
@Controller('coupons')
export class AdminCouponController {
  constructor(
    private readonly couponService: CouponService,
    private readonly couponSearchService: CouponSearchService
  ) {}

  @Post('/admin')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @Body() payload: CouponCreatePayload
  ): Promise<DataResponse<CouponDto>> {
    const coupon = await this.couponService.create(payload);
    return DataResponse.ok(coupon);
  }

  @Put('/admin/:id')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserDto,
    @Body() payload: CouponUpdatePayload
  ) {
    const coupon = await this.couponService.update(id, payload);
    return DataResponse.ok(coupon);
  }

  @Delete('/admin/:id')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async delete(@Param('id') id: string): Promise<DataResponse<boolean>> {
    const deleted = await this.couponService.delete(id);
    return DataResponse.ok(deleted);
  }

  @Get('/admin/search')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async search(
    @Query() req: CouponSearchRequestPayload
  ): Promise<DataResponse<PageableData<ICouponResponse>>> {
    const coupon = await this.couponSearchService.search(req);
    return DataResponse.ok(coupon);
  }

  @Get('admin/:id/view')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async details(@Param('id') id: string): Promise<DataResponse<CouponDto>> {
    const coupon = await this.couponService.findByIdOrCode(id);
    return DataResponse.ok(coupon);
  }

  @Post('/:code/apply-coupon')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async checkApplyCoupon(
    @Param('code') code: string,
    @CurrentUser() currentUser: UserDto
  ): Promise<DataResponse<ICouponResponse>> {
    const canApply = await this.couponService.applyCoupon(
      code,
      currentUser._id
    );
    return DataResponse.ok(canApply.toResponse(false));
  }
}
