import {
  IsString,
  IsOptional,
  Validate,
  IsEmail,
  IsNotEmpty,
  IsIn,
  IsArray,
  MinLength,
  IsObject,
  IsNumber,
  Min,
  IsBoolean,
  IsDate
} from 'class-validator';
import { Username } from 'src/modules/user/validators/username.validator';
import { GENDERS } from 'src/modules/user/constants';
import { PERFORMER_STATUSES } from '../constants';
import { ApiProperty } from '@nestjs/swagger';
import { ISchedule } from '../dtos';
import { ObjectId } from 'mongodb';

export class PerformerCreatePayload {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  //@Validate(Username)
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password?: string;

  @ApiProperty()
  @IsString()
  @IsIn([
    PERFORMER_STATUSES.ACTIVE,
    PERFORMER_STATUSES.INACTIVE,
    PERFORMER_STATUSES.PENDING
  ])
  @IsOptional()
  status = PERFORMER_STATUSES.ACTIVE;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  verifiedEmail?: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phoneCode?: string; // international code prefix

  @ApiProperty()
  @IsString()
  @IsOptional()
  avatarId?: ObjectId;

  @ApiProperty()
  @IsString()
  @IsOptional()
  coverId?: ObjectId;

  @ApiProperty()
  @IsString()
  @IsOptional()
  idVerificationId?: ObjectId;

  @ApiProperty()
  @IsString()
  @IsOptional()
  documentVerificationId?: ObjectId;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsIn(GENDERS)
  gender?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  age: Date;

  @ApiProperty()
  @IsString()
  @IsOptional()
  zipcode?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @ApiProperty()
  @IsString()
  @IsOptional()
  studioId?: string;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiProperty()
  @IsOptional()
  @IsObject()
  schedule?: ISchedule;

  @ApiProperty()
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  noteForUser?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  height?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  weight?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  eyes?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  sexualPreference: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @IsOptional()
  monthlyPrice: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @IsOptional()
  yearlyPrice: number;

  @ApiProperty()
  @IsOptional()
  bankingInfomation?: any;

  @ApiProperty()
  @IsString()
  @IsOptional()
  quote?: string;
}

export class PerformerRegisterPayload {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  //@Validate(Username)
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password?: string;

  @ApiProperty()
  @IsString()
  @IsIn([
    PERFORMER_STATUSES.ACTIVE,
    PERFORMER_STATUSES.INACTIVE,
    PERFORMER_STATUSES.PENDING
  ])
  @IsOptional()
  status = PERFORMER_STATUSES.ACTIVE;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  age: Date;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phoneCode?: string; // international code prefix

  @ApiProperty()
  @IsString()
  @IsOptional()
  avatarId?: ObjectId;

  @ApiProperty()
  @IsString()
  @IsOptional()
  idVerificationId?: ObjectId;

  @ApiProperty()
  @IsString()
  @IsOptional()
  documentVerificationId?: ObjectId;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsIn(GENDERS)
  gender?: string;
}
