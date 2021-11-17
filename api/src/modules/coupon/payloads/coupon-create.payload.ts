import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsIn
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { COUPON_STATUS } from '../constants';
export class CouponCreatePayload {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  value: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  expiredDate: string | Date;

  @ApiProperty()
  @IsString()
  @IsIn([COUPON_STATUS.ACTIVE, COUPON_STATUS.INACTIVE])
  @IsOptional()
  status = COUPON_STATUS.ACTIVE;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  numberOfUses: number;
}
