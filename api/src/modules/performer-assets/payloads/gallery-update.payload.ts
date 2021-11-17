import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsNotEmpty
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GalleryUpdatePayload {
  @ApiProperty()
  @IsNotEmpty()
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
  price: number;
}
