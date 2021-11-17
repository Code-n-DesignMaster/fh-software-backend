import { Module, forwardRef } from '@nestjs/common';
import { MongoDBModule } from 'src/kernel';
import { AuthModule } from '../auth/auth.module';
import { fileProviders } from './providers';
import { FileService, VideoService } from './services';
import { ImageService } from './services/image.service';

@Module({
  imports: [MongoDBModule, forwardRef(() => AuthModule)],
  providers: [...fileProviders, FileService, ImageService, VideoService],
  controllers: [],
  exports: [...fileProviders, FileService, ImageService, VideoService]
})
export class FileModule {}
