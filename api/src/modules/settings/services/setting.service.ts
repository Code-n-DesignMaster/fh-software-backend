import { Injectable, Inject, HttpException } from '@nestjs/common';
import { Model } from 'mongoose';
import { EntityNotFoundException, QueueEventService, QueueEvent } from 'src/kernel';
import { SettingModel } from '../models';
import { SETTING_MODEL_PROVIDER } from '../providers';
import { SettingCreatePayload, SettingUpdatePayload } from '../payloads';
import { SettingDto } from '../dtos';
import { SETTING_CHANNEL } from '../constants';
import { MenuService } from './menu.service';

@Injectable()
export class SettingService {
  static _settingCache = {} as Map<string, any>;

  // key and value
  static _publicSettingsCache = {} as any;

  constructor(
    @Inject(SETTING_MODEL_PROVIDER)
    private readonly settingModel: Model<SettingModel>,
    private readonly queueEventService: QueueEventService,
    private readonly menuService: MenuService
  ) {
    this.queueEventService.subscribe(SETTING_CHANNEL, 'HANDLE_SETTINGS_CHANGE', this.subscribeChange.bind(this));
  }

  private async publishChange(setting: SettingDto) {
    await this.queueEventService.publish(new QueueEvent({
      channel: SETTING_CHANNEL,
      eventName: 'update',
      data: new SettingDto(setting)
    }));
  }

  private async subscribeChange() {
    // TODO - update directly to static variable?
    await this.syncCache();
  }

  public async syncCache(): Promise<void> {
    const settings = await this.settingModel.find();
    settings.forEach((setting) => {
      const dto = new SettingDto(setting);
      SettingService._settingCache[dto.key] = dto;
      if (dto.visible && dto.public) {
        SettingService._publicSettingsCache[dto.key] = dto.value;
      }
    });
  }

  async get(key: string): Promise<SettingDto> {
    if (SettingService._settingCache[key]) {
      return SettingService._settingCache[key];
    }

    // TODO - handle events when settings change and reupdate here
    const data = await this.settingModel.findOne({ key });
    if (!data) {
      return null;
    }
    const dto = new SettingDto(data);
    SettingService._settingCache[key] = dto;
    return dto;
  }

  async getKeyValue(key: string): Promise<any> {
    if (SettingService._settingCache[key]) {
      return SettingService._settingCache[key].value;
    }

    // TODO - handle events when settings change and reupdate here
    const data = await this.settingModel.findOne({ key });
    if (!data) {
      return null;
    }
    const dto = new SettingDto(data);
    SettingService._settingCache[key] = dto;
    return dto.value;
  }

  async create(data: SettingCreatePayload): Promise<SettingModel> {
    const setting = await this.get(data.key);
    if (setting) {
      throw new HttpException('Setting key exist', 400);
    }

    // reupdate the setting list
    // TODO - must publish and subscribe to redis channel, so all instances (if run multiple)
    // have the same data
    await this.syncCache();
    return this.settingModel.create(data);
  }

  async update(key: string, data: SettingUpdatePayload): Promise<SettingDto> {
    const setting = await this.settingModel.findOne({ key });
    if (!setting) {
      throw new EntityNotFoundException();
    }
    data.description && setting.set('description', data.description);
    data.name && setting.set('name', data.name);
    setting.set('value', data.value);
    await setting.save();
    const dto = new SettingDto(setting);
    await this.publishChange(dto);
    return dto;
  }

  // get public and visible settings
  async getPublicSettings(): Promise<Map<string, any>> {
    const menus = await this.getPublicMenus();
    SettingService._publicSettingsCache.menus = menus && menus.length ? menus : [];
    await this.syncCache();
    return SettingService._publicSettingsCache;
  }

  async getPublicMenus() {
    return this.menuService.getPublicMenus();
  }

  /**
   * get all settings which are editable
   */
  async getEditableSettings(group?: string): Promise<SettingDto[]> {
    const query = { editable: true } as any;
    if (group) {
      query.group = group;
    }
    const settings = await this.settingModel.find(query);
    return settings.map((s) => new SettingDto(s));
  }

  public static getByKey(key: string) {
    return SettingService._settingCache[key] || null;
  }

  public static getValueByKey(key: string) {
    return SettingService._settingCache[key] ? SettingService._settingCache[key].value : null;
  }
}
