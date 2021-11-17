/* eslint-disable no-console */
/* eslint-disable import/first */
// global config for temmplates dir
require('dotenv').config();

process.env.TEMPLATE_DIR = `${__dirname}/templates`;

import { ConfigModule } from 'nestjs-config';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { SettingModule } from './modules/settings/setting.module';
import { SettingMigration } from './scripts/setting-migration.script';
import { UserMigration } from './scripts/user-migration.script';
import { PerformerVideoCount } from './scripts/update-performer-video-count.script';
import { PerformerAssetsModule } from './modules/performer-assets/performer-assets.module';
import { PerformerModule } from './modules/performer/performer.module';
import { MailchimpMigration } from './scripts/mailchimp-migration.script';
import { PerformerGalleryCount } from './scripts/update-performer-gallery-count.script';

@Module({
  imports: [
    ConfigModule.resolveRootPath(__dirname).load('config/**/!(*.d).{ts,js}'),
    AuthModule,
    UserModule,
    SettingModule,
    PerformerAssetsModule,
    PerformerModule
  ],
  providers: [SettingMigration, UserMigration, PerformerVideoCount, MailchimpMigration, PerformerGalleryCount]
})
export class ScriptModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ScriptModule);

  console.log('Migrate setting');
  const settingMigration = app.get(SettingMigration);
  await settingMigration.up();

  console.log('Migrate user');
  const userMigration = app.get(UserMigration);
  await userMigration.up();

  console.log('Recalculate creator video count');
  const performerVideoCount = app.get(PerformerVideoCount);
  await performerVideoCount.up();

  // console.log('Migrate mailchimp');
  // const mailchimpMigration = app.get(MailchimpMigration);
  // await mailchimpMigration.up();
  console.log('Recalculate creator gallery count')
  const performerGalleryCount = app.get(PerformerGalleryCount);
  await performerGalleryCount.up();

  await app.close();
  process.exit();
}

export default ScriptModule;

bootstrap();
