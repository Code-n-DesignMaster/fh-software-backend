import {
  IsString,
  IsOptional,
  IsEmail,
  Validate,
  IsIn,
  IsNotEmpty,
  IsBoolean
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Username } from '../validators/username.validator';
import { GENDERS } from '../constants';

export class UserCreatePayload {
  @ApiProperty()
  @IsString()
  @IsOptional()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  lastName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  //@Validate(Username)
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsString()
  @IsIn(GENDERS)
  @IsOptional()
  gender: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  country: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  verifiedEmail: boolean;

  constructor(params: Partial<UserCreatePayload>) {
    if (params) {
      this.verifiedEmail = params.verifiedEmail;
      this.firstName = params.firstName;
      this.lastName = params.lastName;
      this.name = params.name;
      this.email = params.email;
      this.username = params.username;
      this.gender = params.gender;
      this.country = params.country;
    }
  }
}
