import {
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Controller,
  Get,
  Res,
  Query,
  HttpException
} from '@nestjs/common';
import { UserService } from 'src/modules/user/services';
import { DataResponse } from 'src/kernel';
import { UserCreatePayload } from 'src/modules/user/payloads';
import { SettingService } from 'src/modules/settings';
import { STATUS_PENDING_EMAIL_CONFIRMATION, STATUS_ACTIVE, ROLE_USER } from 'src/modules/user/constants';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Response, query } from 'express';
import { AuthCreateDto } from '../dtos';
import { UserRegisterPayload } from '../payloads';
import { VerificationService, AuthService } from '../services';
import { PerformerService } from 'src/modules/performer/services';
import { AccountNotFoundxception } from '../exceptions';
import Mailchimp = require('mailchimp-api-v3');

@Controller('auth')
export class RegisterController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly verificationService: VerificationService,
    private readonly performerService: PerformerService
  ) {}

  @Post('users/register')
  @HttpCode(HttpStatus.OK)
  async userRegister(
    @Body() req: UserRegisterPayload
  ): Promise<DataResponse<{ message: string }>> {
    try {
      const requireEmailVerification = SettingService.getValueByKey(
        'requireEmailVerification'
      );
    const userPayload = new UserCreatePayload(req);
    await this.userService.checkEmail(userPayload.email);
    await this.performerService.checkEmail(userPayload.email);       
    await this.userService.checkUsername(userPayload.username);
    await this.performerService.checkUsername(userPayload.username);
    const user = await this.userService.create(userPayload, {
      status: requireEmailVerification
        ? STATUS_PENDING_EMAIL_CONFIRMATION
        : STATUS_ACTIVE,
      roles: ROLE_USER
    });

    await Promise.all([
      this.authService.create(new AuthCreateDto({
        source: 'user',
        sourceId: user._id,
        type: 'email',
        value: req.password,
        key: req.email
      })),
      req.username && this.authService.create(new AuthCreateDto({
        source: 'user',
        sourceId: user._id,
        type: 'username',
        value: req.password,
        key: req.username
      }))
    ]);
    // if require for email verification, we will send verification email
    requireEmailVerification
      && (await this.verificationService.sendVerificationEmail(
        user._id,
        user.email,
        'user'
      ));
      
    try {
      var mailchimp = new Mailchimp(process.env.MAILCHIMP_API_KEY);

      let res = await mailchimp.post('/lists/' + process.env.MAILCHIMP_LIST_ID + '/members', {
          email_address : user.email,
          full_name: user.name,
          merge_fields: {FNAME: user.firstName, LNAME: user.lastName},
          status : 'subscribed'
      });
    }
    catch (err){
        console.log('Mailchimp error:', err);
    }

    return DataResponse.ok({
      message: requireEmailVerification ? 'We have sent an email to verify your email, please check your inbox/spam.' : 'Your account is ready. Sign in to explore HoneyDrip'
    });
   }
   catch(e){
      throw e;
   }
  }

  @Post('users/send-email')
  @HttpCode(HttpStatus.OK)
  async sendEmail(
    @Query('sourceId') sourceId: string,
    @Query('email') email: string,
    @Query('sourceType') sourceType: string
  ): Promise<DataResponse<{ message: string }>> {
    try {
      if (!sourceId && !email && !sourceType) {
        throw new HttpException({type:'MISS_PARAMETER', message: 'This is a bad request.'}, 400);
      }
      const requireEmailVerification = SettingService.getValueByKey(
        'requireEmailVerification'
      );
      if (sourceType === 'user') {
        const user = await this.userService.findByEmail(email);
        if (!user) {
          throw new AccountNotFoundxception();
        }    
        if(requireEmailVerification && user.verifiedEmail)
        {
          throw new HttpException({type:'VERIFIED', message: 'The account has been verified.'}, 400);
        }
      }
      else if (sourceType === 'performer') {
        const performer = await this.performerService.findByEmail(email);
        if (!performer) {
          throw new AccountNotFoundxception();
        }
        if (requireEmailVerification && performer.verifiedEmail)
        {
          throw new HttpException({type:'VERIFIED', message: 'The account has been verified.'}, 400);
        }
      }
      else{
        throw new AccountNotFoundxception();
      }

      requireEmailVerification
        && (await this.verificationService.sendVerificationEmail(sourceId, email, sourceType));

      return DataResponse.ok({
        message: requireEmailVerification ? 'We have sent an email to verify your email, please check your inbox/spam.' : 'Your email has been verified successfully.'
      });
    }
    catch (e) {
      throw e;
    }
  }

  @Get('email-verification')
  public async verifyEmail(
    @Res() res: Response,
    @Query('token') token: string
  ) {
    if (!token) {
      return res.render('404.html');
    }
    await this.verificationService.verifyEmail(token);
    if (process.env.EMAIL_VERIFIED_SUCCESS_URL) {
      await this.verificationService.sendPerformerConfirmEmail(token);
      return res.redirect(process.env.EMAIL_VERIFIED_SUCCESS_URL);
    }
    return this.verificationService.getEmailVerifiedMessage();
    // return res.redirect(process.env.USER_URL);
  }
}
