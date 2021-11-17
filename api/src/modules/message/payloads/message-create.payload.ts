import {
  IsString, IsOptional, ValidateIf, IsNotEmpty, IsNumber, IsBoolean
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MESSAGE_TYPE } from '../constants';
import { ObjectId } from 'mongodb';

export class MessageCreatePayload {
  @ApiProperty()
  @IsString()
  @IsOptional()
  type = MESSAGE_TYPE.TEXT;

  @ApiProperty()
  @ValidateIf((o) => o.type === MESSAGE_TYPE.TEXT)
 // @IsNotEmpty()
  @IsString()
  text: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  tipAmount: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  mediaId: ObjectId | String;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isTipOption: boolean;
}
