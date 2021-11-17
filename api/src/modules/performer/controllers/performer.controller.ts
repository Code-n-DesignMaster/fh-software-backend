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
  Request,
  UseInterceptors,
  Delete,
  HttpException
} from '@nestjs/common';
import { PerformerService, PerformerSearchService } from '../services';
import {
  DataResponse,
  PageableData,
  getConfig,
  ForbiddenException
} from 'src/kernel';
import { AuthService, Roles } from 'src/modules/auth';
import { RoleGuard, AuthGuard, LoadUser } from 'src/modules/auth/guards';
import { CurrentUser } from 'src/modules/auth/decorators';
import {
  SelfUpdatePayload,
  PerformerSearchPayload,
  BankingSettingPayload,
  BlockCountriesSettingPayload,
  BlockedByPerformerPayload,
  SearchBlockedByPerformerPayload
} from '../payloads';
import {
  PerformerDto,
  IPerformerResponse,
  IBlockedUsersResponse
} from '../dtos';
import { FileUploadInterceptor, FileUploaded, FileDto } from 'src/modules/file';
import { PERFORMER_STATUSES } from '../constants';
import { UserDto } from 'src/modules/user/dtos';
import { isObjectId } from 'src/kernel/helpers/string.helper';
import { CountryService } from 'src/modules/utils/services';
import { MultiFileUploadInterceptor, FilesUploaded } from 'src/modules/file';
import { REF_TYPE } from 'src/modules/file/constants';
import { FileService } from 'src/modules/file/services';
import { Base64 } from 'js-base64';
@Injectable()
@Controller('performers')
export class PerformerController {
  constructor(
    private readonly performerService: PerformerService,
    private readonly performerSearchService: PerformerSearchService,
    private readonly authService: AuthService,
    private readonly countryService: CountryService,
    private readonly fileService: FileService
  ) {}

  @Get('/me')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  async me(@Request() req: any): Promise<DataResponse<IPerformerResponse>> {
    const user = await this.performerService.getDetails(req.user._id, req.jwToken);
    return DataResponse.ok(new PerformerDto(user).toResponse(true, false));
  }

  @Get('/search')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async usearch(
    @Query() req: PerformerSearchPayload
  ): Promise<DataResponse<PageableData<IPerformerResponse>>> {
    const query = { ...req };
    // only query activated performer, sort by online time
    if(!query.performerIds){
    query.status = PERFORMER_STATUSES.ACTIVE;
    }

    const data = await this.performerSearchService.search(query);
    return DataResponse.ok({
      total: data.total,
      data: data.data.map((p) => p.toPublicDetailsResponse())
    });
  }

  @Get('/top')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async topPerformers(
    @Query() req: PerformerSearchPayload
  ): Promise<DataResponse<PageableData<IPerformerResponse>>> {
    const query = { ...req };
    // only query activated performer, sort by online time
    query.status = PERFORMER_STATUSES.ACTIVE;

    const data = await this.performerSearchService.topPerformers(query);
    return DataResponse.ok({
      total: data.total,
      data: data.data.map((p) => p.toSearchResponse())
    });
  }

  @Put('/:id')
  @Roles('performer')
  @UseGuards(RoleGuard)
  async updateUser(
    @Body() payload: SelfUpdatePayload,
    @Param('id') performerId: string,
    @Request() req: any
  ): Promise<DataResponse<IPerformerResponse>> {
    try{
    const performerCheck = await this.performerService.findById(performerId);
      if (performerCheck && (performerCheck.username !== payload.username)) {
        await this.authService.checkUsername(payload.username);
    }
    await this.performerService.selfUpdate(performerId, payload);
    const performer = await this.performerService.getDetails(performerId, req.jwToken, payload);

    if (payload.password) {
      await Promise.all([
        this.authService.create({
          source: 'performer',
          sourceId: performer._id,
          type: 'email',
          key: performer.email,
          value: payload.password
        }),
        this.authService.create({
          source: 'performer',
          sourceId: performer._id,
          type: 'username',
          key: performer.username,
          value: payload.password
        })
      ]);
    }
    return DataResponse.ok(new PerformerDto(performer).toResponse(true, false));
  }
  catch(e){
    throw e;
  }
  }

