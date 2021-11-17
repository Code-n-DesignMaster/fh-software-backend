import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Get,
  Query,
  Param
} from '@nestjs/common';
import { RoleGuard } from 'src/modules/auth/guards';
import { DataResponse, PageableData } from 'src/kernel';
import { Roles, CurrentUser } from 'src/modules/auth';
import { PaymentSearchService } from '../services';
import { PaymentSearchPayload } from '../payloads/payment-search.payload';
import { IPaymentResponse } from '../dtos';
import { UserDto } from 'src/modules/user/dtos';
@Injectable()
@Controller('transactions')
export class PaymentSearchController {
  constructor(private readonly paymentService: PaymentSearchService) {}

  @Get('/admin/search')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'subadmin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async adminTranasctions(
    @Query() req: PaymentSearchPayload
  ): Promise<DataResponse<PageableData<IPaymentResponse>>> {
    const data = await this.paymentService.adminGetUserTransactions(req);
    return DataResponse.ok(data);
  }

  @Get('/user/search')
  @HttpCode(HttpStatus.OK)
  @Roles('user', 'performer')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async userTranasctions(
    @Query() req: PaymentSearchPayload,
    @CurrentUser() user: UserDto
  ): Promise<DataResponse<PageableData<IPaymentResponse>>>  {
    const data = await this.paymentService.getUserTransactions(req, user);
    return DataResponse.ok(data);
  }
}
