import { Injectable, Inject, forwardRef } from '@nestjs/common';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { UserDto } from 'src/modules/user/dtos';
import { PerformerDto } from 'src/modules/performer/dtos';
import { UserService } from 'src/modules/user/services';
import { PerformerService } from 'src/modules/performer/services';
import { StringHelper, EntityNotFoundException } from 'src/kernel';
import { MailerService } from 'src/modules/mailer';
import { ConfigService } from 'nestjs-config';
import { resolve } from 'url';
import { AuthErrorException } from '../exceptions';
import { AUTH_MODEL_PROVIDER, FORGOT_MODEL_PROVIDER } from '../providers/auth.provider';
import { AuthModel, ForgotModel } from '../models';
import { AuthCreateDto, AuthUpdateDto } from '../dtos';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(AUTH_MODEL_PROVIDER)
    private readonly authModel: Model<AuthModel>,
    @Inject(FORGOT_MODEL_PROVIDER)
    private readonly forgotModel: Model<ForgotModel>,
    private readonly mailService: MailerService,
    private readonly config: ConfigService
  ) { }

  /**
   * generate password salt
   * @param byteSize integer
   */
  public generateSalt(byteSize = 16): string {
    return crypto.randomBytes(byteSize).toString('base64');
  }

  public encryptPassword(pw: string, salt: string): string {
    const defaultIterations = 10000;
    const defaultKeyLength = 64;

    return crypto
      .pbkdf2Sync(pw, salt, defaultIterations, defaultKeyLength, 'sha1')
      .toString('base64');
  }

  public async create(data: AuthCreateDto): Promise<AuthModel> {
    const salt = this.generateSalt();
    let newVal = data.value;
    if (['email', 'username'].includes(data.type) && newVal) {
      newVal = this.encryptPassword(newVal, salt);
    }

    // avoid admin update
    // TODO - should listen via user event?
    let auth = await this.authModel.findOne({
      type: data.type,
      source: data.source,
      sourceId: data.sourceId
    });
    if (!auth) {
      // eslint-disable-next-line new-cap
      auth = new this.authModel({
        type: data.type,
        source: data.source,
        sourceId: data.sourceId
      });
    }

    auth.salt = salt;
    auth.value = newVal;
    auth.key = data.key;

    return auth.save();
  }

  public async update(data: AuthUpdateDto) {
    const auths = await this.authModel.find({
      source: data.source,
      sourceId: data.sourceId
    });

    const user = data.source === 'user' ? await this.userService.findById(data.sourceId) : await this.performerService.findById(data.sourceId);
    if (!user) {
      throw new EntityNotFoundException();
    }
    if (!auths.length) {
      await Promise.all([
        this.create({
          source: data.source,
          sourceId: data.sourceId,
          type: 'email',
          key: user.email,
          value: data.value
        }),
        this.create({
          source: data.source,
          sourceId: user._id,
          type: 'username',
          key: user.username,
          value: data.value
        })
      ]);
      return true;
    }
    auths.forEach(async (auth) => {
      let newVal = data.value;
      const salt = this.generateSalt();
      newVal = this.encryptPassword(data.value, salt);
      // eslint-disable-next-line no-param-reassign
      auth.salt = salt;
      // eslint-disable-next-line no-param-reassign
      auth.value = newVal;
      // eslint-disable-next-line no-param-reassign
      auth.key = auth.type === 'email' ? user.email : user.username;
      await auth.save();
    });
    return true;
  }

  public async updateKey(data: AuthUpdateDto) {
    const auths = await this.authModel.find({
      source: data.source,
      sourceId: data.sourceId
    });

    const user = data.source === 'user'
      ? await this.userService.findById(data.sourceId)
      : await this.performerService.findById(data.sourceId);
    if (!user) {
      throw new EntityNotFoundException();
    }

    await Promise.all(auths.map((auth) => {
      // eslint-disable-next-line no-param-reassign
      auth.key = auth.type === 'email' ? user.email : user.username;
      return auth.save();
    }));
    return true;
  }

  public async findBySource(options: {
    source: string;
    sourceId?: ObjectId;
    type: string;
    key?: string;
  }): Promise<AuthModel | null> {
    return this.authModel.findOne(options);
  }

  public verifyPassword(pw: string, auth: AuthModel): boolean {
    return this.encryptPassword(pw, auth.salt) === auth.value;
  }

  public generateJWT(auth: any, options: any = {}): string {
    const newOptions = {
      // 7d, in miliseconds
      expiresIn: 60 * 60 * 24 * 7,
      ...options || {}
    };
    return jwt.sign(
      {
        authId: auth._id,
        source: auth.source,
        sourceId: auth.sourceId
      },
      process.env.TOKEN_SECRET,
      {
        expiresIn: newOptions.expiresIn
      }
    );
  }

  public verifyJWT(token: string) {
    try {
      return jwt.verify(token, process.env.TOKEN_SECRET);
    } catch (e) {
      return false;
    }
  }

  public async getSourceFromJWT(jwtToken: string): Promise<any> {
    // TODO - check and move to user service?
    const decodded = this.verifyJWT(jwtToken);
    if (!decodded) {
      throw new AuthErrorException();
    }

    // TODO - detect source and get data?
    // TODO - should cache here?
    if (decodded.source === 'user') {
      const user = await this.userService.findById(decodded.sourceId);

      // TODO - check activated status here
      return new UserDto(user);
    }
    if (decodded.source === 'performer') {
      const user = await this.performerService.findById(decodded.sourceId);

      // TODO - check activated status here
      if (user) {
        user.isPerformer = true;
      }
      return new PerformerDto(user);
    }

    return null;
  }

  public async forgot(
    auth: AuthModel,
    source: {
      _id: ObjectId;
      email: string;
    }
  ) {
    const token = StringHelper.randomString(14);
    await this.forgotModel.create({
      token,
      source: auth.source,
      sourceId: source._id,
      authId: auth._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const forgotLink = `https://${process.env.DOMAIN}/auth/password-change/${token}`;

    await this.mailService.send({
      subject: 'Recover password',
      to: source.email,
      data: {
        forgotLink
      },
      template: 'forgot.html'
    });
    return true;
  }

  public async getForgot(token: string): Promise<ForgotModel> {
    return this.forgotModel.findOne({ token });
  }

  public async checkUsername(
    userName: string
   ) : Promise<void>{
   await this.performerService.checkUsername(userName);
   await this.userService.checkUsername(userName);
 }
 
 public async checkEmail(
   email: string
   ) : Promise<void>{
    await this.performerService.checkEmail(email);
    await this.userService.checkEmail(email);
 }

 public async isUpdatePerformerSelf(
  userName: string,
  email: string
  ) : Promise<boolean>{
   let isPerformer = await this.performerService.isUpdateSelf(userName, email);
   if(isPerformer){
    return Promise.resolve(true);
   }else{
    return Promise.resolve(false);
   }
  }

  public async isUpdateUserSelf(
    userName: string,
    email: string
    ) : Promise<boolean>{
     let isUser = await this.userService.isUpdateSelf(userName, email);
     if(isUser){
      return Promise.resolve(true);
     }else{
      return Promise.resolve(false);
     }
    }
}
