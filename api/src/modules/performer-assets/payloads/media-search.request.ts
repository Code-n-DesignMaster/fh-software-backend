import { SearchRequest } from "src/kernel";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";
import { ObjectId } from "mongodb";

export class MediaSearchRequest extends SearchRequest {
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
    isSaleVideo: boolean;

    @ApiProperty()
    @IsOptional()
    isSaleGallery: boolean;
  
    @ApiProperty()
    @IsOptional()
    isPrivateChat: boolean;
  
    ids?: string[] | ObjectId[];
  }