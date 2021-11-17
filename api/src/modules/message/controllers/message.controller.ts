import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Post,
  UsePipes,
  ValidationPipe,
  Body,
  ForbiddenException,
  Get,
  Query,
  Param,
  Delete,
  UseInterceptors,
  BadRequestException
} from '@nestjs/common';
import { DataResponse, getConfig } from 'src/kernel';
import { AuthGuard, RoleGuard } from 'src/modules/auth/guards';
import { MultiFileUploadInterceptor, FilesUploaded, FileDto } from 'src/modules/file';
import { CurrentUser, Roles, AuthService } from 'src/modules/auth';
import { UserDto } from 'src/modules/user/dtos';
import { MessageService, NotificationMessageService } from '../services';
import {
  MessageListRequest, NotificationMessageReadPayload,
  MessageCreatePayload, PrivateMessageCreatePayload, NotificationSystemReadPayload
} from '../payloads';
import { MessageDto } from '../dtos';

import { PrivateMediaMessageCreatePayload } from '../payloads/private-media-message-create.payload';

@Injectable()
@Controller('messages')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly notificationMessageService: NotificationMessageService,
    private readonly authService: AuthService
  ) { }

  // @Post('/private')
  // @HttpCode(HttpStatus.OK)
  // @UseGuards(AuthGuard)
  // @UseInterceptors(
  // )
  // async createPrivateMessage(
  //   @Body() payload: PrivateMessageCreatePayload,
  //   @Request() req: any
  // ): Promise<DataResponse<MessageDto>> {
  //   if (req.authUser.sourceId.toString() === payload.recipientId.toString()) {
  //     throw new ForbiddenException();
  //   }

  //   const message = await this.messageService.createPrivateMessage(
  //     {
  //       source: req.authUser.source,
  //       sourceId: req.authUser.sourceId
  //     },
  //     {
  //       source: payload.recipientType,
  //       sourceId: payload.recipientId
  //     },
  //     payload
  //   );
  //   return DataResponse.ok(message);
  // }

  @Post('/private/file')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UseInterceptors(
    // TODO - check and support multiple files!!!
    MultiFileUploadInterceptor([
      {
        type: 'message-photo',
        fieldName: 'message-photo',
        options: {
          destination: getConfig('file').imageDir,
          replaceWithoutExif: true
        }
      }
    ])
  )
  async createPrivateFileMessage(
    @FilesUploaded() files: Record<string, any>,
    @Body() payload: PrivateMessageCreatePayload,
    @Request() req: any
  ): Promise<DataResponse<MessageDto>> {
      if (req.authUser.sourceId.toString() === payload.recepients[0].recipientId.toString()) {
        throw new ForbiddenException();
      }

    const message = await this.messageService.createPrivateFileMessage(
      {
        source: req.authUser.source,
        sourceId: req.authUser.sourceId
      },
      [{
        source: payload.recepients[0].recipientType,
        sourceId: payload.recepients[0].recipientId
      }],
      files['message-photo'],
      payload
    );
    return DataResponse.ok(message);
  }

  @Post('/read-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async readAllMessage(
    @Body() payload: NotificationMessageReadPayload,
    @Request() req: any
  ): Promise<DataResponse<MessageDto>> {
    // if (req.authUser.sourceId.toString() !== payload.recipientId.toString()) {
    //   throw new ForbiddenException();
    // }
    const message = await this.notificationMessageService.recipientReadAllMessageInConversation(req.authUser.sourceId, payload.conversationId);
    return DataResponse.ok(message);
  }

  @Post('/read-all-system-message')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async readAlSystemMessage(
    @Body() payload: NotificationSystemReadPayload,
    @Request() req: any
  ): Promise<DataResponse<MessageDto>> {
    
    if (req.authUser.sourceId.toString() !== payload.recipientId.toString()) {
      throw new ForbiddenException();
    }
    
    
    const message = await this.notificationMessageService.recipientReadAllSystemMessage(payload.recipientId, payload.isPerformer);
    return DataResponse.ok(message);
  }

  @Get('/counting-not-read-messages')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async countTotalNotReadMessage(
    @CurrentUser() user: UserDto
  ): Promise<DataResponse<any>> {
    const data = await this.notificationMessageService.countTotalNotReadMessage(user);
    return DataResponse.ok(data);
  }

  @Get('/counting-not-read-system-messages')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async countTotalNotReadSystemMessage(
    @CurrentUser() user: UserDto
  ): Promise<DataResponse<any>> {
    const data = await this.notificationMessageService.countTotalNotReadSystemMessage(user);
    return DataResponse.ok(data);
  }

  @Get('/conversations/:conversationId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async loadMessages(
    @Query() req: MessageListRequest,
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: UserDto,
    @Request() request: any
  ): Promise<DataResponse<any>> {
    req.conversationId = conversationId;
    const auth = { _id: request.authUser.authId, source: request.authUser.source, sourceId: request.authUser.sourceId };
    const jwToken =  await this.authService.generateJWT(auth, { expiresIn: 4 * 60 * 60 }); //request.headers.authorization
    const data = await this.messageService.loadMessages(req, user, jwToken);//request.jwToken);
    return DataResponse.ok(data);
  }

  @Post('/private/media')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async createPrivateMediaMessage(
    @Body() payload: PrivateMediaMessageCreatePayload,
    @Request() req: any
  ): Promise<DataResponse<MessageDto>> {
    const recepients = await this.messageService.extractRecepients(req, payload.pickListOption, payload.recepients);
    const file  = new FileDto({...payload.file});
    const message = await this.messageService.createPrivateFileMessage(
      {
        source: req.authUser.source,
        sourceId: req.authUser.sourceId
      },
      recepients,
      file,
      payload
    );
    return DataResponse.ok(message);
  }


  @Post('/conversations')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createMessage(
    @Body() payload: PrivateMessageCreatePayload,
    @Request() req: any
  ): Promise<DataResponse<any>> {
    const recepients = await this.messageService.extractRecepients(req, payload.pickListOption, payload.recepients);
    const data = await this.messageService.createPrivateMessageFromConversation(
      payload,
      {
        source: req.authUser.source,
        sourceId: req.authUser.sourceId
      },
      recepients
    );
    return DataResponse.ok(data);
  }

  @Post('/stream/conversations/:conversationId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createStreamMessage(
    @Body() payload: MessageCreatePayload,
    @Param('conversationId') conversationId: string,
    @Request() req: any
  ): Promise<DataResponse<any>> {
    const data = await this.messageService.createStreamMessageFromConversation(
      conversationId,
      payload,
      {
        source: req.authUser.source,
        sourceId: req.authUser.sourceId
      }
    );
    return DataResponse.ok(data);
  }

  @Post('/stream/public/conversations/:conversationId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createPublicStreamMessage(
    @Body() payload: MessageCreatePayload,
    @Param('conversationId') conversationId: string,
    @Request() req: any,
    @CurrentUser() user: UserDto
  ): Promise<DataResponse<any>> {
    const data = await this.messageService.createPublicStreamMessageFromConversation(
      conversationId,
      payload,
      {
        source: req.authUser.source,
        sourceId: req.authUser.sourceId
      },
      user
    );
    return DataResponse.ok(data);
  }

  @Delete('/:messageId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async deletePublicMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: UserDto
  ): Promise<DataResponse<any>> {
    const data = await this.messageService.deleteMessage(
      messageId,
      user
    );
    return DataResponse.ok(data);
  }

  @Delete('/:conversationId/remove-all-message')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'performer')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async deleteAllPublicMessage(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: any
  ): Promise<DataResponse<any>> {
    const data = await this.messageService.deleteAllMessageInConversation(
      conversationId,
      user
    );
    return DataResponse.ok(data);
  }

  @Get('/conversations/public/:conversationId')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async loadPublicMessages(
    @Query() req: MessageListRequest,
    @Param('conversationId') conversationId: string
  ): Promise<DataResponse<any>> {
    req.conversationId = conversationId;
    const data = await this.messageService.loadPublicMessages(req);
    return DataResponse.ok(data);
  }
}
