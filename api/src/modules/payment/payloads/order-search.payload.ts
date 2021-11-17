import { IsString, IsOptional } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';
import { ApiProperty } from '@nestjs/swagger';

export class OrderSearchPayload extends SearchRequest {

  @ApiProperty()
  @IsString()
  @IsOptional()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  performerId: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  deliveryStatus: string;

  @ApiProperty()
  @IsOptional()
  fromDate: Date;

  @ApiProperty()
  @IsOptional()
  toDate: Date;
}


export class OrderUpdatePayload extends SearchRequest {

  @ApiProperty()
  @IsString()
  @IsOptional()
  deliveryStatus: string;

  @ApiProperty()
  @IsOptional()
  shippingCode: string;
}