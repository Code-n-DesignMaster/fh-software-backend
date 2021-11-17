/* eslint-disable no-console */
import {
  Injectable,
  Inject,
  forwardRef,
  NotAcceptableException,
  HttpException
} from '@nestjs/common';
import { Model } from 'mongoose';
import { EntityNotFoundException, AgendaService } from 'src/kernel';
import { AUTH_MODEL_PROVIDER } from 'src/modules/auth/providers/auth.provider';
import { AuthModel } from 'src/modules/auth/models';
import { REF_TYPE } from 'src/modules/file/constants';
import { PERFORMER_STATUSES } from 'src/modules/performer/constants';
import { difference } from 'lodash';

import {
  PERFORMER_MODEL_PROVIDER,
  PERFORMER_PAYMENT_GATEWAY_SETTING_MODEL_PROVIDER,
  PERFORMER_COMMISSION_SETTING_MODEL_PROVIDER,
  PERFORMER_BANKING_SETTING_MODEL_PROVIDER,
  PERFORMER_BLOCK_COUNTRIES_SETTING_MODEL_PROVIDER,
  BLOCKED_BY_PERFORMER_PROVIDER
} from '../providers';
import {
  PerformerCreatePayload,
  PerformerUpdatePayload,
  PerformerRegisterPayload,
  SelfUpdatePayload,
  PaymentGatewaySettingPayload,
  CommissionSettingPayload,
  BankingSettingPayload,
  BlockCountriesSettingPayload,
  BlockedByPerformerPayload,
  SearchBlockedByPerformerPayload
} from '../payloads';
import {
  PerformerModel,
  PaymentGatewaySettingModel,
  CommissionSettingModel,
  BankingModel,
  BlockCountriesSettingModel,
  BlockedByPerformerModel
} from '../models';
import {
  UsernameExistedException,
  EmailExistedException,
  BlockedCountryException,
  BlockedByPerformerException
} from '../exceptions';
import { PerformerDto } from '../dtos';
import { ObjectId } from 'mongodb';
import { FileService } from 'src/modules/file/services';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import {SettingService} from 'src/modules/settings/services/setting.service'
import { FileDto } from 'src/modules/file';
import { UserDto } from 'src/modules/user/dtos';
import { STATUS } from 'src/kernel/constants';
import { VerificationService } from 'src/modules/auth/services/verification.service';
const CHECK_AND_UPDATE_SUBSCRIPTIONS_COUNT = 'CHECK_AND_UPDATE_SUBSCRIPTIONS_COUNT';
const CHECK_REF_REMOVE_PERFORMER_FILE_AGENDA = 'CHECK_REF_REMOVE_PERFORMER_FILE_AGENDA';

@Injectable()
export class PerformerService {
  constructor(
    @Inject(AUTH_MODEL_PROVIDER)
    private readonly authModel: Model<AuthModel>,
    @Inject(PERFORMER_MODEL_PROVIDER)
    private readonly performerModel: Model<PerformerModel>,
    private readonly fileService: FileService,
    private readonly subscriptionService: SubscriptionService,
    private readonly agenda: AgendaService,
    private readonly setting: SettingService,
    private readonly verificationService: VerificationService,
    @Inject(PERFORMER_PAYMENT_GATEWAY_SETTING_MODEL_PROVIDER)
    private readonly paymentGatewaySettingModel: Model<PaymentGatewaySettingModel>,
    @Inject(PERFORMER_BANKING_SETTING_MODEL_PROVIDER)
    private readonly bankingSettingModel: Model<BankingModel>,
    @Inject(PERFORMER_COMMISSION_SETTING_MODEL_PROVIDER)
    private readonly commissionSettingModel: Model<CommissionSettingModel>,
    @Inject(PERFORMER_BLOCK_COUNTRIES_SETTING_MODEL_PROVIDER)
    private readonly blockCountriesSettingModel: Model<BlockCountriesSettingModel>,
    @Inject(BLOCKED_BY_PERFORMER_PROVIDER)
    private readonly blockedByPerformerModel: Model<BlockedByPerformerModel>
  ) {
    this.agenda.define(CHECK_AND_UPDATE_SUBSCRIPTIONS_COUNT, { }, this.checkUpdateSubscriptionCount.bind(this));
    this.agenda.every('24 hours', CHECK_AND_UPDATE_SUBSCRIPTIONS_COUNT, {});

    this.agenda.define(CHECK_REF_REMOVE_PERFORMER_FILE_AGENDA, { }, this.checkRefAndRemoveFile.bind(this));
    this.agenda.every('24 hours', CHECK_REF_REMOVE_PERFORMER_FILE_AGENDA, {});
  }

