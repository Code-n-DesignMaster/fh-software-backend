import {
  IsString, IsOptional, IsNotEmpty, MinLength
} from 'class-validator';

export class CommentCreatePayload {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  content: string;

  @IsString()
  @IsOptional()
  objectType: string;

  @IsString()
  @IsNotEmpty()
  objectId: string;
}

export class CommentEditPayload {
  @IsString()
  @MinLength(2)
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  objectType: string;
}
