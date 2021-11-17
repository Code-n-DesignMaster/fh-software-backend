import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Post,
  UseGuards
} from '@nestjs/common';
import { DataResponse } from 'src/kernel';
import { MailerService } from '../services';
import { RoleGuard } from '../../auth/guards';
import { Roles } from '../../auth';

@Injectable()
@Controller('mailer')
export class MailerController {
  constructor(private readonly mailService: MailerService) {}

  @Post('/verify')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async verify(
  ): Promise<DataResponse<any>> {
    const data = await this.mailService.verify();
    return DataResponse.ok(data);
  }
}
