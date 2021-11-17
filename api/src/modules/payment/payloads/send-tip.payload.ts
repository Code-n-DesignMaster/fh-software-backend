import { IsOptional, IsString, IsNumber } from 'class-validator';

export class SendTipPayload {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  note: string;

  @IsOptional()
  @IsString()
  paymentToken: string;
}
