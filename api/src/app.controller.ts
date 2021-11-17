import {
  Controller, Get, HttpCode, HttpStatus, Request
} from '@nestjs/common';
import { DataResponse } from 'src/kernel';
import { BlockCountryService } from 'src/modules/user/services';
import { CountryService } from 'src/modules/utils/services';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly blockCountryService: BlockCountryService,
    private readonly countryService: CountryService
  ) { }

  @Get('/country-block/check')
  @HttpCode(HttpStatus.OK)
  async blockCountry(@Request() req: any): Promise<DataResponse<any>> {
    let ipClient = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (ipClient.substr(0, 7) === '::ffff:') {
      ipClient = ipClient.substr(7);
    }
    const whiteListIps = ['127.0.0.1', '0.0.0.1'];
    if (whiteListIps.indexOf(ipClient) === -1) {
      try {
        const userCountry = await this.countryService.findCountryByIP(ipClient) as any;
        if (userCountry && userCountry.status === 'success' && userCountry.countryCode) {
          const check = await this.blockCountryService.checkCountryBlock(userCountry.countryCode);
          return DataResponse.ok(check);
        }
      } catch (e) {
        return DataResponse.ok({ blocked: false });
      }
    }
    return DataResponse.ok({ blocked: false });
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
