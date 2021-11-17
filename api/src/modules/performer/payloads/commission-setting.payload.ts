import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CommissionSettingPayload {
  @IsString()
  @IsNotEmpty()
  performerId: string;

  @IsNumber()
  @IsOptional()
  monthlySubscriptionCommission: number;

  @IsNumber()
  @IsOptional()
  yearlySubscriptionCommission: number;

  @IsNumber()
  @IsOptional()
  videoSaleCommission: number;

  @IsNumber()
  @IsOptional()
  productSaleCommission: number;

  @IsNumber()
  @IsOptional()
  gallerySaleCommission: number;

  @IsNumber()
  @IsOptional()
  tipCommission: number;
}
