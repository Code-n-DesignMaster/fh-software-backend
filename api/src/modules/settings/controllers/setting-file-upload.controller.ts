import {
  HttpCode,
  HttpStatus,
  Controller,
  Injectable,
  UseGuards,
  Post,
  UseInterceptors
} from '@nestjs/common';
import { RoleGuard } from 'src/modules/auth/guards';
import { DataResponse, getConfig } from 'src/kernel';
import { FileUploadInterceptor, FileUploaded, FileDto } from 'src/modules/file';
import { CurrentUser, Roles } from 'src/modules/auth';
import { UserDto } from '../../user/dtos';

@Injectable()
@Controller('admin/settings/files')
export class SettingFileUploadController {
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    FileUploadInterceptor('setting', 'file', {
      destination: getConfig('file').settingDir
    })
  )
  async uploadFile(
    @CurrentUser() user: UserDto,
    @FileUploaded() file: FileDto
  ): Promise<any> {
    return DataResponse.ok({
      ...file,
      url: file.getUrl()
    });
  }
}
