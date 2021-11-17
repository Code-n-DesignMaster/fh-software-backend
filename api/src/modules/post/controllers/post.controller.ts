import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Param,
  Get,
  Query
} from '@nestjs/common';
import { PostService, PostSearchService } from '../services';
import { DataResponse, PageableData } from 'src/kernel';
import { PostDto } from '../dtos';
import { PostModel } from '../models';
import { UserSearch } from '../payloads';
@Injectable()
@Controller('posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly postSearchService: PostSearchService
  ) {}

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async details(@Param('id') id: string): Promise<DataResponse<PostDto>> {
    const post = await this.postService.getPublic(id);
    return DataResponse.ok(post);
  }

  @Get('/search')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async userSearch(
    @Query() req: UserSearch
  ): Promise<DataResponse<PageableData<PostModel>>> {
    const post = await this.postSearchService.userSearch(req);
    return DataResponse.ok(post);
  }
}
