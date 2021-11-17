import { HttpException } from '@nestjs/common';
import { EMAIL_NOT_VERIFIED } from '../constants';

export class EmailNotVerifiedException extends HttpException {
  constructor(link?: string) {
    super({type:'EMAIL_NOT_VERIFIED', message:EMAIL_NOT_VERIFIED, link: link}, 400);
  }
}
