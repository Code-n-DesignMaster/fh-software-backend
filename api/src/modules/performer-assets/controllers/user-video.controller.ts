import {
  Controller,
  Injectable,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  UsePipes,
  Request
} from '@nestjs/common';
import { DataResponse, ForbiddenException } from 'src/kernel';
import { CurrentUser } from 'src/modules/auth';
import { UserDto } from 'src/modules/user/dtos';
import { LoadUser } from 'src/modules/auth/guards';
import { VideoService } from '../services/video.service';
import { VideoSearchRequest } from '../payloads';
import { VideoSearchService } from '../services/video-search.service';
import { AuthService } from '../../auth/services';

@Injectable()
@Controller('user/performer-assets/videos')
export class UserVideosController {
  constructor(
    private readonly videoService: VideoService,
    private readonly videoSearchService: VideoSearchService,
    private readonly authService: AuthService
  ) { }

  @Get('/search')
  @HttpCode(HttpStatus.OK)
  async search(@Query() req: VideoSearchRequest) {
    const resp = await this.videoSearchService.userSearch(req);
    return DataResponse.ok(resp);
  }

  @Get('/auth/check')
  @HttpCode(HttpStatus.OK)
  async checkAuth(
    @Request() req: any
  ) {
    console.log('videos/auth/check token=', req.query.token);

    if (!req.query.token) throw new ForbiddenException();
    const user = await this.authService.getSourceFromJWT(req.query.token);
    console.log('videos/auth/check user=', user);
    if (!user) {
      console.log('videos/auth/check user not found');
      throw new ForbiddenException();
    }
    const valid = await this.videoService.checkAuth(req, user);
    console.log('videos/auth/check valid=', valid);
    return DataResponse.ok(valid);
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoadUser)
  @UsePipes(new ValidationPipe({ transform: true }))
  async details(
    @Param('id') id: string,
    @CurrentUser() user: UserDto,
    @Request() req: any
  ) {
    const auth = req.authUser && { _id: req.authUser.authId, source: req.authUser.source, sourceId: req.authUser.sourceId };
    const jwToken = req.authUser && this.authService.generateJWT(auth, { expiresIn: 4 * 60 * 60 });
    const details = await this.videoService.userGetDetails(id, user, jwToken);
    return DataResponse.ok(details);
  }

  @Post('/:id/inc-view')
  @HttpCode(HttpStatus.OK)
  async view(
    @Param('id') id: string
  ) {
    const details = await this.videoService.increaseView(id);
    return DataResponse.ok(details);
  }
}
