import {
  IsString, IsNotEmpty
} from 'class-validator';

export class ContactPayload {
  @IsString()
  @IsNotEmpty()
  name: any;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
