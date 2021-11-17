import {
  HttpCode,
  HttpStatus,
  Controller,
  Get,
  Injectable,
  UseGuards
} from '@nestjs/common';
import { StatisticService } from '../services';
import { DataResponse } from 'src/kernel';
import { RoleGuard } from 'src/modules/auth/guards';
import { Roles } from 'src/modules/auth';

@Injectable()
@Controller('statistics')
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) {}

  @Get('/admin')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async list() {
    const stats = await this.statisticService.stats();
    return DataResponse.ok(stats);
  }
}
