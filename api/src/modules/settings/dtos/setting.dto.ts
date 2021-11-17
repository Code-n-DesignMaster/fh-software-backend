import { ObjectId } from 'mongodb';
import { pick } from 'lodash';

export class SettingDto {
  _id: ObjectId;
  key: string;
  value: any;
  name: string;
  description: string;
  group = 'system';
  public = false;
  type = 'text';
  visible = true;
  meta: any;
  createdAt: Date;
  updatedAt: Date;

  constructor(data?: Partial<SettingDto>) {
    data && Object.assign(this, pick(data, [
      '_id', 'key', 'value', 'name', 'description', 'type', 'visible', 'public', 'meta', 'createdAt', 'updatedAt'
    ]));
  }

  public getValue() {
    if (this.type === 'text' && !this.value) {
      return '';
    }

    return this.value;
  }
}
