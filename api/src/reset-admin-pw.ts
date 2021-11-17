/* eslint-disable import/first */
// global config for temmplates dir

require('dotenv').config();

process.env.TEMPLATE_DIR = `${__dirname}/templates`;

import { ConfigModule } from 'nestjs-config';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { UpdateAdminPassword } from './scripts/update-admin-pw.script';

@Module({
  imports: [
    ConfigModule.resolveRootPath(__dirname).load('config/**/!(*.d).{ts,js}'),
    AuthModule,
    UserModule
  ],
  providers: [UpdateAdminPassword]
})
export class ResetAdminPwScriptModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ResetAdminPwScriptModule);

  const pw = app.get(UpdateAdminPassword);
  await pw.up();

  await app.close();
  process.exit();
}

export default ResetAdminPwScriptModule;

bootstrap();
