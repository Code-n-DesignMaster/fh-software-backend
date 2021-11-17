import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { SearchRequest } from 'src/kernel';
import { Optional } from '@nestjs/common';

export class SystemAccessPayload extends SearchRequest {
  @ApiProperty()
  @IsString()
  @IsOptional()
  account: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  ip: string;
 
  // @ApiProperty()
  // @IsString()
  // @IsOptional()
  // q: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  fromDate: string | Date;

  @ApiProperty()
  @IsString()
  @IsOptional()
  toDate: string | Date;
}
