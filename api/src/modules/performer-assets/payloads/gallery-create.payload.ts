import {
  IsString,
  IsOptional,
  IsIn,
  IsNotEmpty,
  IsNumber
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GalleryCreatePayload {
  @ApiProperty()
  @IsOptional()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status: string;

  @ApiProperty()
  @IsOptional()
  isSaleGallery: boolean;

  @ApiProperty()
  @IsOptional()
  isPrivateChat: boolean;

  @ApiProperty()
  @IsOptional()
  price: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  performerId: string;
}