  @Get('/:username')
  @UseGuards(LoadUser)
  @HttpCode(HttpStatus.OK)
  async getDetails(
    @Param('username') performerUsername: string,
    @Request() req: any,
    @CurrentUser() user: UserDto
  ): Promise<DataResponse<Partial<PerformerDto>>> {
    let ipClient = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (ipClient.substr(0, 7) === '::ffff:') {
      ipClient = ipClient.substr(7);
    }
    // const ipClient = '115.75.211.252';
    const whiteListIps = ['127.0.0.1', '0.0.0.1'];
    let userCountry = null;
    let countryCode = null;
    if (whiteListIps.indexOf(ipClient) === -1) {
      userCountry = await this.countryService.findCountryByIP(ipClient);
      if (userCountry && userCountry.status === 'success' && userCountry.countryCode) {
        countryCode = userCountry.countryCode;
      }
    }

    let performer;
    if (isObjectId(performerUsername)) {
      performer = await this.performerService.findById(
        performerUsername
      );
    } else {
      performer = await this.performerService.findByUsername(
        performerUsername,
        countryCode,
        user
      );
    }

    if (!performer || performer.status !== PERFORMER_STATUSES.ACTIVE) {
      if (!performer || performer.status !== PERFORMER_STATUSES.INACTIVE){
      throw new HttpException('This account is suspended', 400);
      }
    }

    return DataResponse.ok(performer.toPublicDetailsResponse());
  }

