import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { DataResponse } from 'src/kernel';
import { AuthGuard } from 'src/modules/auth/guards';
import { ProductService } from '../services/product.service';
import { ProductSearchService } from '../services/product-search.service';
import { ProductSearchRequest } from '../payloads';

@Injectable()
@Controller('user/performer-assets/products')
export class UserProductsController {
  constructor(
    private readonly productService: ProductService,
    private readonly productSearchService: ProductSearchService
  ) {}

  @Get('/search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Query() req: ProductSearchRequest
  ) {
    const resp = await this.productSearchService.userSearch(req);
    const data = resp.data.map((d) => d.toPublic());
    return DataResponse.ok({
      total: resp.total,
      data
    });
  }

  @Get('/:id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async details(@Param('id') id: string) {
    const details = await this.productService.getDetails(id);
    // TODO - filter here
    return DataResponse.ok(details.toPublic());
  }
}
