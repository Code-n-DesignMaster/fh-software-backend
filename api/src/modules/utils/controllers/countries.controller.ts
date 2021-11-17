import {
  HttpCode,
  HttpStatus,
  Controller,
  Get,
  Injectable
} from '@nestjs/common';
import { CountryService } from '../services/country.service';
import { DataResponse } from 'src/kernel';

@Injectable()
@Controller('countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Get('list')
  @HttpCode(HttpStatus.OK)
  list() {
    return DataResponse.ok(this.countryService.getList());
  }
}
