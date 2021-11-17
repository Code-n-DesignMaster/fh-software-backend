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
  Get,
  Param,
  Query,
  UseInterceptors,
  Request,
  Delete
} from '@nestjs/common';
import { RoleGuard } from 'src/modules/auth/guards';
import { DataResponse, PageableData, PerformerPageableAggregateData, getConfig } from 'src/kernel';
import { CurrentUser, Roles, AuthService } from 'src/modules/auth';
import { UserDto } from 'src/modules/user/dtos';
import { AuthCreateDto } from 'src/modules/auth/dtos';
import { FileUploadInterceptor, FileUploaded, FileDto } from 'src/modules/file';
import { REF_TYPE } from 'src/modules/file/constants';
import { FileService } from 'src/modules/file/services';
import {
  PerformerCreatePayload,
  PerformerUpdatePayload,
  PerformerSearchPayload,
  PaymentGatewaySettingPayload,
  CommissionSettingPayload,
  BankingSettingPayload,
  BlockCountriesSettingPayload
} from '../payloads';
import { PerformerDto, IPerformerResponse } from '../dtos';
import { PerformerService, PerformerSearchService } from '../services';
import { ROLE_ADMIN } from '../../user/constants';
import { UserSearchService } from 'src/modules/user/services';
import { UserSearchRequestPayload } from 'src/modules/user/payloads';
@Injectable()
@Controller('admin/performers')
export class AdminPerformerController {
  constructor(
    private readonly performerService: PerformerService,
    private readonly performerSearchService: PerformerSearchService,
    private readonly authService: AuthService,
    private readonly fileService: FileService,
    private readonly userSearchService: UserSearchService,
  ) {}

  @Get('/search')
  @Roles('admin', 'subadmin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async search(
    @Query() req: PerformerSearchPayload
  ): Promise<DataResponse<PerformerPageableAggregateData<IPerformerResponse>>> {
    const data = await this.performerSearchService.search(req, ROLE_ADMIN);
    return DataResponse.ok({
      total: data.total,
      totalactive: data.totalactive,
      totalinactive: data.totalinactive,
      totalpending: data.totalpending,
      totaldeleted: data.totaldeleted,
      totalmale: data.totalmale,
      totalfemale: data.totalfemale,
      data: data.data.map((p) => p.toResponse(true))
    });
  }

  @Get('/search-buyers')
  @Roles('admin', 'subadmin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async searchBuyers(
    @Query() req: PerformerSearchPayload,
  ) {
    let resp = [];
    const reqUserSearchPayload = new UserSearchRequestPayload({...req});
    let perfomerResp = await this.performerSearchService.search(req);
    let userResp = await this.userSearchService.search(reqUserSearchPayload);
    resp = resp.concat(...userResp.data).concat(...perfomerResp.data);
    return DataResponse.ok(resp);
  }

  @Post()
  @Roles('admin', 'subadmin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @CurrentUser() currentUser: UserDto,
    @Body() payload: PerformerCreatePayload
  ): Promise<DataResponse<PerformerDto>> {
    try
    {
    await this.authService.checkUsername(payload.username);
    await this.authService.checkEmail(payload.email); 
    // password should be created in auth module only
    const { password } = payload;
    // eslint-disable-next-line no-param-reassign
    delete payload.password;
    const performer = await this.performerService.create(payload, currentUser);

    if (password) {
      await this.authService.create(
        new AuthCreateDto({
          source: 'performer',
          sourceId: performer._id,
          type: 'email',
          key: performer.email.toLowerCase(),
          value: password
        })
      );
    }

    return DataResponse.ok(performer);
   }
   catch(e){
     throw e;
   }
  }

