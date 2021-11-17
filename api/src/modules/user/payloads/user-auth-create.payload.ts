import { IsString, IsOptional, IsEmail, IsArray, IsIn, IsNumber, Validate, IsNotEmpty } from 'class-validator';
import { UserCreatePayload } from './user-create.payload';
import { STATUSES, ROLE_USER, ROLE_ADMIN } from '../constants';
import { ApiProperty } from '@nestjs/swagger';
import { Username } from '../validators/username.validator';

export class UserAuthCreatePayload extends UserCreatePayload {
  @ApiProperty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  password: string;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  @IsIn([ROLE_ADMIN, ROLE_USER], { each: true })
  roles: string[];

  @ApiProperty()
  @IsString()
  @IsIn(STATUSES)
  status: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  balance: number;

  constructor(params: Partial<UserAuthCreatePayload>) {
    super(params);
    if (params) {
      this.roles = params.roles;
      this.password = params.password;
      this.balance = params.balance;
    }
  }
}
