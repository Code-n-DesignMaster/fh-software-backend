import { HttpException } from '@nestjs/common';
import { CANNOT_AUTHENTICATE } from '../constants';

export class AuthErrorException extends HttpException {
  constructor() {
    super(CANNOT_AUTHENTICATE, 400);
  }
}
