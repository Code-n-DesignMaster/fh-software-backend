import { ObjectId } from 'mongodb';
import { pick } from 'lodash';
import { IRecipient } from '../models';
import { IUserResponse } from 'src/modules/user/dtos';

export class ConversationDto {
  _id: ObjectId;
  type: string;
  name: string;
  recipients: IRecipient[];
  lastMessage: string;
  lastSenderId: string | ObjectId;
  lastMessageCreatedAt: Date;
  meta: any;
  createdAt: Date;
  updatedAt: Date;
  recipientInfo?: IUserResponse;
  totalNotSeenMessages?: number;
  isSubscribed?: boolean;
  subsribeSwitch?: boolean;
  streamId: ObjectId;

  performerId: ObjectId;
  hasSentTip?: boolean;
  enableChat?: boolean;
  tipAmount?: number;
  isBlocked?: boolean;

  constructor(data?: Partial<ConversationDto>) {
    Object.assign(
      this,
      pick(data, [
        '_id',
        'type',
        'name',
        'recipients',
        'lastMessage',
        'lastSenderId',
        'lastMessageCreatedAt',
        'meta',
        'createdAt',
        'updatedAt',
        'recipientInfo',
        'totalNotSeenMessages',
        'isSubscribed',
        'subsribeSwitch',
        'streamId',
        'performerId',
        'hasSentTip',
        'enableChat',
        'tipAmount'
      ])
    );
  }
}
