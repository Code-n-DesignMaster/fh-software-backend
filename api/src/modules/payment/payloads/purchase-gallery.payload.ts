import { IsOptional, IsString } from 'class-validator';

export class PurchaseGalleryPayload {
  @IsOptional()
  @IsString()
  couponCode: string;

  @IsOptional()
  @IsString()
  paymentToken: string;
}
