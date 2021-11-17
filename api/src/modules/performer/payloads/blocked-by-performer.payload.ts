import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';
export class BlockedByPerformerPayload {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  description: string;
}

export class SearchBlockedByPerformerPayload extends SearchRequest {}
