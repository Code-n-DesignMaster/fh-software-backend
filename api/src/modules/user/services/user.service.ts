import { Injectable, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { FileDto } from 'src/modules/file';
import { EntityNotFoundException } from 'src/kernel';
import { STATUS } from 'src/kernel/constants';
import { AUTH_MODEL_PROVIDER } from 'src/modules/auth/providers/auth.provider';
import { AuthModel } from 'src/modules/auth/models';
import { UserModel } from '../models';
import { USER_MODEL_PROVIDER } from '../providers';
import {
  UserUpdatePayload,
  UserAuthUpdatePayload,
  UserAuthCreatePayload,
  UserCreatePayload
} from '../payloads';
import { UserDto } from '../dtos';
import { STATUS_ACTIVE } from '../constants';
import { EmailHasBeenTakenException } from '../exceptions';
import { UsernameExistedException } from '../exceptions/username-existed.exception';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_MODEL_PROVIDER)
    private readonly userModel: Model<UserModel>,
    @Inject(AUTH_MODEL_PROVIDER)
    private readonly authModel: Model<AuthModel>
  ) {}

  public async isUpdateSelf(
    userName: string,
    email: string): Promise<number>{
    const count = await this.userModel.countDocuments({
      username: userName.trim(),
      email: email.trim()
    });
    return count;
  }

  public async checkUsername(
    userName: string
   ) : Promise<void>{
    try{
      const check = await this.userModel.countDocuments({
        username: userName ? userName.trim(): userName
      });
      if (check) {
        throw new UsernameExistedException();
      }
    }
    catch(e){
      console.log('This username has been taken, please choose another one', e);
      throw e;
    }
 }

  public async checkEmail(
    email: string
    ) : Promise<void>{
    try{
      const username = await this.userModel.countDocuments({
        email: email.trim()
      });
      if (username) {
        throw new EmailHasBeenTakenException();
      }
    }
    catch(e){
      console.log('Email has been taken', e);
      throw e;
    }
  }

  public async find(params: any): Promise<UserModel[]> {
    return this.userModel.find(params);
  }

  public async findByEmail(email: string): Promise<UserModel | null> {
    if (!email) {
      return null;
    }
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  public async findById(id: string | ObjectId): Promise<UserModel> {
    return this.userModel.findById(id);
  }

  public async findByUsername(username: string): Promise<UserDto> {
    const newUsername = username.toLowerCase().trim();
    const user = await this.userModel.findOne({ username: newUsername });
    return user ? new UserDto(user) : null;
  }

  public async findByIds(ids: any[]): Promise<UserDto[]> {
    const users = await this.userModel
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return users.map((u) => new UserDto(u));
  }

  public async create(
    data: UserCreatePayload | UserAuthCreatePayload,
    options = {} as any
  ): Promise<UserModel> {
    if (!data || !data.email) {
      throw new EntityNotFoundException();
    }
    const count = await this.userModel.countDocuments({
      email: data.email.toLowerCase()
    });
    if (count) {
      throw new EmailHasBeenTakenException();
    }

    const username = await this.findByUsername(data.username);
    if (username) {
      throw new UsernameExistedException();
    }

    const user = { ...data } as any;
    user.email = data.email.toLowerCase();
    user.username = data.username.trim();
    user.createdAt = new Date();
    user.updatedAt = new Date();
    user.roles = options.roles || ['user'];
    user.status = options.status || STATUS_ACTIVE;
    if (!user.name) {
      user.name = [user.firstName || '', user.lastName || ''].join(' ');
    }
    return this.userModel.create(user);
  }

  public async update(
    id: string | ObjectId,
    payload: UserUpdatePayload,
    user?: UserDto
  ) {
    const data = { ...payload };
    // TODO - check roles here
    if (user && !user.roles.includes('admin')) {
      delete data.email;
      delete data.username;
    }
    if (!data.name) {
      data.name = [data.firstName || '', data.lastName || ''].join(' ');
    }
    return this.userModel.updateOne({ _id: id }, data, { new: true });
  }

  public async updateAvatar(user: UserDto, file: FileDto) {
    await this.userModel.updateOne(
      { _id: user._id },
      {
        avatarId: file._id,
        avatarPath: file.path
      }
    );

    // resend user info?
    // TODO - check others config for other storage
    return file;
  }

  public async adminUpdate(
    id: string | ObjectId,
    payload: UserAuthUpdatePayload
  ): Promise<boolean> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new EntityNotFoundException();
    }

    const data = { ...payload };
    if (!data.name) {
      data.name = [data.firstName || '', data.lastName || ''].join(' ');
    }

    if (data.email && data.email.toLowerCase() !== user.email.toLowerCase()) {
      const emailCheck = await this.userModel.countDocuments({
        email: data.email.toLowerCase(),
        _id: {
          $ne: user._id
        }
      });
      if (emailCheck) {
        throw new EmailHasBeenTakenException();
      }
      data.email = data.email.toLowerCase();
    }

    if (data.username && data.username.trim() !== user.username.trim()) {
      const usernameCheck = await this.userModel.countDocuments({
        username: data.username.trim(),
        _id: { $ne: user._id }
      });
      if (usernameCheck) {
        throw new UsernameExistedException();
      }
      data.username = data.username.trim();
    }

    await this.userModel.updateOne({ _id: id }, data, { new: true });
    // update auth key if username or email has changed
    if (
      (data.email && data.email.toLowerCase() !== user.email.toLowerCase())
      || (data.username && data.username.trim() !== user.username.trim())
    ) {
      const auths = await this.authModel.find({
        source: 'user',
        sourceId: id
      });

      const userCheck = await this.findById(id);
      if (!userCheck) {
        throw new EntityNotFoundException();
      }
      await Promise.all(
        auths.map((auth) => {
          // eslint-disable-next-line no-param-reassign
          auth.key = auth.type === 'email' ? userCheck.email : userCheck.username;
          return auth.save();
        })
      );
    }
    return true;
  }

  public async updateVerificationStatus(
    userId: string | ObjectId
  ): Promise<any> {
    return this.userModel.updateOne(
      {
        _id: userId
      },
      { status: STATUS.ACTIVE, verifiedEmail: true },
      { new: true }
    );
  }

  public async delete(
    userId: string | ObjectId
  ): Promise<any> {
    return this.userModel.deleteOne({ _id: userId });
  }
}
