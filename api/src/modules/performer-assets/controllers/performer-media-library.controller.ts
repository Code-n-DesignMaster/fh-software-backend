import { Injectable, Controller, Get, HttpCode, UseGuards, UsePipes, HttpStatus, ValidationPipe, Query, Post, UseInterceptors, Param , Request} from "@nestjs/common";
import { Roles, CurrentUser } from "src/modules/auth";
import { RoleGuard, AuthGuard } from "src/modules/auth/guards";
import { UserDto } from "src/modules/user/dtos";
import { DataResponse, PageableData, getConfig } from "src/kernel";
import { MediaSearchRequest } from "../payloads/media-search.request";
import { GalleryService,  VideoSearchService } from "../services";
import { MultiFileUploadInterceptor, FilesUploaded } from "src/modules/file";
import { PerformerMediaLibraryService } from "../services/media-library.service";


@Injectable()
@Controller('performer/performer-assets/media-library')
export class PerformerMediaLibraryController {
    constructor(private readonly galleryService: GalleryService,
        private readonly videoSearchService: VideoSearchService,
        private readonly performerMediaLibraryService: PerformerMediaLibraryService
        ) {}



    @Get('/search')
    @HttpCode(HttpStatus.OK)
    @Roles('performer')
    @UseGuards(RoleGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    async searchMedias(
      @Query() req: MediaSearchRequest,
      @CurrentUser() user: UserDto,
      @Request() request: any
      ): Promise<any> {
      let resp = {} as PageableData<any>;
      let respGallery = await this.galleryService.performerSearch(req, user, request.jwToken);
      let respVideo = await this.videoSearchService.performerSearch(req, user);
      let respLocalMedia = await this.performerMediaLibraryService.performerSearch(req, user);

      resp.data = respGallery.data.concat(...respVideo.data).concat(...respLocalMedia.data);
      resp.total = respGallery.total + respVideo.total + respLocalMedia.total;
      return DataResponse.ok(resp);
    }



    @Post('/:id/private')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    @UseInterceptors(
      // TODO - check and support multiple files!!!
      MultiFileUploadInterceptor([
        {
          type: 'media-import',
          fieldName: 'media-import',
          options: {
            destination: getConfig('file').imageDir,
            replaceWithoutExif: true
          }
        }
      ])
    )
    async createPrivateMedia(
      @FilesUploaded() files: Record<string, any>,
      //@Body() payload: PrivateMessageCreatePayload,
      @Param('id') performerId: string,
      //@Request() req: any
    ): Promise<DataResponse<any>> {
      const media = await this.performerMediaLibraryService.importPrivateMedia(files['media-import'], performerId);
      
      return DataResponse.ok(media);
    }
}