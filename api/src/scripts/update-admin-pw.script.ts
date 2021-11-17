import { Injectable } from '@nestjs/common';
import { UserService } from 'src/modules/user/services';
import { AuthService } from 'src/modules/auth';
import { AuthCreateDto, AuthUpdateDto } from 'src/modules/auth/dtos';
import { UserCreatePayload } from 'src/modules/user/payloads';

@Injectable()
export class UpdateAdminPassword {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService
  ) {}

  async up() {
    const users = await this.userService.find({ roles: 'admin' });

    if (!users.length) {
      const u = await this.userService.create(new UserCreatePayload({
        firstName: 'Admin',
        lastName: `${process.env.DOMAIN}`,
        email: `admin@${process.env.DOMAIN || 'example.com'}`,
        username: 'admin',
        roles: ['admin'],
        verifiedEmail: true
      } as any), {
        roles: ['admin']
      });
      // eslint-disable-next-line no-await-in-loop
      await this.authService.create(
        new AuthCreateDto({
          type: 'email',
          source: 'user',
          sourceId: u._id,
          value: 'adminadmin'
        })
      );

      return;
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const user of users) {
      // eslint-disable-next-line no-await-in-loop
      await this.authService.update(new AuthUpdateDto({
        source: 'user',
        sourceId: user._id,
        value: 'adminadmin'
      }));

      user.verifiedEmail = true;
      user.status = 'active';
      // eslint-disable-next-line no-await-in-loop
      await user.save();
    }
  }
}