  public async isUpdateSelf(
    userName: string,
    email: string): Promise<number>{
    const count = await this.performerModel.countDocuments({
      username: userName.trim(),
      email: email.trim()
    });
    return count;
  }

  public async checkUsername(
     userName: string
    ) : Promise<void>{
      try{
      const check = await this.performerModel.countDocuments({
        username: userName ? userName.trim(): userName
      });  
      if (check) {
        throw new UsernameExistedException();
      }
    }
    catch(e){
      console.log('This username has been taken, please choose another one', e);
      throw e;
    }
  }
  
  public async checkEmail(
    email: string
    ) : Promise<void>{
      try{
      const check = await this.performerModel.countDocuments({
        email: email.trim()
      });
      if (check) {
        throw new EmailExistedException();
      }
    }
    catch(e){
      console.log('Email has been taken', e);
      throw e;
    }
  }

  private async checkUpdateSubscriptionCount(job, done) {
    try {
      const performers = await this.performerModel.find({ status: PERFORMER_STATUSES.ACTIVE });
      performers.forEach(async (performer) => {
        const count = await this.subscriptionService.countSubscriptions({
          performerId: performer._id,
          status: STATUS.ACTIVE,
          expiredAt: { $gte: new Date() }
        });
        await this.performerModel.updateOne({ _id: performer._id }, {
          'stats.subscribers': count
        });
      });
    } catch (e) {
      console.log('Check & update subscription expiration', e);
    } finally {
      done();
    }
  }

  private async checkRefAndRemoveFile(job: any, done: any): Promise<void> {
    try {
      const files = await this.fileService.findByRefType(REF_TYPE.PERFORMER);
      const performerIds = files.map((f) => f.refItems[0].itemId.toString());
      const performers = await this.performerModel.find({ _id: { $in: performerIds } });
      const Ids = performers.map((v) => v._id.toString());
      const difIds = difference(performerIds, Ids);
      const difFileIds = files.filter((file) => difIds.includes(file.refItems[0].itemId.toString()));
      difFileIds.forEach(async (fileId) => {
        await this.fileService.remove(fileId);
      });
    } catch (e) {
      console.log('Check ref & remove files error', e);
    } finally {
      done();
    }
  }

  public async checkBlockedByIp(
    performerId: string | ObjectId,
    countryCode: string
  ): Promise<boolean> {
    const blockCountries = await this.blockCountriesSettingModel.findOne({
      performerId
    });

    if (
      blockCountries
      && blockCountries.countries
      && blockCountries.countries.length
    ) {
      return blockCountries.countries.indexOf(countryCode) > -1;
    }

    return false;
  }

  public async checkBlockedByPerformer(
    performerId: string | ObjectId,
    userId: string | ObjectId
  ): Promise<boolean> {
    const blocked = await this.blockedByPerformerModel.countDocuments({
      userId,
      performerId
    });

    return blocked > 0;
  }

  public async findById(
    id: string | ObjectId
  ): Promise<PerformerDto> {
    const model = await this.performerModel.findById(id);
    if (!model) return null;
    return new PerformerDto(model);
  }

