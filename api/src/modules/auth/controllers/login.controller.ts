import {
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Controller,
  HttpException,
  Request
} from '@nestjs/common';
import { UserService } from 'src/modules/user/services';
import { DataResponse } from 'src/kernel';
import { SettingService } from 'src/modules/settings';
import {
  STATUS_PENDING_EMAIL_CONFIRMATION,
  STATUS_INACTIVE,
  STATUS_DELETED
} from 'src/modules/user/constants';
import { LoginByEmailPayload, LoginByUsernamePayload } from '../payloads';
import { AuthService } from '../services';
import {
  EmailOrPasswordIncorrectException,
  EmailNotVerifiedException,
  UsernameOrPasswordIncorrectException,
  AccountInactiveException
} from '../exceptions';
import { PerformerService } from 'src/modules/performer/services';
import { PERFORMER_STATUSES } from 'src/modules/performer/constants';
import { ConfigService } from 'nestjs-config';
import { resolve } from 'url';
import { SystemAccessService } from '../services/system.access.service';

@Controller('auth')
export class LoginController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly performerService: PerformerService,
    private readonly config: ConfigService,
    private readonly systemAccessService: SystemAccessService
  ) { }

  @Post('users/login/email')
  @HttpCode(HttpStatus.OK)
  public async loginByEmail(
    @Body() req: LoginByEmailPayload,
    @Request() request: any
  ): Promise<DataResponse<{ token: string, usertype: number }>> {
    let usertype, performer, auth, link;
    const user = await this.userService.findByEmail(req.email);
    if (!user) {
      performer = await this.performerService.findByEmail(req.email);
      if (!performer) {
        throw new HttpException('Oops! This account was not found. Please check for mistypes or create a new account', 400);
      }
      else {
        usertype = 1;
        if(SettingService.getValueByKey('requireEmailVerification')){
          link = resolve(
          this.config.get('app.baseUrl'),
          `auth/users/send-email?sourceId=${performer._id}&email=${req.email}&sourceType=performer`
        );
       }
      }
    }
    else {
      usertype = 0;
      if(SettingService.getValueByKey('requireEmailVerification')){
        link = resolve(
        this.config.get('app.baseUrl'),
        `auth/users/send-email?sourceId=${user._id}&email=${req.email}&sourceType=user`
      );
     }
    }

    if (
      (SettingService.getValueByKey('requireEmailVerification') && (user && user.status === STATUS_PENDING_EMAIL_CONFIRMATION))
      || (SettingService.getValueByKey('requireEmailVerification') && (user && !user.verifiedEmail))
    ) {
      throw new EmailNotVerifiedException(link);
    }
    if (user && (user.status === STATUS_INACTIVE || user.status ===  STATUS_DELETED )) {
      throw new AccountInactiveException();
    }
    if (!usertype) {
      auth = await this.authService.findBySource({
        source: 'user',
        sourceId: user._id,
        type: 'email'
      });
    } else {
      auth = await this.authService.findBySource({
        source: 'performer',
        type: 'email',
        key: req.email.toLowerCase()
      });
    }

    if (!auth) {
      throw new HttpException('Oops! This account was not found. Please check for mistypes or create a new account', 400);
    }
    if (!this.authService.verifyPassword(req.password, auth)) {
      throw new EmailOrPasswordIncorrectException();
    }
    if (usertype) {
      performer = await this.performerService.findById(auth.sourceId);
      if (!performer) {
        throw new HttpException('Oops! This account was not found. Please check for mistypes or create a new account', 400);
      }
      if (
        (SettingService.getValueByKey('requireEmailVerification') && performer.status === PERFORMER_STATUSES.PENDING)
        || (SettingService.getValueByKey('requireEmailVerification') && !performer.verifiedEmail)
      ) {
        throw new EmailNotVerifiedException(link);
      }
      if (performer.status === PERFORMER_STATUSES.PENDING) {
        throw new HttpException({type:'EMAIL_NOT_VERIFIED', message: 'Please verify your email', link: link}, 400);
      } 
      else if (performer.status === PERFORMER_STATUSES.DELETED) {
        throw new HttpException('Please note that your account has been deleted', 400);
      }
    }
    // TODO - check for user status here

    const ip = request.header('x-forwarded-for') || request.connection.remoteAddress;
    if(usertype === 0){
     await this.systemAccessService.createSystemAcessLog(ip, req.email, user.roles.toString());
    }else {
     await this.systemAccessService.createSystemAcessLog(ip, req.email, 'model');
    }


    return DataResponse.ok({
      token: this.authService.generateJWT(auth),
      usertype: usertype
    });
  }

  @Post('users/login/username')
  @HttpCode(HttpStatus.OK)
  public async loginByUsername(
    @Body() req: LoginByUsernamePayload,
    @Request() request: any
  ): Promise<DataResponse<{ token: string, usertype: number }>> {
    let usertype, performer, auth, link;
    const user = await this.userService.findByUsername(req.username);
    if (!user) {
      performer = await this.performerService.findByUsername(req.username);
      if (!performer) {
        throw new UsernameOrPasswordIncorrectException();
      }
      else {
        usertype = 1;
        if(SettingService.getValueByKey('requireEmailVerification')){
          link = resolve(
            this.config.get('app.baseUrl'),
            `auth/users/send-email?sourceId=${performer._id}&email=${performer.email}&sourceType=performer`
          );
        }
      }
    }
    else {
      usertype = 0;
      if(SettingService.getValueByKey('requireEmailVerification')){
        link = resolve(
          this.config.get('app.baseUrl'),
          `auth/users/send-email?sourceId=${user._id}&email=${user.email}&sourceType=user`
        );
      }
    }
    if (
      (SettingService.getValueByKey('requireEmailVerification') && (user && user.status === STATUS_PENDING_EMAIL_CONFIRMATION))
      || (SettingService.getValueByKey('requireEmailVerification') && (user && !user.verifiedEmail))
    ) {
      throw new EmailNotVerifiedException(link);
    }
    if (user && (user.status === STATUS_INACTIVE || user.status ===  STATUS_DELETED)) {
      throw new AccountInactiveException();
    }
    if (!usertype) {
      auth = await this.authService.findBySource({
        source: 'user',
        sourceId: user._id,
        type: 'username'
      });
    }
    else {
      auth = await this.authService.findBySource({
        source: 'performer',
        type: 'username',
        key: req.username.toLowerCase()
      });
    }
    if (!auth) {
      throw new HttpException('Oops! This account was not found. Please check for mistypes or create a new account', 400);
    }
    if (!this.authService.verifyPassword(req.password, auth)) {
      throw new UsernameOrPasswordIncorrectException();
    }

    if (usertype) {
      performer = await this.performerService.findById(auth.sourceId);
      if (!performer) {
        throw new HttpException('Oops! This account was not found. Please check for mistypes or create a new account', 400);
      }
      if (
        (SettingService.getValueByKey('requireEmailVerification') && performer.status === PERFORMER_STATUSES.PENDING)
        || (SettingService.getValueByKey('requireEmailVerification') && !performer.verifiedEmail)
      ) {
        throw new EmailNotVerifiedException(link);
      }
      if (performer.status === PERFORMER_STATUSES.PENDING) {
        throw new HttpException({type:'EMAIL_NOT_VERIFIED', message: 'Please verify your email', link: link}, 400);
      } 
      else if (performer.status === PERFORMER_STATUSES.DELETED) {
        throw new HttpException('Please note that your account has been deleted', 400);
      }
    }
    // TODO - check for user status here
    const ip = request.header('x-forwarded-for') || request.connection.remoteAddress;
    if(usertype === 0){
     await this.systemAccessService.createSystemAcessLog(ip, req.username, user.roles.toString());
    }else{
      await this.systemAccessService.createSystemAcessLog(ip, req.username, 'model');
    }

    return DataResponse.ok({
      token: this.authService.generateJWT(auth),
      usertype: usertype
    });
  }
}
