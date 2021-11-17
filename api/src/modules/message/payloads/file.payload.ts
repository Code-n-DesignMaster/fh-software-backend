import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';

export class FilePayload {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  _id: ObjectId;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  mimeType: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  path: string;
}
