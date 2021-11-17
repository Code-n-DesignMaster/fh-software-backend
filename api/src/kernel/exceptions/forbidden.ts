import { HttpStatus } from '@nestjs/common';
import { RuntimeException } from './runtime.exception';

export class ForbiddenException extends RuntimeException {
  constructor(msg: string | object = 'forbidden', error = 'FORBIDDEN') {
    super(msg, error, HttpStatus.FORBIDDEN);
  }
}
