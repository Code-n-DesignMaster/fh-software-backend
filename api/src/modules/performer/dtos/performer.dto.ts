import { ObjectId } from 'mongodb';
import { pick } from 'lodash';
import { FileDto } from 'src/modules/file';
import { UserDto } from 'src/modules/user/dtos';
interface ValueSchedule {
  start: string;
  end: string;
  closed: boolean;
}

export interface ISchedule {
  mon: ValueSchedule;
  tue: ValueSchedule;
  wed: ValueSchedule;
  thu: ValueSchedule;
  fri: ValueSchedule;
  sat: ValueSchedule;
  sun: ValueSchedule;
}
export interface IPerformerResponse {
  _id?: ObjectId;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneCode?: string; // international code prefix
  status?: string;
  avatar?: string;
  cover?: string;
  idVerificationId?: ObjectId;
  documentVerificationId?: ObjectId;
  gender?: string;
  country?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  address?: string;
  languages?: string[];
  studioId?: ObjectId;
  categoryIds?: ObjectId[];
  height?: string;
  weight?: string;
  bio?: string;
  eyes?: string;
  sexualPreference?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  stats?: {
    likes?: number;
    subscribers?: number;
    views?: number;
    totalVideos: number;
    totalPhotos: number;
    totalGalleries: number;
    totalProducts: number;
  };
  verifiedEmail?: boolean;
  score?: number;
  isPerformer: boolean;
  bankingInformation?: any;
  ccbillSetting?: any;
  commissionSetting?: any;
  blockCountries?: any;
  createdBy?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  isOnline?: boolean;
  activateWelcomeVideo?: boolean;
}

export interface IBlockedUsersResponse {
  _id?: string | ObjectId;
  userId?: string | ObjectId;
  userInfo?: UserDto;
}

export class PerformerDto {
  _id: ObjectId;
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  phoneCode?: string; // international code prefix
  status?: string;
  avatarId?: ObjectId;
  avatarPath?: string;
  coverId?: ObjectId;
  coverPath?: string;
  idVerificationId?: ObjectId;
  documentVerificationId?: ObjectId;
  idVerification?: any;
  verifiedEmail?: boolean;
  documentVerification?: any;
  avatar?: any;
  cover?: any;
  gender?: string;
  country?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  address?: string;
  languages?: string[];
  studioId?: ObjectId;
  categoryIds?: ObjectId[];
  schedule?: ISchedule;
  timezone?: string;
  noteForUser?: string;
  height?: string;
  weight?: string;
  bio?: string;
  eyes?: string;
  sexualPreference?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  stats?: {
    likes?: number;
    subscribers?: number;
    views?: number;
    totalVideos: number;
    totalPhotos: number;
    totalGalleries: number;
    totalProducts: number;
  };
  score?: number;
  age?: Date;
  isPerformer: boolean;
  bankingInformation?: any;
  ccbillSetting?: any;
  commissionSetting?: any;
  blockCountries?: any;
  createdBy?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  isOnline?: boolean;
  welcomeVideoId?: ObjectId;
  welcomeVideoPath?: string;
  activateWelcomeVideo?: boolean;

  isSubscribed?: boolean;
  isFreeSubscribed?: boolean;
  storeSwitch: boolean;
  subsribeSwitch: boolean;
  freeSubsribeSwitch: boolean;
  feature: boolean;
  enableChat?: boolean;
  enableWelcomeMessage?: boolean;
  welcomeImgPath?: string;
  welcomeMessage?: string;
  tipAmount?: number;
  welcomeImgfileId?: ObjectId;
  welcomeMessageVideoPath?: string;
  welcomeMessageMimeType?: string;
  welcomeMessageVideoId?: ObjectId;
  quote?: string;

  constructor(data?: Partial<any>) {
    Object.assign(
      this,
      pick(data, [
        '_id',
        'name',
        'firstName',
        'lastName',
        'name',
        'username',
        'email',
        'phone',
        'phoneCode',
        'status',
        'avatarId',
        'avatarPath',
        'coverId',
        'coverPath',
        'idVerificationId',
        'documentVerificationId',
        'idVerification',
        'documentVerification',
        'gender',
        'country',
        'city',
        'state',
        'zipcode',
        'address',
        'languages',
        'studioId',
        'categoryIds',
        'schedule',
        'timezone',
        'noteForUser',
        'height',
        'weight',
        'bio',
        'eyes',
        'sexualPreference',
        'monthlyPrice',
        'yearlyPrice',
        'stats',
        'age',
        'score',
        'isPerformer',
        'bankingInformation',
        'ccbillSetting',
        'commissionSetting',
        'blockCountries',
        'createdBy',
        'createdAt',
        'updatedAt',
        'verifiedEmail',
        'isOnline',
        'welcomeVideoId',
        'welcomeVideoPath',
        'activateWelcomeVideo',
        'isSubscribed',
        'isFreeSubscribed',
        'storeSwitch',
        'subsribeSwitch',
        'freeSubsribeSwitch',
        'feature',
        'enableChat',
        'enableWelcomeMessage',
        'welcomeImgPath',
        'welcomeMessage',
        'tipAmount',
        'welcomeImgfileId',
        'welcomeMessageVideoPath',
        'welcomeMessageMimeType',
        'welcomeMessageVideoId',
        'quote'
      ])
    );
  }

