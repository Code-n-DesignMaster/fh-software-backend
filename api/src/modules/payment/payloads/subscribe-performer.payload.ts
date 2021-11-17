import { IsNotEmpty, IsIn, IsOptional, IsString } from 'class-validator';

export class SubscribePerformerPayload {
  @IsNotEmpty()
  performerId: string;

  @IsNotEmpty()
  @IsIn(['monthly', 'yearly'])
  type: string;

  @IsOptional()
  @IsString()
  paymentToken: string;
}