  @Post('/documents/upload')
  @Roles('performer')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileUploadInterceptor('performer-document', 'file', {
      destination: getConfig('file').documentDir
    })
  )
  async uploadPerformerDocument(
    @CurrentUser() currentUser: UserDto,
    @FileUploaded() file: FileDto,
    @Request() req: any
  ): Promise<any> {
    await this.fileService.addRef(file._id, {
      itemId: currentUser._id,
      itemType: REF_TYPE.PERFORMER
    });
    return DataResponse.ok({
      ...file,
      url: `${file.getUrl()}?documentId=${file._id}&token=${req.jwToken}`
    });
  }

  @Post('/:username/inc-view')
  @HttpCode(HttpStatus.OK)
  async increaseView(@Param('username') username: string): Promise<any> {
    await this.performerService.viewProfile(username);
    // TODO - check roles or other to response info
    return DataResponse.ok({
      success: true
    });
  }

  @Post('/:id/check-subscribe')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async checkSubscribe(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserDto
  ): Promise<any> {
    const subscribe = await this.performerService.checkSubscribed(
      id,
      currentUser
    );
    // TODO - check roles or other to response info
    return DataResponse.ok(subscribe);
  }

  @Post('/avatar/upload')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    FileUploadInterceptor('avatar', 'avatar', {
      destination: getConfig('file').avatarDir,
      generateThumbnail: true,
      replaceWithThumbail: true,
      thumbnailSize: getConfig('image').avatar
    })
  )
  async uploadPerformerAvatar(
    @FileUploaded() file: FileDto,
    @CurrentUser() performer: PerformerDto
  ): Promise<any> {
    // TODO - define url for perfomer id if have?
    await this.performerService.updateAvatar(performer, file);
    return DataResponse.ok({
      ...file,
      url: file.getUrl()
    });
  }

  @Post('/id-verification/upload')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    // TODO - check and support multiple files!!!
    MultiFileUploadInterceptor(
      [
        {
          type: 'performer-document',
          fieldName: 'idVerification',
          options: {
            destination: getConfig('file').documentDir
          }
        }
      ],
      {}
    )
  )
  async uploadPerformerIDVerification(
    @FilesUploaded() files: Record<string, FileDto>,
    @CurrentUser() performer: PerformerDto
  ): Promise<any> {
    // TODO - define url for perfomer id if have?
    try {
      if (!files.idVerification) {
        throw new HttpException('Missing document!', 400);
      }

      const file = await this.performerService.updateIDVerification(performer, files.idVerification);

      return DataResponse.ok({
        ...file,
        url: file.getUrl()
      });
    }
    catch (e) {
      files.idVerification && await this.fileService.remove(files.idVerification._id);
      throw e;
    }
  }

  @Delete('/avatar/delete')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  async deletePerformerAvatar(@CurrentUser() performer: PerformerDto){
    await this.performerService.deleteAvatar(performer);
    return DataResponse.ok(true);
  }

  @Delete('/cover/delete')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  async deletePerformerCover(@CurrentUser() performer: PerformerDto){
    await this.performerService.deleteCover(performer);
    return DataResponse.ok(true);
  }

  @Post('/cover/upload')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    FileUploadInterceptor('cover', 'cover', {
      destination: getConfig('file').coverDir,
      generateThumbnail: true,
      replaceWithThumbail: true,
      thumbnailSize: getConfig('image').coverThumbnail
    })
  )
  async uploadPerformerCover(
    @FileUploaded() file: FileDto,
    @CurrentUser() performer: PerformerDto
  ): Promise<any> {
    // TODO - define url for perfomer id if have?
    await this.performerService.updateCover(performer, file);
    return DataResponse.ok({
      ...file,
      url: file.getUrl()
    });
  }

  @Post('/chat/welcomeimg/upload')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  @UseInterceptors(
     // TODO - check and support multiple files!!!
     MultiFileUploadInterceptor([
      {
        type: 'message-video',
        fieldName: 'message-video',
        options: {
          destination: getConfig('file').videoMediaDir
        }
      },
      {
        type: 'message-photo',
        fieldName: 'message-photo',
        options: {
          destination: getConfig('file').imageMediaDir,
          replaceWithoutExif: true
        }
      }
    ])
  )
  async uploadPerformerChatWelcomeImg(
    @FilesUploaded() files: Record<string, any>,
    @CurrentUser() performer: PerformerDto
  ): Promise<any> {
    // TODO - define url for perfomer id if have?
    if(files['message-photo']){
      await this.performerService.updateWelcomeImage(performer, files['message-photo']);
      return DataResponse.ok({
        ...files['message-photo'],
        url: files['message-photo'].getUrl()
      });
    }else if(files['message-video']){
      await this.performerService.updateWelcomeMessageVideo(performer, files['message-video']);
      return DataResponse.ok({
        ...files['message-video'],
        url: files['message-video'].getUrl()
      });
    }
  }

  @Post('/welcome-video/upload')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    FileUploadInterceptor('performer-welcome-video', 'welcome-video', {
      destination: getConfig('file').videoDir
    })
  )
  async uploadPerformerVideo(
    @FileUploaded() file: FileDto,
    @CurrentUser() performer: PerformerDto
  ): Promise<any> {
    // TODO - define url for perfomer id if have?
    await this.performerService.updateWelcomeVideo(performer, file);
    return DataResponse.ok({
      ...file,
      url: file.getUrl()
    });
  }

  @Put('/:id/banking-settings')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  async updateBankingSetting(
    @Param('id') performerId: string,
    @Body() payload: BankingSettingPayload,
    @CurrentUser() user: UserDto
  ) {
    payload.bankAccount = Base64.decode(payload.bankAccount);
    payload.bankRouting = Base64.decode(payload.bankRouting);
    payload.bankSwiftCode = Base64.decode(payload.bankSwiftCode);
    payload.SSN = Base64.decode(payload.SSN);
   //if(payload.bankManageSwitch){
      payload.agentBankAccount = Base64.decode(payload.agentBankAccount);
      payload.agentBankRouting = Base64.decode(payload.agentBankRouting);
      payload.agentBankSwiftCode = Base64.decode(payload.agentBankSwiftCode);
      payload.agentSSN = Base64.decode(payload.agentSSN);
    //}
    const data = await this.performerService.updateBankingSetting(
      performerId,
      payload,
      user
    );
    return DataResponse.ok(data);
  }

  @Put('/:id/block-countries-settings')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
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

  @Post('/blocked-users')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  async blockUser(
    @CurrentUser() performer: UserDto,
    @Body() payload: BlockedByPerformerPayload
  ): Promise<DataResponse<any>> {
    const data = await this.performerService.blockUser(performer, payload);
    return DataResponse.ok(data);
  }

  @Delete('/blocked-users/:userId')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  async unblockUser(
    @Param('userId') userId: string,
    @CurrentUser() performer: UserDto
  ): Promise<DataResponse<boolean>> {
    const data = await this.performerService.unblockUser(performer, userId);
    return DataResponse.ok(data);
  }

  @Get('/blocked-users')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async search(
    @CurrentUser() performer: UserDto,
    @Body() payload: SearchBlockedByPerformerPayload
  ): Promise<DataResponse<PageableData<IBlockedUsersResponse>>> {
    const blocked = await this.performerService.getBlockedUsers(
      performer,
      payload
    );
    return DataResponse.ok(blocked);
  }

  @Get('/documents/auth/check')
  @HttpCode(HttpStatus.OK)
  async checkAuth(
    @Request() req: any
  ) {
    if (!req.query.token) throw new ForbiddenException();
    const user = await this.authService.getSourceFromJWT(req.query.token);
    if (!user) {
      throw new ForbiddenException();
    }
    const valid = await this.performerService.checkAuthDocument(req, user);
    return DataResponse.ok(valid);
  }
}
