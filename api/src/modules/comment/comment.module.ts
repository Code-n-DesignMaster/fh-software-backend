import { Module, forwardRef } from '@nestjs/common';
import { MongoDBModule } from 'src/kernel';
import { CommentController } from './controllers/comment.controller';
import { CommentService } from './services/comment.service';
import { commentProviders } from './providers/comment.provider';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { PerformerModule } from '../performer/performer.module';
import { PerformerAssetsModule } from '../performer-assets/performer-assets.module';

@Module({
  imports: [
    MongoDBModule,
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PerformerModule),
    forwardRef(() => PerformerAssetsModule)
  ],
  providers: [
    ...commentProviders, CommentService
  ],
  controllers: [
    CommentController
  ],
  exports: []
})
export class CommentModule {}