  public async findByUsername(
    username: string,
    countryCode?: string,
    currentUser?: UserDto
  ): Promise<PerformerDto> {
    const findUsername = username.replace(/[^a-zA-Z0-9_]/g, '');
    const model = await this.performerModel.findOne({ username: findUsername });
    if (!model) return null;
    let isBlocked = false;
    if (countryCode) {
      isBlocked = await this.checkBlockedByIp(model._id, countryCode);
      if (isBlocked) {
        throw new BlockedCountryException();
      }
    }
    let isBlockedByPerformer = false;
    let isSubscribed = false;
    let isFreeSubscribed = false;
    if (currentUser) {
      isBlockedByPerformer = await this.checkBlockedByPerformer(
        model._id,
        currentUser._id
      );
      if (isBlockedByPerformer) throw new BlockedByPerformerException();
      const checkSubscribe = await this.subscriptionService.checkSubscribed(model.id, currentUser._id);
      isSubscribed = !!checkSubscribe;

      const checkFreeSubscribe = await this.subscriptionService.checkFreeSubscribed(model.id, currentUser._id);
      isFreeSubscribed = !!checkFreeSubscribe;
    }
    const dto = new PerformerDto(model);
    dto.isSubscribed = isSubscribed;
    dto.isFreeSubscribed = isFreeSubscribed;
    dto.subsribeSwitch = model.subsribeSwitch;
    dto.freeSubsribeSwitch = model.freeSubsribeSwitch;
    if (model.avatarId) {
      const avatar = await this.fileService.findById(model.avatarId);
      dto.avatarPath = avatar ? avatar.path : null;
    }
    if (model.welcomeVideoId) {
      //const welcomeVideo = await this.fileService.findById(model.welcomeVideoId);
      //dto.welcomeVideoPath = welcomeVideo ? welcomeVideo.getUrl() : null;
      dto.welcomeVideoPath = model.welcomeVideoPath;
    }
    return dto;
  }

  public async findByEmail(email: string): Promise<PerformerDto> {
    if (!email) {
      return null;
    }
    const model = await this.performerModel.findOne({
      email: email.toLowerCase()
    });
    if (!model) return null;
    return new PerformerDto(model);
  }

  public async findByIds(ids: any[]): Promise<PerformerDto[]> {
    const performers = await this.performerModel
      .find({
        _id: {
          $in: ids
        }
      })
      .lean()
      .exec();
    return performers.map((p) => new PerformerDto(p));
  }

  public async getDetails(id: string | ObjectId, jwtToken: string, payload?: SelfUpdatePayload): Promise<PerformerDto> {
    const performer = await this.performerModel.findById(id);
   
    if (!performer) {
      throw new EntityNotFoundException();
    }

    const [
      avatar,
      documentVerification,
      idVerification,
      cover,
      welcomeVideo
    ] = await Promise.all([
      performer.avatarId ? this.fileService.findById(performer.avatarId) : null,
      performer.documentVerificationId
        ? this.fileService.findById(performer.documentVerificationId)
        : null,
      performer.idVerificationId
        ? this.fileService.findById(performer.idVerificationId)
        : null,
      performer.coverId ? this.fileService.findById(performer.coverId) : null,
      performer.welcomeVideoId ? this.fileService.findById(performer.welcomeVideoId) : null
    ]);

    // TODO - update kernel for file dto
    const dto = new PerformerDto(performer);

    dto.avatar = avatar ? FileDto.getPublicUrl(avatar.path) : null; // TODO - get default avatar
    dto.cover = cover ? FileDto.getPublicUrl(cover.path) : null;
    dto.welcomeVideoPath = welcomeVideo ? FileDto.getPublicUrl(welcomeVideo.path) : null;
    if(dto.welcomeVideoPath !== performer.welcomeVideoPath){
      dto.welcomeVideoPath = performer.welcomeVideoPath;
    }
    if(payload && payload.activateWelcomeVideo){
      dto.welcomeVideoPath = payload.welcomeVideoPath;
    }
    dto.idVerification = idVerification
      ? {
        _id: idVerification._id,
        url: jwtToken ? `${FileDto.getPublicUrl(idVerification.path)}?documentId=${idVerification._id}&token=${jwtToken}` : FileDto.getPublicUrl(idVerification.path),
        mimeType: idVerification.mimeType
      }
      : null;
    dto.documentVerification = documentVerification
      ? {
        _id: documentVerification._id,
        url: jwtToken ? `${FileDto.getPublicUrl(documentVerification.path)}?documentId=${documentVerification._id}&token=${jwtToken}` : FileDto.getPublicUrl(documentVerification.path),
        mimeType: documentVerification.mimeType
      }
      : null;
    dto.ccbillSetting = await this.paymentGatewaySettingModel.findOne({
      performerId: id
    });
    if(!dto.ccbillSetting){
      const ccbillClientAccountNumber = await this.setting.getKeyValue('ccbillClientAccountNumber');
      const ccbillSubAccountNumber = process.env.WEBSITE=='honeydrip' ? await this.setting.getKeyValue('ccbillHoneyDripSubAccountNumber') : await this.setting.getKeyValue('ccbillSubAccountNumber');
      const ccbillPurAccountNumber = process.env.WEBSITE=='honeydrip' ? await this.setting.getKeyValue('ccbillHoneyDripPurAccountNumber') : await this.setting.getKeyValue('ccbillPurAccountNumber');
      const ccbillFlexformId = await this.setting.getKeyValue('ccbillFlexformId');
      const ccbillSalt = await this.setting.getKeyValue('ccbillSalt');
      dto.ccbillSetting = {};
      dto.ccbillSetting.value ={
        clientAccountNumber : ccbillClientAccountNumber,
        subscriptionSubAccountNumber: ccbillSubAccountNumber,
        singlePurchaseSubAccountNumber: ccbillPurAccountNumber,
        flexformId: ccbillFlexformId,
        salt: ccbillSalt
      }
    }

    dto.commissionSetting = await this.commissionSettingModel.findOne({
      performerId: id
    });

    dto.bankingInformation = await this.bankingSettingModel.findOne({
      performerId: id
    });
    dto.blockCountries = await this.blockCountriesSettingModel.findOne({
      performerId: id
    });
    return dto;
  }

