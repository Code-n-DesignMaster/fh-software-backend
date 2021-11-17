import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { StringHelper, EntityNotFoundException } from 'src/kernel';
import { MailerService } from 'src/modules/mailer';
import { resolve } from 'url';
import { ConfigService } from 'nestjs-config';
import { UserService } from 'src/modules/user/services';
import { PerformerService } from 'src/modules/performer/services';
import { VERIFICATION_MODEL_PROVIDER } from '../providers/auth.provider';
import { VerificationModel } from '../models';
import { AccountNotFoundxception } from '../exceptions';

@Injectable()
export class VerificationService {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(VERIFICATION_MODEL_PROVIDER)
    private readonly verificationModel: Model<VerificationModel>,
    private readonly mailService: MailerService,
    private readonly config: ConfigService
  ) {}

  async sendPerformerActiveEmail(id: string): Promise<void> {
    const performer = await this.performerService.findById(id);
    if (!performer) {
      // dont show error, avoid email fetching
      throw new AccountNotFoundxception();
    }
    
    let firstName = performer.firstName;
    
    await this.mailService.send({
      to: performer.email,
      subject: 'Your account has been activated!',
      data: {
        firstName
      },
      template: 'performer-active'
    });
  }

  async sendPerformerConfirmEmail(token: string): Promise<void> {
    const verification = await this.verificationModel.findOne({
      token
    });
    if(verification.sourceType !== "performer"){
      return;
    }   
    const user = await this.performerService.findByEmail(verification.value);
    if (!user) {
      // dont show error, avoid email fetching

      throw new AccountNotFoundxception();
    }
    
    let firstName = user.firstName;
    await this.mailService.send({
      to: verification.value,
      subject: 'Thanks for verifying your email!',
      data: {
        firstName
      },
      template: 'performer-verified'
    });
  }

  async sendVerificationEmail(sourceId: string | ObjectId, email: string, sourceType: string): Promise<void> {
    let verification = await this.verificationModel.findOne({
      sourceId,
      value: email
    });
    if (!verification) {
      // eslint-disable-next-line new-cap
      verification = new this.verificationModel();
    }
    const token = StringHelper.randomString(15);
    verification.set('sourceId', sourceId);
    verification.set('sourceType', sourceType);
    verification.set('value', email);
    verification.set('token', token);
    await verification.save();
    const verificationLink = resolve(
      this.config.get('app.baseUrl'),
      `auth/email-verification?token=${token}`
    );
    let user = null;
    if (sourceType === 'user') {
      user = await this.userService.findByEmail(email);
    }
    if (sourceType === 'performer') {
      user = await this.performerService.findByEmail(email);
    }
    if (!user) {
      // dont show error, avoid email fetching

      throw new AccountNotFoundxception();
    }
    let firstName = user.firstName;
    await this.mailService.send({
      to: email,
      subject: 'Verify your email address',
      data: {
        verificationLink,
        firstName
      },
      template: 'email-verification'
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const verification = await this.verificationModel.findOne({
      token
    });
    if(!verification) {
      throw new EntityNotFoundException();
    }
    verification.verified = true;
    await verification.save();
    verification.sourceType === 'user' && (
      await this.userService.updateVerificationStatus(verification.sourceId)
    );
    verification.sourceType === 'performer' && (
      await this.performerService.updateVerificationStatus(verification.sourceId)
    );
  }

  getEmailVerifiedMessage(): string {
    return 'Thank you. Your email has been verified. You can close and login to system now';
  }
}
