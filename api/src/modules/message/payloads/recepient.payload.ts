import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';

export class RecepientPayload {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  recipientId: ObjectId;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsIn(['user', 'performer'])
  recipientType: string;
}
