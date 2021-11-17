import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { isNumber } from 'util';

export class BankingSettingPayload {
  @IsString()
  @IsNotEmpty()
  performerId: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  SSN: string;

  @IsString()
  @IsNotEmpty()
  bankName?: string;

  @IsString()
  @IsNotEmpty()
  bankAccount?: string;

  @IsString()
  @IsOptional()
  bankRouting?: string;

  @IsString()
  @IsOptional()
  bankSwiftCode?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;
  
  @IsBoolean()
  @IsOptional()
  bankManageSwitch?: boolean;

  @IsNumber()
  @IsOptional()
  managePercentageFee?: number;

  @IsString()
  @IsOptional()
  agentBankName?: string;

  @IsString()
  @IsOptional()
  agentBankAccount?: string;

  @IsString()
  @IsOptional()
  agentBankRouting?: string;

  @IsString()
  @IsOptional()
  agentBankSwiftCode?: string;

  @IsString()
  @IsOptional()
  agentFirstName?: string;

  @IsString()
  @IsOptional()
  agentlastName?: string;

  @IsString()
  @IsOptional()
  agentSSN?: string;

  @IsString()
  @IsOptional()
  agentAddress?: string;

  @IsString()
  @IsOptional()
  agentCity?: string;

  @IsString()
  @IsOptional()
  agentState?: string;

  @IsString()
  @IsOptional()
  agentCountry?: string;
}
