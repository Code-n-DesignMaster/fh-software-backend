import {
  Controller,
  Injectable,
  UseGuards,
  Body,
  Post,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Param,
  Get,
  Query,
  Request
} from '@nestjs/common';
import { RoleGuard } from 'src/modules/auth/guards';
import { DataResponse } from 'src/kernel';
import { CurrentUser, Roles } from 'src/modules/auth';
import { GallerySearchRequest } from '../payloads';
import { GalleryService } from '../services/gallery.service';
import { UserDto } from 'src/modules/user/dtos';
import { AuthGuard } from 'src/modules/auth/guards';
import { AuthService } from '../../auth/services';

@Injectable()
@Controller('user/performer-assets/galleries')
export class UserGalleryController {
  constructor(private readonly galleryService: GalleryService,
    private readonly authService: AuthService) {}


  @Get('/search')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async searchGallery(
    @Query() req: GallerySearchRequest
  ): Promise<any> {
    const resp = await this.galleryService.userSearch(req);
    return DataResponse.ok(resp);
  }

  @Get('/:id/view')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async view(@Param('id') id: string): Promise<any> {
    const resp = await this.galleryService.details(id);
    return DataResponse.ok(resp);
  }


  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async details(
    @Param('id') id: string,
    @CurrentUser() user: UserDto,
    @Request() req: any) {
    const auth = { _id: req.authUser.authId, source: req.authUser.source, sourceId: req.authUser.sourceId }
    const jwToken =  await this.authService.generateJWT(auth, { expiresIn: 4 * 60 * 60 })
    const details =  await this.galleryService.userGetDetails(id, user, jwToken);
    return DataResponse.ok(details);
  }

  @Post('/:id/inc-view')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async incView(
    @Param('id') id: string,
  ) {
    const details = await this.galleryService.increaseView(id);
    return DataResponse.ok(details);
  }
}
