import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  UseGuards,
  Body,
  Put,
  Param,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import { SettingService } from '../services';
import { DataResponse, PageableData } from 'src/kernel';
import { SettingDto } from '../dtos';
import { RoleGuard } from '../../auth/guards';
import { Roles, SystemAccessService } from '../../auth';
import { SettingUpdatePayload } from '../payloads';
import { SystemAccessModel } from 'src/modules/auth/models/system.access.model';
import { SystemAccessPayload } from 'src/modules/auth/payloads/system.access.payload';

@Injectable()
@Controller('admin/settings')
export class AdminSettingController {
  constructor(private readonly settingService: SettingService,
    private readonly systemAccessService: SystemAccessService) {}

  @Get('')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async getAdminSettings(
    @Query('group') group: string
  ): Promise<DataResponse<SettingDto[]>> {
    const settings = await this.settingService.getEditableSettings(group);
    return DataResponse.ok(settings);
  }

  @Put('/:key')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async update(
    @Param('key') key: string,
    @Body() value: SettingUpdatePayload
  ): Promise<DataResponse<SettingDto>> {
    const data = await this.settingService.update(key, value);
    return DataResponse.ok(data);
  }

  @Get('/search')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async adminSearch(
    @Query() req: SystemAccessPayload
  ): Promise<DataResponse<PageableData<SystemAccessModel>>> {
    const post = await this.systemAccessService.search(req);
    return DataResponse.ok(post);
  }
}