  toResponse(includePrivateInfo = false, isAdmin?: boolean) {
    const publicInfo = {
      _id: this._id,
      name: this.getName(),
      avatar: FileDto.getPublicUrl(this.avatarPath),
      cover: FileDto.getPublicUrl(this.coverPath),
      username: this.username,
      gender: this.gender,
      firstName: this.firstName,
      lastName: this.lastName,
      country: this.country,
      stats: this.stats,
      isPerformer: true,
      blockCountries: this.blockCountries,
      isOnline: this.isOnline,
      welcomeVideoPath: FileDto.getPublicUrl(this.welcomeVideoPath),
      activateWelcomeVideo: this.activateWelcomeVideo,
      isSubscribed: this.isSubscribed,
      isFreeSubscribed: this.isFreeSubscribed,
      age: this.age,
      subsribeSwitch: this.subsribeSwitch,
      freeSubsribeSwitch: this.freeSubsribeSwitch,
      welcomeImgPath: this.welcomeImgPath,
      welcomeMessage: this.welcomeMessage,
      tipAmount: this.tipAmount,
      welcomeImgfileId: this.welcomeImgfileId,
      welcomeMessageVideoPath: this.welcomeMessageVideoPath,
      welcomeMessageMimeType: this.welcomeMessageMimeType,
      welcomeMessageVideoId: this.welcomeMessageVideoId,
      quote: this.quote
    };
    const privateInfo = {
      verifiedEmail: this.verifiedEmail,
      email: this.email,
      phone: this.phone,
      phoneCode: this.phoneCode,
      status: this.status,
      name: this.getName(),
      city: this.city,
      state: this.state,
      zipcode: this.zipcode,
      address: this.address,
      languages: this.languages,
      categoryIds: this.categoryIds,
      idVerificationId: this.idVerificationId,
      documentVerificationId: this.documentVerificationId,
      documentVerification: this.documentVerification,
      idVerification: this.idVerification,
      schedule: this.schedule,
      timezone: this.timezone,
      noteForUser: this.noteForUser,
      height: this.height,
      weight: this.weight,
      bio: this.bio,
      eyes: this.eyes,
      sexualPreference: this.sexualPreference,
      monthlyPrice: this.monthlyPrice,
      yearlyPrice: this.yearlyPrice,
      bankingInformation: this.bankingInformation,
      welcomeVideoId: this.welcomeVideoId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      storeSwitch: this.storeSwitch,
      subsribeSwitch: this.subsribeSwitch,
      freeSubsribeSwitch: this.freeSubsribeSwitch,
      feature: this.feature,
      enableChat: this.enableChat,
      enableWelcomeMessage: this.enableWelcomeMessage,
      welcomeImgPath: this.welcomeImgPath,
      welcomeMessage: this.welcomeMessage,
      welcomeImgfileId: this.welcomeImgfileId,
      welcomeMessageVideoPath: this.welcomeMessageVideoPath,
      welcomeMessageMimeType: this.welcomeMessageMimeType,
      welcomeMessageVideoId: this.welcomeMessageVideoId
    };

    if (isAdmin) {
      return {
        ...publicInfo,
        ...privateInfo,
        ccbillSetting: this.ccbillSetting,
        commissionSetting: this.commissionSetting
      };
    }

    if (!includePrivateInfo) {
      return publicInfo;
    }

    return {
      ...publicInfo,
      ...privateInfo
    };
  }

  getName() {
    return [this.firstName || '', this.lastName || ''].join(' ');
  }

  toSearchResponse() {
    return {
      _id: this._id,
      name: this.getName(),
      avatar: FileDto.getPublicUrl(this.avatarPath),
      username: this.username,
      gender: this.gender,
      languages: this.languages,
      stats: this.stats,
      score: this.score,
      isPerformer: true,
      feature: this.feature
    };
  }

  toPublicDetailsResponse() {
    return {
      _id: this._id,
      name: this.getName(),
      avatar: FileDto.getPublicUrl(this.avatarPath),
      cover: FileDto.getPublicUrl(this.coverPath),
      username: this.username,
      status: this.status,
      gender: this.gender,
      firstName: this.firstName,
      lastName: this.lastName,
      country: this.country,
      city: this.city,
      state: this.state,
      zipcode: this.zipcode,
      address: this.address,
      languages: this.languages,
      categoryIds: this.categoryIds,
      schedule: this.schedule,
      timezone: this.timezone,
      noteForUser: this.noteForUser,
      height: this.height,
      weight: this.weight,
      bio: this.bio,
      eyes: this.eyes,
      sexualPreference: this.sexualPreference,
      monthlyPrice: this.monthlyPrice,
      yearlyPrice: this.yearlyPrice,
      stats: this.stats,
      isPerformer: true,
      score: this.score,
      blockCountries: this.blockCountries,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isOnline: this.isOnline,
      welcomeVideoPath: FileDto.getPublicUrl(this.welcomeVideoPath),
      activateWelcomeVideo: this.activateWelcomeVideo,
      isSubscribed: this.isSubscribed,
      isFreeSubscribed: this.isFreeSubscribed,
      age: this.age,
      storeSwitch: this.storeSwitch,
      subsribeSwitch: this.subsribeSwitch,
      freeSubsribeSwitch: this.freeSubsribeSwitch,
      feature: this.feature,
      enableChat: this.enableChat,
      enableWelcomeMessage: this.enableWelcomeMessage,
      tipAmount: this.tipAmount,
      welcomeImgPath: this.welcomeImgPath,
      welcomeMessage: this.welcomeMessage,
      welcomeImgfileId: this.welcomeImgfileId,
      welcomeMessageVideoPath: this.welcomeMessageVideoPath,
      welcomeMessageMimeType: this.welcomeMessageMimeType,
      welcomeMessageVideoId: this.welcomeMessageVideoId,
      quote: this.quote
    };
  }
}
