import { IsString, IsNotEmpty, IsArray, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MessageCreatePayload } from './message-create.payload';
import { MESSAGE_PICKLIST_OPTION } from '../constants';
import { RecepientPayload } from '.';

export class PrivateMessageCreatePayload extends MessageCreatePayload {
  // @ApiProperty()
  // @IsArray()
  // @IsNotEmpty()
  // recipientId: ObjectId[] | string[];

  // @ApiProperty()
  // @IsArray()
  // @IsNotEmpty()
  // recipientType: string[];

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  recepients: RecepientPayload[];

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsIn([MESSAGE_PICKLIST_OPTION.MUTIPLE_INDIVIDUAL, MESSAGE_PICKLIST_OPTION.SUBSCRIBED_ALL, MESSAGE_PICKLIST_OPTION.SUBSCRIBED_FREE, MESSAGE_PICKLIST_OPTION.SUBSCRIBED_PAID], { each: true })
  pickListOption: string
}
