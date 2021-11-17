import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';

export class ConversationCreatePayload {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  type = 'private';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsIn(['user', 'performer'])
  source: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  recipientId: ObjectId;

  @ApiProperty()
  @IsOptional()
  @IsString()
  recipientType: string;
}
