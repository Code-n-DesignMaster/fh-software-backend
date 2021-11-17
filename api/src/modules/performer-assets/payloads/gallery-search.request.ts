import { IsString, IsOptional } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';
export class GallerySearchRequest extends SearchRequest {
  @ApiProperty()
  @IsString()
  @IsOptional()
  performerId: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  userId: string | ObjectId;

  @ApiProperty()
  @IsString()
  @IsOptional()
  status: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  excludedId: string;

  @ApiProperty()
  @IsOptional()
  isSaleGallery: boolean;

  @ApiProperty()
  @IsOptional()
  isPrivateChat: boolean;

  ids?: string[] | ObjectId[];
}