  public async create(
    payload: PerformerCreatePayload,
    user?: UserDto
  ): Promise<PerformerDto> {
    const data = {
      ...payload,
      updatedAt: new Date(),
      createdAt: new Date()
    } as any;
    const userNameCheck = await this.performerModel.countDocuments({
      username: payload.username.trim()
    });
    if (userNameCheck) {
      throw new UsernameExistedException();
    }

    const emailCheck = await this.performerModel.countDocuments({
      email: payload.email.toLowerCase()
    });
    if (emailCheck) {
      throw new EmailExistedException();
    }

    if (payload.avatarId) {
      const avatar = await this.fileService.findById(payload.avatarId);
      if (!avatar) {
        throw new EntityNotFoundException('Avatar not found!');
      }
      // TODO - check for other storaged
      data.avatarPath = avatar.path;
    }

    if (payload.coverId) {
      const cover = await this.fileService.findById(payload.coverId);
      if (!cover) {
        throw new EntityNotFoundException('Cover not found!');
      }
      // TODO - check for other storaged
      data.coverPath = cover.path;
    }

    // TODO - check for category Id, studio
    if (user) {
      data.createdBy = user._id;
    }
    data.username = data.username.trim();
    data.email = data.email.toLowerCase();
    const performer = await this.performerModel.create(data);

    await Promise.all([
      payload.idVerificationId
      && this.fileService.addRef(payload.idVerificationId, {
        itemId: performer._id as any,
        itemType: REF_TYPE.PERFORMER
      }),
      payload.documentVerificationId && this.fileService.addRef(payload.documentVerificationId, {
        itemId: performer._id as any,
        itemType: REF_TYPE.PERFORMER
      }),
      payload.avatarId
      && this.fileService.addRef(payload.avatarId, {
        itemId: performer._id as any,
        itemType: REF_TYPE.PERFORMER
      })

    ]);

    // TODO - fire event?
    return new PerformerDto(performer);
  }

  public async register(
    payload: PerformerRegisterPayload
  ): Promise<PerformerDto> {
    const data = {
      ...payload,
      updatedAt: new Date(),
      createdAt: new Date()
    } as any;
    const userNameCheck = await this.performerModel.countDocuments({
      username: payload.username.trim()
    });
    if (userNameCheck) {
      throw new UsernameExistedException();
    }

    const emailCheck = await this.performerModel.countDocuments({
      email: payload.email.toLowerCase().trim()
    });
    if (emailCheck) {
      throw new EmailExistedException();
    }

    if (payload.avatarId) {
      const avatar = await this.fileService.findById(payload.avatarId);
      if (!avatar) {
        throw new EntityNotFoundException('Avatar not found!');
      }
      // TODO - check for other storaged
      data.avatarPath = avatar.path;
    }
    data.username = data.username.trim();
    data.email = data.email.toLowerCase();
    const performer = await this.performerModel.create(data);

    await Promise.all([
      payload.idVerificationId
      && this.fileService.addRef(payload.idVerificationId, {
        itemId: performer._id as any,
        itemType: REF_TYPE.PERFORMER
      }),
      payload.documentVerificationId && this.fileService.addRef(payload.documentVerificationId, {
        itemId: performer._id as any,
        itemType: REF_TYPE.PERFORMER
      }),
      payload.avatarId && this.fileService.addRef(payload.avatarId, {
        itemId: performer._id as any,
        itemType: REF_TYPE.PERFORMER
      })
    ]);

    // TODO - fire event?
    return new PerformerDto(performer);
  }

