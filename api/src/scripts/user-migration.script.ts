/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UserService } from 'src/modules/user/services';
import { AuthService } from 'src/modules/auth';
import { UserCreatePayload } from 'src/modules/user/payloads';
import { AuthCreateDto } from 'src/modules/auth/dtos';

@Injectable()
export class UserMigration {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService
  ) {}

  async up() {
    const users = [
      {
        firstName: 'Admin',
        lastName: `${process.env.DOMAIN}`,
        email: `admin@${process.env.DOMAIN || 'example.com'}`,
        username: 'admin',
        roles: ['admin'],
        verifiedEmail: true,
        status: 'active'
      }
    ];

    for (const user of users) {
      let u = await this.userService.findByEmail(user.email);
      let u2 = await this.userService.findByUsername(user.username);
      if (!u && !u2) {
        u = await this.userService.create(new UserCreatePayload(user), {
          roles: ['admin']
        });
        await this.authService.create(
          new AuthCreateDto({
            type: 'email',
            source: 'user',
            sourceId: u._id,
            value: 'adminadmin',
            key: u.email
          })
        );
        console.log(`User ${user.email} has been created!`);
      } else {
        console.log(`User ${user.email} has been existed!`);
      }
    }
  }
}
