import { HttpException } from '@nestjs/common';

export class AccountNotFoundxception extends HttpException {
  constructor() {
    super('Account is not found', 404);
  }
}
