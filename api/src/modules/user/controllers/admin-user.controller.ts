import {
  HttpCode,
  HttpStatus,
  Controller,
  Get,
  Injectable,
  UseGuards,
  Body,
  Put,
  Query,
  ValidationPipe,
  UsePipes,
  Param,
  Post,
  Delete
} from '@nestjs/common';
import { RoleGuard } from 'src/modules/auth/guards';
import { Roles } from 'src/modules/auth/decorators';
import { PageableData, PerformerPageableAggregateData } from 'src/kernel/common';
import { DataResponse } from 'src/kernel';
import { AuthService } from 'src/modules/auth';
import {
  UserSearchRequestPayload,
  UserAuthCreatePayload,
  UserCreatePayload,
  UserAuthUpdatePayload
} from '../payloads';

import { UserDto, IUserResponse } from '../dtos';
import { UserService, UserSearchService } from '../services';

@Injectable()
@Controller('admin/users')
export class AdminUserController {
  constructor(
    private readonly userService: UserService,
    private readonly userSearchService: UserSearchService,
    private readonly authService: AuthService
  ) {}

  @Get('/search')
  @Roles('admin', 'subadmin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async search(
    @Query() req: UserSearchRequestPayload
  ): Promise<DataResponse<PerformerPageableAggregateData<IUserResponse>>> {
    return DataResponse.ok(await this.userSearchService.search(req));
  }

  @Post('/')
  @Roles('admin', 'subadmin')
  @UseGuards(RoleGuard)
  async createUser(
    @Body() payload: UserAuthCreatePayload
  ): Promise<DataResponse<IUserResponse>> {
   try{
    await this.authService.checkUsername(payload.username);
    await this.authService.checkEmail(payload.email);  
    const user = await this.userService.create(new UserCreatePayload(payload), {
      roles: payload.roles
    });
    if (payload.password) {
      // generate auth if have pw, otherwise will create random and send to user email?
      await Promise.all([
        this.authService.create({
          type: 'email',
          value: payload.password,
          source: 'user',
          key: payload.email,
          sourceId: user._id
        }),
        this.authService.create({
          type: 'username',
          value: payload.password,
          source: 'user',
          key: payload.username,
          sourceId: user._id
        })
      ]);
    }

    return DataResponse.ok(new UserDto(user).toResponse(true));
   }
   catch(e){
     throw e;
   }
  }

  @Put('/:id')
  @Roles('admin')
  @UseGuards(RoleGuard)
  async updateUser(
    @Body() payload: UserAuthUpdatePayload,
    @Param('id') userId: string
  ): Promise<DataResponse<any>> {
    try {
      const updateSelf = await this.authService.isUpdateUserSelf(payload.username, payload.email);
      if (!updateSelf) {
        const user = await this.userService.findById(userId);
        if (user.username !== payload.username) {
          await this.authService.checkUsername(payload.username);
        }
        if(user.email !== payload.email){
        await this.authService.checkEmail(payload.email);
        }
      }
      await this.userService.adminUpdate(userId, payload);

      const user = await this.userService.findById(userId);
      return DataResponse.ok(new UserDto(user).toResponse(true));
    } catch (e) {
      throw e;
    }
  }

  @Get('/:id/view')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async getDetails(
    @Param('id') id: string
  ): Promise<DataResponse<IUserResponse>> {
    const user = await this.userService.findById(id);
    // TODO - check roles or other to response info
    return DataResponse.ok(new UserDto(user).toResponse(true));
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async delete(@Param('id') id: string) {
    const details = await this.userService.delete(id);
    return DataResponse.ok(details);
  }
}