  public async adminUpdate(
    id: string | ObjectId,
    payload: PerformerUpdatePayload
  ): Promise<any> {
    const performer = await this.performerModel.findById(id);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    const data = { ...payload } as any;
    if (!data.name) {
      data.name = [data.firstName || '', data.lastName || ''].join(' ');
    }

    if (
      data.email
      && data.email.toLowerCase() !== performer.email.toLowerCase()
    ) {
      const emailCheck = await this.performerModel.countDocuments({
        email: data.email.toLowerCase(),
        _id: {
          $ne: performer._id
        }
      });
      if (emailCheck) {
        throw new EmailExistedException();
      }
      data.email = data.email.toLowerCase();
    }

    if (
      data.username
      && data.username.trim() !== performer.username.trim()
    ) {
      const usernameCheck = await this.performerModel.countDocuments({
        username: data.username.trim(),
        _id: { $ne: performer._id }
      });
      if (usernameCheck) {
        throw new UsernameExistedException();
      }
      data.username = data.username.trim();
    }

    if (
      (payload.avatarId && !performer.avatarId)
      || (performer.avatarId
        && payload.avatarId
        && payload.avatarId !== performer.avatarId.toString())
    ) {
      const avatar = await this.fileService.findById(payload.avatarId);
      if (!avatar) {
        throw new EntityNotFoundException('Avatar not found!');
      }
      // TODO - check for other storaged
      data.avatarPath = avatar.path;
    }

    if (
      (payload.coverId && !performer.coverId)
      || (performer.coverId
        && payload.coverId
        && payload.coverId !== performer.coverId.toString())
    ) {
      const cover = await this.fileService.findById(payload.coverId);
      if (!cover) {
        throw new EntityNotFoundException('Cover not found!');
      }
      // TODO - check for other storaged
      data.coverPath = cover.path;
    }

    await this.performerModel.updateOne({ _id: id }, data, { new: true });
    // update auth key if username or email has changed
    if ((data.email && data.email.toLowerCase() !== performer.email.toLowerCase())
      || (data.username && data.username.trim() !== performer.username.trim())) {
      const auths = await this.authModel.find({
        source: 'performer',
        sourceId: id
      });

      const user = await this.findById(id);
      if (!user) {
        throw new EntityNotFoundException();
      }

      await Promise.all(auths.map((auth) => {
        // eslint-disable-next-line no-param-reassign
        auth.key = auth.type === 'email' ? user.email : user.username;
        return auth.save();
      }));
    }
    if (payload.documentVerificationId && `${payload.documentVerificationId}` !== `${performer.documentVerificationId}`) {
      performer.documentVerificationId && await this.fileService.remove(performer.documentVerificationId);
    }
    if (payload.idVerificationId && `${payload.idVerificationId}` !== `${performer.idVerificationId}`) {
      performer.idVerificationId && await this.fileService.remove(performer.idVerificationId);
    }
    if(data.status === PERFORMER_STATUSES.ACTIVE && performer.status === PERFORMER_STATUSES.INACTIVE){
       await this.verificationService.sendPerformerActiveEmail(performer.id);
    }
    return true;
  }

