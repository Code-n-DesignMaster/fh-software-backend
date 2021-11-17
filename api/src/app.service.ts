import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  text = 'Hello world!';

  getHello(): string {
    return this.text;
  }
}
