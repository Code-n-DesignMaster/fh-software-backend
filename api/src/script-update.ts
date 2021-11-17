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
import { PerformerAssetsModule } from './modules/performer-assets/performer-assets.module';
import { PerformerModule } from './modules/performer/performer.module';
import { PerformerPhotoOfGalleryCount } from './scripts/update-performer-photo-of-gallery-count.script';

@Module({
  imports: [
    ConfigModule.resolveRootPath(__dirname).load('config/**/!(*.d).{ts,js}'),
    AuthModule,
    UserModule,
    SettingModule,
    PerformerAssetsModule,
    PerformerModule
  ],
  providers: [
    SettingMigration,
    PerformerPhotoOfGalleryCount
  ]
})
export class ScriptModule {}

async function bootstrap() {

  const app = await NestFactory.createApplicationContext(ScriptModule);

  switch(process.env.UPDATE_SECTION) {
    case 'PHOTO_OF_GALLERY':
      console.log('Recalulate photo of gallery count')
      const performerPhotoOfGalleryCount = app.get(PerformerPhotoOfGalleryCount);
      await performerPhotoOfGalleryCount.up();
      break;
  }

  await app.close();
  process.exit();
}

export default ScriptModule;

bootstrap();