  public async selfUpdate(
    id: string | ObjectId,
    payload: SelfUpdatePayload,
    welcomeVideo?: FileDto
  ): Promise<any> {
    const performer = await this.performerModel.findById(id);
    if (!performer) {
      throw new EntityNotFoundException();
    }
    if (welcomeVideo && !welcomeVideo.mimeType.toLowerCase().includes('video')) {
      await this.fileService.remove(welcomeVideo._id);
    }
    const data = { ...payload } as any;
    if (!data.name) {
      data.name = [data.firstName || '', data.lastName || ''].join(' ').trim();
    }
    await this.performerModel.updateOne({ _id: id }, data, { new: true });
    if (payload.documentVerificationId && `${payload.documentVerificationId}` !== `${performer.documentVerificationId}`) {
      performer.documentVerificationId && await this.fileService.remove(performer.documentVerificationId);
    }
    if (payload.idVerificationId && `${payload.idVerificationId}` !== `${performer.idVerificationId}`) {
      performer.idVerificationId && await this.fileService.remove(performer.idVerificationId);
    }
    return true;
  }

  public async updateAvatar(user: PerformerDto, file: FileDto) {
    await this.performerModel.updateOne(
      { _id: user._id },
      {
        avatarId: file._id,
        avatarPath: file.path
      }
    );
    await this.fileService.addRef(file._id, {
      itemId: user._id,
      itemType: REF_TYPE.PERFORMER
    });

    // resend user info?
    // TODO - check others config for other storage
    return file;
  }

  public async deleteAvatar(performer: PerformerDto) {
     const fileId = performer.avatarId;
     await this.performerModel.updateOne(
      { _id: performer._id },
      {
        avatarId: null,
        avatarPath: null
      }
    );
     await this.fileService.removeIfNotHaveRef(fileId);
  }

  public async deleteCover(performer: PerformerDto) {
    console.log(performer);
    
    const fileId = performer.coverId;
    await this.performerModel.updateOne(
     { _id: performer._id },
     {
       coverId: null,
       coverPath: null
     }
   );
    await this.fileService.removeIfNotHaveRef(fileId);
 }

 public async updateIDVerification(user: PerformerDto, file: FileDto) {
  await this.performerModel.updateOne(
    { _id: user._id },
    {
      idVerificationId: file._id,
    }
  );

  return file;
 }

  public async updateCover(user: PerformerDto, file: FileDto) {
    await this.performerModel.updateOne(
      { _id: user._id },
      {
        coverId: file._id,
        coverPath: file.path
      }
    );
    await this.fileService.addRef(file._id, {
      itemId: user._id,
      itemType: REF_TYPE.PERFORMER
    });

    return file;
  }

  public async updateWelcomeImage(user: PerformerDto, file: FileDto) {
    if (!file) throw new HttpException('File is valid!', 400);
    if (!file.isImage()) {
      await this.fileService.removeIfNotHaveRef(file._id);
      throw new HttpException('Invalid image!', 400);
    }
    await this.performerModel.updateOne(
      { _id: user._id },
      {
        welcomeImgfileId: file._id,
        welcomeImgPath: file.path,
        welcomeMessageMimeType: file.mimeType
      }
    );
    await this.fileService.addRef(file._id, {
      itemId: user._id,
      itemType: REF_TYPE.PERFORMER
    });

    return file;
  }

  public async updateWelcomeMessageVideo(user: PerformerDto, file: FileDto) {
    if (!file) throw new HttpException('File is valid!', 400);
    if (!file.isVideo()) {
      await this.fileService.removeIfNotHaveRef(file._id);
      throw new HttpException('Invalid video!', 400);
    }
    await this.performerModel.updateOne(
      { _id: user._id },
      {
        welcomeMessageVideoId: file._id,
        welcomeMessageVideoPath: file.path,
        welcomeMessageMimeType: file.mimeType
      }
    );
    await this.fileService.addRef(file._id, {
      itemId: user._id,
      itemType: REF_TYPE.PERFORMER
    });

    return file;
  }

  public async updateWelcomeVideo(user: PerformerDto, file: FileDto) {
    await this.performerModel.updateOne(
      { _id: user._id },
      {
        welcomeVideoId: file._id,
        welcomeVideoPath: file.path
      }
    );

    await this.fileService.addRef(file._id, {
      itemId: user._id,
      itemType: REF_TYPE.PERFORMER
    });

    return file;
  }

