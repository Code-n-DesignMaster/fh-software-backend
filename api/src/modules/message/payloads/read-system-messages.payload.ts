import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationSystemReadPayload {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  isPerformer: boolean;
}
