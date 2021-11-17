import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  UseGuards,
  Query,
  Request
} from '@nestjs/common';
import { DataResponse, ForbiddenException } from 'src/kernel';
import { CurrentUser } from 'src/modules/auth';
import { UserDto } from 'src/modules/user/dtos';
import { AuthGuard } from 'src/modules/auth/guards';
import { PhotoService } from '../services/photo.service';
import { PhotoSearchService } from '../services/photo-search.service';
import { PerformerSearchService } from 'src/modules/performer/services';
import { PhotoSearchRequest } from '../payloads';
import { AuthService } from '../../auth/services';
@Injectable()
@Controller('user/performer-assets/:performerId/photos')
export class UserPhotosController {
  constructor(
    private readonly photoService: PhotoService,
    private readonly photoSearchService: PhotoSearchService,
    private readonly authService: AuthService
  ) {}
  @Get('/')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async list(
    @Param('performerId') performerId: string,
    @Query() query: PhotoSearchRequest,
    @CurrentUser() user: UserDto,
    @Request() req: any
  ) {
    // TODO - filter for subscriber
    // eslint-disable-next-line no-param-reassign
    query.performerId = performerId;
    const auth = { _id: req.authUser.authId, source: req.authUser.source, sourceId: req.authUser.sourceId }
    const jwToken =  await this.authService.generateJWT(auth, { expiresIn: 4 * 60 * 60 })
    const data = await this.photoSearchService.getModelPhotosWithGalleryCheck(query, user, jwToken);
    return DataResponse.ok(data);
  }

  @Get('/:id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async details(@Param('id') id: string, @CurrentUser() user: UserDto,   @Request() req: any) {
    // TODO - filter for subscriber
    const auth = { _id: req.authUser.authId, source: req.authUser.source, sourceId: req.authUser.sourceId }
    const jwToken =  await this.authService.generateJWT(auth, { expiresIn: 4 * 60 * 60 })
    const details = await this.photoService.details(id, user, jwToken);
    return DataResponse.ok(details);
  }

  @Get('/auth/check')
  @HttpCode(HttpStatus.OK)
  async checkAuth(
    @Request() req: any
  ) {
    if (!req.query.token) throw new ForbiddenException();
    const user = await this.authService.getSourceFromJWT(req.query.token);
    if (!user) {
      throw new ForbiddenException();
    }
    const valid = await this.photoService.checkAuth(req, user);
    return DataResponse.ok(valid);
  }

}