  public async checkSubscribed(performerId: string | ObjectId, user: UserDto) {
    const count = await this.subscriptionService.checkSubscribed(
      performerId,
      user._id
    );
    return { subscribed: count > 0 };
  }

  public async viewProfile(username: string) {
    return this.performerModel.updateOne(
      { username },
      {
        $inc: { 'stats.views': 1 }
      },
      { new: true }
    );
  }

  public async updatePaymentGateway(payload: PaymentGatewaySettingPayload) {
    let item = await this.paymentGatewaySettingModel.findOne({
      key: payload.key,
      performerId: payload.performerId
    });
    if (!item) {
      // eslint-disable-next-line new-cap
      item = new this.paymentGatewaySettingModel();
    }
    item.key = payload.key;
    item.performerId = payload.performerId as any;
    item.status = 'active';
    item.value = payload.value;
    return item.save();
  }

  public async getPaymentSetting(
    performerId: string | ObjectId,
    service = 'ccbill'
  ) {
    return this.paymentGatewaySettingModel.findOne({
      key: service,
      performerId
    });
  }

  public async updateSubscriptionStat(performerId: string | ObjectId, num = 1) {
    return this.performerModel.updateOne(
      { _id: performerId },
      {
        $inc: { 'stats.subscribers': num }
      },
      { new: true }
    );
  }

  public async updateLikeStat(performerId: string | ObjectId, num = 1) {
    return this.performerModel.updateOne(
      { _id: performerId },
      {
        $inc: { 'stats.likes': num }
      },
      { new: true }
    );
  }

  public async updateCommissionSetting(
    performerId: string,
    payload: CommissionSettingPayload
  ) {
    let item = await this.commissionSettingModel.findOne({
      performerId
    });
    if (!item) {
      // eslint-disable-next-line new-cap
      item = new this.commissionSettingModel();
    }
    item.performerId = performerId as any;
    item.monthlySubscriptionCommission = payload.monthlySubscriptionCommission;
    item.yearlySubscriptionCommission = payload.yearlySubscriptionCommission;
    item.videoSaleCommission = payload.videoSaleCommission;
    item.productSaleCommission = payload.productSaleCommission;
    item.tipCommission = payload.tipCommission;
    item.gallerySaleCommission = payload.gallerySaleCommission;
    return item.save();
  }

  public async updateBankingSetting(
    performerId: string,
    payload: BankingSettingPayload,
    currentUser: UserDto
  ) {
    if (
      (currentUser.roles
        && currentUser.roles.indexOf('admin') === -1
        && currentUser._id.toString() !== performerId)
      || (!currentUser.roles
        && currentUser
        && currentUser._id.toString() !== performerId)
    ) {
      throw new NotAcceptableException('Permission denied');
    }
    let item = await this.bankingSettingModel.findOne({
      performerId
    });
    if (!item) {
      // eslint-disable-next-line new-cap
      item = new this.bankingSettingModel(payload);
    }
    item.performerId = performerId as any;
    item.firstName = payload.firstName;
    item.lastName = payload.lastName;
    item.SSN = payload.SSN;
    item.bankName = payload.bankName;
    item.bankAccount = payload.bankAccount;
    item.bankRouting = payload.bankRouting;
    item.bankSwiftCode = payload.bankSwiftCode;
    item.address = payload.address;
    item.city = payload.city;
    item.state = payload.state;
    item.country = payload.country;
    item.bankManageSwitch = payload.bankManageSwitch;
    item.managePercentageFee = payload.managePercentageFee;
    item.agentBankName = payload.agentBankName;
    item.agentBankAccount = payload.agentBankAccount;
    item.agentBankRouting = payload.agentBankRouting;
    item.agentBankSwiftCode = payload.agentBankSwiftCode;
    item.agentFirstName = payload.agentFirstName;
    item.agentlastName = payload.agentlastName;
    item.agentSSN = payload.agentSSN;
    item.agentAddress = payload.agentAddress;
    item.agentCity = payload.agentCity;
    item.agentState = payload.agentState;
    item.agentCountry = payload.agentCountry;
    return item.save();
  }

