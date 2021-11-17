import { ObjectId } from 'mongodb';
import { pick } from 'lodash';
import { FileDto } from 'src/modules/file';

export interface IUserResponse {
  _id?: ObjectId;
  name?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  roles?: string[];
  avatar?: string;
  status?: string;
  gender?: string;
  balance?: number;
  country?: string;
  verifiedEmail?: boolean;
  isOnline?: boolean;
}

export class UserDto {
  _id: ObjectId;

  name?: string;

  firstName?: string;

  lastName?: string;

  email?: string;

  phone?: string;

  roles: string[] = ['user'];

  avatarId?: string | ObjectId;

  avatarPath?: string;

  status?: string;

  username?: string;

  gender?: string;

  balance?: number;

  country?: string; // iso code

  verifiedEmail?: boolean;

  isOnline?: boolean;

  subsribeSwitch?: boolean;

  createdAt?: Date;

  constructor(data?: Partial<UserDto>) {
    data
      && Object.assign(
        this,
        pick(data, [
          '_id',
          'name',
          'firstName',
          'lastName',
          'email',
          'phone',
          'roles',
          'avatarId',
          'avatarPath',
          'status',
          'username',
          'gender',
          'balance',
          'country',
          'verifiedEmail',
          'isOnline',
          'subsribeSwitch',
          'createdAt'
        ])
      );
  }

  getName() {
    return [this.firstName || '', this.lastName || ''].join(' ');
  }

  toResponse(includePrivateInfo = false, isAdmin?: boolean): IUserResponse {
    const publicInfo = {
      _id: this._id,
      name: this.getName(),
      avatar: FileDto.getPublicUrl(this.avatarPath),
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      isOnline: this.isOnline,
      subsribeSwitch: this.subsribeSwitch,
      createdAt: this.createdAt
    };

    const privateInfo = {
      phone: this.phone,
      status: this.status,
      gender: this.gender,
      balance: this.balance,
      country: this.country,
      roles: this.roles,
      verifiedEmail: this.verifiedEmail
    };

    if (isAdmin) {
      return {
        ...publicInfo,
        ...privateInfo
      };
    }

    if (!includePrivateInfo) {
      return publicInfo;
    }

    return {
      ...publicInfo,
      ...privateInfo
    };
  }
}
