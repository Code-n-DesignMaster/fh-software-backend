import {
  HttpCode,
  HttpStatus,
  Controller,
  Get,
  Injectable
} from '@nestjs/common';
import { LanguageService } from '../services/language.service';
import { DataResponse } from 'src/kernel';

@Injectable()
@Controller('languages')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Get('list')
  @HttpCode(HttpStatus.OK)
  list() {
    return DataResponse.ok(this.languageService.getList());
  }
}
