import { IsString, IsNotEmpty, IsArray, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MessageCreatePayload } from './message-create.payload';
import { ObjectId } from 'mongodb';
import { isString } from 'util';
import { MESSAGE_PICKLIST_OPTION } from '../constants';
import { RecepientPayload } from '.';
import { FilePayload } from './file.payload';

export class PrivateMediaMessageCreatePayload extends MessageCreatePayload {
  // @ApiProperty()
  // @IsArray()
  // @IsNotEmpty()
  // recipientId: ObjectId[] | string[];

  // @ApiProperty()
  // @IsArray()
  // @IsNotEmpty()
  // recipientType: string[];
  @ApiProperty()
  @IsNotEmpty()
  file: FilePayload;

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  recepients: RecepientPayload[];

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsIn([MESSAGE_PICKLIST_OPTION.MUTIPLE_INDIVIDUAL, MESSAGE_PICKLIST_OPTION.SUBSCRIBED_ALL, MESSAGE_PICKLIST_OPTION.SUBSCRIBED_FREE, MESSAGE_PICKLIST_OPTION.SUBSCRIBED_PAID], { each: true })
  pickListOption: string;
}
