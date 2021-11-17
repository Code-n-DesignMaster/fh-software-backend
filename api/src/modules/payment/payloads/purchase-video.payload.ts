import { IsOptional, IsString } from 'class-validator';

export class PurchaseVideoPayload {
  @IsOptional()
  @IsString()
  couponCode: string;

  @IsOptional()
  @IsString()
  paymentToken: string;
}
