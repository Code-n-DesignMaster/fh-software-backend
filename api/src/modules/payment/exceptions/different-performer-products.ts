import { HttpException } from '@nestjs/common';
import { DIFFERENT_PERFORMER_PRODUCT } from '../constants';

export class DifferentPerformerException extends HttpException {
  constructor() {
    super(DIFFERENT_PERFORMER_PRODUCT, 400);
  }
}
