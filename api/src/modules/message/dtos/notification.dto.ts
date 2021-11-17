import { ObjectId } from 'mongodb';
import { pick } from 'lodash';

export class NotificationDto {
  type: string;
  text: string;
  performerName: string;
  userName: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data?: Partial<NotificationDto>) {
    Object.assign(this, pick(data, [
        'type', 'text', 'performerName', 'userName', 'amount', 'createdAt', 'updatedAt'
    ]));
  }
}
