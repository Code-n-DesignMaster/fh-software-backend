import { IsString, IsOptional, IsNotEmpty, IsIn } from 'class-validator';
import { SUBSCRIPTION_TYPE } from '../constants';

export class FreeSubscriptionCreatePayload {
  @IsString()
  @IsNotEmpty()
  performerId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  @IsIn([
    SUBSCRIPTION_TYPE.FREE
  ])
  subscriptionType = SUBSCRIPTION_TYPE.FREE;
}


export class FreeSubscriptionDeletePayload {
  @IsString()
  @IsNotEmpty()
  performerId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  @IsIn([
    SUBSCRIPTION_TYPE.FREE
  ])
  subscriptionType = SUBSCRIPTION_TYPE.FREE;
}
