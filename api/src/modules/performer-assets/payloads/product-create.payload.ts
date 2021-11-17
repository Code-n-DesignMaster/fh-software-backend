import {
  IsString,
  IsOptional,
  IsIn,
  IsNotEmpty,
  IsNumber
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PRODUCT_STATUS, PRODUCT_TYPE } from '../constants';

export class ProductCreatePayload {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @IsIn([PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.INACTIVE])
  status: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @IsIn([PRODUCT_TYPE.DIGITAL, PRODUCT_TYPE.PHYSICAL])
  type: string;

  @ApiProperty()
  // @IsNumber()
  @IsOptional()
  price: number;

  @ApiProperty()
  // @IsNumber()
  @IsOptional()
  stock: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  performerId: string;
}