  public async updateVerificationStatus(
    userId: string | ObjectId
  ): Promise<any> {
    const performer = await this.performerModel.findById(userId);
    if(performer.status !== STATUS.ACTIVE){
      return this.performerModel.updateOne(
        {
          _id: userId
        },
        { status: STATUS.INACTIVE, verifiedEmail: true },
        { new: true }
      );
    }else{
      return this.performerModel.updateOne(
        {
          _id: userId
        },
        { verifiedEmail: true },
        { new: true }
      );
    }
  }

  public async getCommissions(performerId: string | ObjectId) {
    return this.commissionSettingModel.findOne({ performerId });
  }

  public async getBlockUserList(query) {
    return this.blockedByPerformerModel.find(query);
  }

  public async updateBlockCountriesSetting(
    performerId: string,
    payload: BlockCountriesSettingPayload,
    currentUser: UserDto
  ) {
    if (
      (currentUser.roles
        && currentUser.roles.indexOf('admin') === -1
        && currentUser._id.toString() !== performerId)
      || (!currentUser.roles
        && currentUser
        && currentUser._id.toString() !== performerId)
    ) {
      throw new NotAcceptableException(
        'Permission denied'
      );
    }
    let item = await this.blockCountriesSettingModel.findOne({
      performerId
    });
    if (!item) {
      // eslint-disable-next-line new-cap
      item = new this.blockCountriesSettingModel();
    }
    item.performerId = performerId as any;
    item.countries = payload.countries;
    return item.save();
  }

  public async blockUser(
    currentUser: UserDto,
    payload: BlockedByPerformerPayload
  ) {
    const blocked = await this.blockedByPerformerModel.findOne({
      userId: payload.userId,
      performerId: currentUser._id
    });
    const subscription = await this.subscriptionService.findOneSubscription(
      currentUser._id,
      payload.userId
    );
    if (!subscription) {
      throw new EntityNotFoundException();
    }
    if (blocked) {
      subscription.status = STATUS.INACTIVE;
      subscription.blockedUser = true;
      await subscription.save();
      return blocked;
    }
    const newBlock = await this.blockedByPerformerModel.create({
      ...payload,
      performerId: currentUser._id,
      blockBy: currentUser._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    subscription.status = STATUS.INACTIVE;
    subscription.blockedUser = true;
    await subscription.save();
    return newBlock;
  }

  public async unblockUser(currentUser: UserDto, userId: string) {
    const blocked = await this.blockedByPerformerModel.findOne({
      userId,
      performerId: currentUser._id
    });
    const subscription = await this.subscriptionService.findOneSubscription(
      currentUser._id,
      userId
    );
    if (!subscription) {
      throw new EntityNotFoundException();
    }
    if (!blocked) {
      return false;
    }
    await blocked.remove();
    subscription.status = STATUS.ACTIVE;
    subscription.blockedUser = false;
    await subscription.save();
    return true;
  }

  public async getBlockedUsers(
    currentUser: UserDto,
    req: SearchBlockedByPerformerPayload
  ) {
    const query = {} as any;
    query.performerId = currentUser._id;
    let sort = {};
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.blockedByPerformerModel
        .find(query)
        .sort(sort)
        .limit(parseInt(req.limit as string, 10))
        .skip(parseInt(req.offset as string, 10)),
      this.blockedByPerformerModel.countDocuments(query)
    ]);

    return {
      data, // TODO - define mdoel
      total
    };
  }

  public async checkAuthDocument(req: any, user: UserDto) {
    const { query } = req;
    if (!query.documentId) {
      return false;
    }
    if (user.roles && user.roles.indexOf('admin') > -1) {
      return true;
    }
    // check type video
    const file = await this.fileService.findById(query.documentId);
    if (!file || !file.refItems || (file.refItems[0] && file.refItems[0].itemType !== REF_TYPE.PERFORMER)) return false;
    if (file.refItems && file.refItems[0].itemId && user._id.toString() === file.refItems[0].itemId.toString()) {
      return true;
    }
    return false;
  }

  public async delete(
    userId: string | ObjectId
  ): Promise<any> {
    // return this.performerModel.updateOne(
    //   {
    //     _id: userId
    //   },
    //   { status : STATUS.DELETED },
    //   { $new: true }
    // );
    return this.performerModel.deleteOne(
      {
        _id: userId
      }
    );
  }
}
