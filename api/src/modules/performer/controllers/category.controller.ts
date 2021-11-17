import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Get,
  Query,
  Param
} from '@nestjs/common';
import { CategorySearchService, CategoryService } from '../services';
import { DataResponse, PageableData } from 'src/kernel';
import { CategorySearchRequestPayload } from '../payloads';
import { PerformerCategoryDto } from '../dtos';
@Injectable()
@Controller('performer-categories')
export class CategoryController {
  constructor(
    private readonly categorySearchService: CategorySearchService,
    private readonly categoryService: CategoryService
  ) {}

  @Get('/')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getList(
    @Query() req: CategorySearchRequestPayload
  ): Promise<DataResponse<PageableData<PerformerCategoryDto>>> {
    // TODO - get public list
    const list = await this.categorySearchService.search(req);
    return DataResponse.ok(list);
  }

  @Get('/:id/view')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async details(
    @Param('id') id: string
  ) {
    const category = await this.categoryService.findByIdOrSlug(id);
    return DataResponse.ok(category);
  }
}