  @Put('/:id')
  @Roles('admin')
  @UseGuards(RoleGuard)
  async updateUser(
    @Body() payload: PerformerUpdatePayload,
    @Param('id') performerId: string,
    @Request() req: any
  ): Promise<DataResponse<PerformerDto>> {
    try {
      const updateSelf = await this.authService.isUpdatePerformerSelf(payload.username, payload.email);
      if (!updateSelf) {
        const performer = await this.performerService.findById(performerId);
        if (performer.username !== payload.username) {
          await this.authService.checkUsername(payload.username);
        }
        if (performer.email !== payload.email) {
          await this.authService.checkEmail(payload.email);
        }
      }
      await this.performerService.adminUpdate(performerId, payload);
      const performer = await this.performerService.getDetails(performerId, req.jwToken);
      return DataResponse.ok(performer);
    } catch (e) {
      throw e;
    }
  }

  @Get('/:id/view')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async getDetails(
    @Param('id') performerId: string,
    @Request() req: any
  ): Promise<DataResponse<IPerformerResponse>> {
    const performer = await this.performerService.getDetails(performerId, req.jwToken);
    // TODO - check roles or other to response info
    const data = performer.toResponse(true, true);
    return DataResponse.ok(data);
  }

  @Post('/documents/upload/:performerId')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    FileUploadInterceptor('performer-document', 'file', {
      destination: getConfig('file').documentDir
    })
  )
  async uploadPerformerDocument(
    @FileUploaded() file: FileDto,
    @Param('performerId') id: any,
    @Request() req: any
  ): Promise<any> {
    await this.fileService.addRef(file._id, {
      itemId: id,
      itemType: REF_TYPE.PERFORMER
    });
    return DataResponse.ok({
      ...file,
      url: `${file.getUrl()}?documentId=${file._id}&token=${req.jwToken}`
    });
  }

  @Post('/avatar/upload')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    FileUploadInterceptor('avatar', 'avatar', {
      destination: getConfig('file').avatarDir,
      generateThumbnail: true,
      replaceWithThumbail: true,
      thumbnailSize: getConfig('image').avatar
    })
  )
  async uploadPerformerAvatar(@FileUploaded() file: FileDto): Promise<any> {
    // TODO - define url for perfomer id if have?
    return DataResponse.ok({
      ...file,
      url: file.getUrl()
    });
  }

  @Post('/cover/upload')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    FileUploadInterceptor('cover', 'cover', {
      destination: getConfig('file').coverDir
      // generateThumbnail: true,
      // replaceWithThumbail: true,
      // thumbnailSize: getConfig('image').coverThumbnail
    })
  )
  async uploadPerformerCover(@FileUploaded() file: FileDto): Promise<any> {
    // TODO - define url for perfomer id if have?
    return DataResponse.ok({
      ...file,
      url: file.getUrl()
    });
  }

  @Put('/:id/payment-gateway-settings')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async updatePaymentGatewaySetting(
    @Body() payload: PaymentGatewaySettingPayload
  ) {
    const data = await this.performerService.updatePaymentGateway(payload);
    return DataResponse.ok(data);
  }

  @Put('/:id/commission-settings')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async updateCommissionSetting(
    @Param('id') performerId: string,
    @Body() payload: CommissionSettingPayload
  ) {
    const data = await this.performerService.updateCommissionSetting(
      performerId,
      payload
    );
    return DataResponse.ok(data);
  }

  @Put('/:id/banking-settings')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async updateBankingSetting(
    @Param('id') performerId: string,
    @Body() payload: BankingSettingPayload,
    @CurrentUser() user: UserDto
  ) {
    const data = await this.performerService.updateBankingSetting(
      performerId,
      payload,
      user
    );
    return DataResponse.ok(data);
  }

  @Put('/:id/block-countries-settings')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async updateBlockCountriesSetting(
    @Param('id') performerId: string,
    @Body() payload: BlockCountriesSettingPayload,
    @CurrentUser() user: UserDto
  ) {
    const data = await this.performerService.updateBlockCountriesSetting(
      performerId,
      payload,
      user
    );
    return DataResponse.ok(data);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async delete(@Param('id') id: string) {
    const details = await this.performerService.delete(id);
    return DataResponse.ok(details);
  }
}
