import {
  IsString, IsOptional, IsIn, IsNotEmpty
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VideoUpdatePayload {
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
  tags: string[];

  @ApiProperty()
  @IsOptional()
  isSchedule: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  scheduledAt: Date;

  @ApiProperty()
  @IsOptional()
  isSaleVideo: boolean;

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
