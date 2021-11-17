import {
  HttpCode,
  HttpStatus,
  Controller,
  Get,
  Injectable,
  UseGuards,
  Request,
  Body,
  Put,
  Param,
  ForbiddenException
} from '@nestjs/common';
import { UserService } from '../services';
import { AuthGuard } from 'src/modules/auth/guards';
import { UserDto, IUserResponse } from '../dtos';
import { CurrentUser } from 'src/modules/auth/decorators';
import { UserUpdatePayload } from '../payloads';
import { DataResponse } from 'src/kernel';

@Injectable()
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService
  ) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async me(@Request() req: any): Promise<DataResponse<IUserResponse>> {
    const { authUser } = req;
    const user = await this.userService.findById(authUser.sourceId);
    return DataResponse.ok(new UserDto(user).toResponse(true));
  }

  @Put()
  @UseGuards(AuthGuard)
  async updateMe(
    @CurrentUser() currentUser: UserDto,
    @Body() payload: UserUpdatePayload
  ): Promise<DataResponse<IUserResponse>> {
    await this.userService.update(currentUser._id, payload, currentUser);

    const user = await this.userService.findById(currentUser._id);
    return DataResponse.ok(new UserDto(user).toResponse(true));
  }
}
