import {
  IsString, IsOptional, IsIn, IsNotEmpty
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VideoCreatePayload {
  @ApiProperty()
  @IsOptional()
  title: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  tagline: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status: string;

  @ApiProperty()
  @IsOptional()
  isSaleVideo: boolean;

  @ApiProperty()
  @IsOptional()
  isPrivateChat: boolean;

  @ApiProperty()
  @IsOptional()
  isSchedule: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  scheduledAt: string;

  @ApiProperty()
  @IsOptional()
  tags: string[];

  @ApiProperty()
  @IsOptional()
  price: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  performerId: string;

  @ApiProperty()
  @IsOptional()
  participantIds: string[];
}
