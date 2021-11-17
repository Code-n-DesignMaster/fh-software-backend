import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class BlockCountriesSettingPayload {
  @IsArray()
  @IsOptional()
  countries: string[];
}
