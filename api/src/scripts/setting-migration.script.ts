import { Injectable } from '@nestjs/common';
import { SettingService } from 'src/modules/settings';
import { SettingCreatePayload } from 'src/modules/settings/payloads';
import { SETTING_KEYS } from 'src/modules/settings/constants';

@Injectable()
export class SettingMigration {
  constructor(private readonly settingService: SettingService) { }

  async up() {
    const settings = [
      {
        key: SETTING_KEYS.SITE_NAME,
        value: process.env.SITE_NAME || 'Application',
        name: 'Site name',
        description: 'Global name',
        public: true,
        group: 'general',
        editable: true
      },
      {
        key: SETTING_KEYS.LOGO_URL,
        value: '',
        name: 'Logo',
        description: 'Site logo',
        public: true,
        group: 'general',
        editable: true,
        meta: {
          upload: true,
          image: true
        }
      },
      {
        key: SETTING_KEYS.FAVICON,
        value: '',
        name: 'Favicon',
        description: 'Site Favicon',
        public: true,
        group: 'general',
        editable: true,
        meta: {
          upload: true,
          image: true
        }
      },
      {
        key: SETTING_KEYS.REQUIRE_EMAIL_VERIFICATION,
        value: false,
        name: 'Mandatory email verification',
        description:
          'If active, user must verify email before log in to system',
        type: 'boolean',
        public: false,
        group: 'general',
        editable: true
      },
      {
        key: SETTING_KEYS.MAINTENANCE_MODE,
        value: false,
        name: 'Maintenance mode',
        description:
          'If active, user will see maintenance page once visiting site',
        type: 'boolean',
        public: true,
        group: 'general',
        editable: true
      },
      {
        key: SETTING_KEYS.COUPON_SWITCH,
        value: false,
        name: 'Coupon',
        description:
          'If active, user will see the coupon textbox and button in relevant page',
        type: 'boolean',
        public: true,
        group: 'general',
        editable: true
      },
      {
        key: SETTING_KEYS.NUDIRTY_SWITCH,
        value: true,
        name: 'Nudity Detection',
        description:
          'Detects the likelihood that an image contains nudity',
        type: 'boolean',
        public: true,
        group: 'general',
        editable: true
      },
      {
        key: SETTING_KEYS.NUDIRTY_MIN_SCORE,
        value: 80,
        name: 'Min Score With Nudity',
        description:
          'Specify the min score with nudity detection',
        type: 'text',
        public: true,
        group: 'general',
        editable: true
      },
      {
        key: SETTING_KEYS.RIGHT_CLICK_PRINT_SWITCH,
        value: true,
        name: 'Right Click Control',
        description:
          'Disable Right Click and Print',
        type: 'boolean',
        public: true,
        group: 'general',
        editable: true
      },
      {
        key: SETTING_KEYS.TIP_SWITCH,
        value: true,
        name: 'Tip Switch',
        description:
          'Hide Or Show Tip Feature',
        type: 'boolean',
        public: true,
        group: 'general',
        editable: true
      },
      {
        key: SETTING_KEYS.SHOP_CART_SWITCH,
        value: false,
        name: 'Shop Cart Switch',
        description:
          'Hide Or Show Shopping Cart Feature',
        type: 'boolean',
        public: true,
        group: 'general',
        editable: true
      },
      {
        key: SETTING_KEYS.MIN_VISIBLE_SUBSCRIBERS_COUNT,
        value: 20,
        name: 'Min Visible Subscribers Count',
        description:
          'Specify the min visible subscribers count',
        type: 'text',
        public: true,
        group: 'general',
        editable: true
      },
      {
        key: SETTING_KEYS.ADMIN_EMAIL,
        value: process.env.ADMIN_EMAIL || 'admin@app.com',
        name: 'Admin email',
        description: 'Email will receive information from site features',
        public: false,
        group: 'email',
        editable: true
      },
      {
        key: SETTING_KEYS.SENDER_EMAIL,
        value: process.env.SENDER_EMAIL || 'noreply@app.com',
        name: 'Sender email',
        description: 'Email will send application email',
        public: false,
        group: 'email',
        editable: true
      },
      {
        key: SETTING_KEYS.META_KEYWORDS,
        value: '',
        name: 'Home meta keywords',
        description: 'Custom meta keywords',
        public: true,
        group: 'custom',
        editable: true
      },
      {
        key: SETTING_KEYS.META_DESCRIPTION,
        value: '',
        name: 'Home meta description',
        description: 'Custom meta description',
        public: true,
        group: 'custom',
        editable: true,
        type: 'text',
        meta: {
          textarea: true
        }
      },
      {
        key: SETTING_KEYS.HEADER_SCRIPT,
        value: '',
        name: 'Custom header script',
        description: 'Custom code in <head> tag',
        public: true,
        group: 'custom',
        editable: true,
        type: 'text',
        meta: {
          textarea: true
        }
      },
      {
        key: SETTING_KEYS.AFTER_BODY_SCRIPT,
        value: '',
        name: 'Custom body script',
        description: 'Custom code at end of <body> tag',
        public: true,
        group: 'custom',
        editable: true,
        type: 'text',
        meta: {
          textarea: true
        }
      },
      {
        key: SETTING_KEYS.MONTHLY_SUBSCRIPTION_COMMISSION,
        value: 0.2,
        name: 'Monthly subscription commission',
        description: 'Setting monthly subscription commission',
        public: false,
        group: 'commission',
        editable: true,
        type: 'number'
      },
      {
        key: SETTING_KEYS.YEARLY_SUBSCRIPTION_COMMISSION,
        value: 0.2,
        name: 'Yearly subscription commission',
        description: 'Setting yearly subscription commission',
        public: false,
        group: 'commission',
        editable: true,
        type: 'number'
      },
      {
        key: SETTING_KEYS.VIDEO_SALE_COMMISSION,
        value: 0.2,
        name: 'Video for sale commission',
        description: 'Setting video for sale commission',
        public: false,
        group: 'commission',
        editable: true,
        type: 'number'
      },
      {
        key: SETTING_KEYS.GALLERY_SALE_COMMISSION,
        value: 0.2,
        name: 'Gallery for sale commission',
        description: 'Setting gallery for sale commission',
        public: false,
        group: 'commission',
        editable: true,
        type: 'number'
      },
      {
        key: SETTING_KEYS.TIP_COMMISSION,
        value: 0.2,
        name: 'Tip commission',
        description: 'Setting tip commission',
        public: false,
        group: 'commission',
        editable: true,
        type: 'number'
      },
      {
        key: SETTING_KEYS.PRODUCT_SALE_COMMISSION,
        value: 0.2,
        name: 'Product for sale commission',
        description: 'Setting product for sale commission',
        public: false,
        group: 'commission',
        editable: true,
        type: 'number'
      },
      {
        key: SETTING_KEYS.CCBILL_CLIENT_ACCOUNT_NUMBER,
        value: '',
        name: 'Client account number',
        description: 'CCbill merchant account number (eg: 987654)',
        public: false,
        group: 'ccbill',
        editable: true,
        type: 'text'
      },
      {
        key: SETTING_KEYS.CCBILL_SUB_ACCOUNT_NUMBER,
        value: '',
        name: 'Recurring account number for WeHeartFans',
        description: 'CCbill subscription account number',
        public: false,
        group: 'ccbill',
        editable: true,
        type: 'text'
      },
      {
        key: SETTING_KEYS.CCBILL_PUR_ACCOUNT_NUMBER,
        value: '',
        name: 'Non-Recurring account number for WeHeartFans',
        description: 'CCbill single purchase account number',
        public: false,
        group: 'ccbill',
        editable: true,
        type: 'text'
      },
      {
        key: SETTING_KEYS.CCBILL_HONEYDRIP_SUB_ACCOUNT_NUMBER,
        value: '',
        name: 'Recurring account number for HoneyDrip',
        description: 'CCbill subscription account number',
        public: false,
        group: 'ccbill',
        editable: true,
        type: 'text'
      },
      {
        key: SETTING_KEYS.CCBILL_HONEYDRIP_PUR_ACCOUNT_NUMBER,
        value: '',
        name: 'Non-Recurring account number for HoneyDrip',
        description: 'CCbill single purchase account number',
        public: false,
        group: 'ccbill',
        editable: true,
        type: 'text'
      },
      {
        key: SETTING_KEYS.CCBILL_FLEXFORM_ID,
        value: '',
        name: 'Flexform ID',
        description: 'CCbill flexform ID',
        public: false,
        group: 'ccbill',
        editable: true,
        type: 'text'
      },
      {
        key: SETTING_KEYS.CCBILL_SALT,
        value: '',
        name: 'Salt key',
        description: 'Salt key',
        public: false,
        group: 'ccbill',
        editable: true,
        type: 'text'
      },
      {
        key: SETTING_KEYS.USE_SENDGRID_TRANSPORTER,
        value: true,
        name: 'Use Sengrid as SMTP',
        description: 'If active, server will use Sengrid as SMTP transporter',
        public: false,
        group: 'mailer',
        editable: true,
        type: 'boolean'
      },
      {
        key: SETTING_KEYS.SENDGRID_API_KEY,
        value: 'SG.xxx',
        name: 'API key',
        description: 'Sendgrid API key',
        public: false,
        group: 'mailer',
        editable: true,
        type: 'text'
      },
      {
        key: SETTING_KEYS.SMTP_TRANSPORTER,
        value: {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          auth: {
            user: 'username',
            pass: 'password'
          }
        },
        name: 'SMTP Transport',
        description: 'Set up SMTP here',
        public: false,
        group: 'mailer',
        editable: true,
        type: 'mixed'
      },
      {
        key: SETTING_KEYS.GOOGLE_ANALYTICS_CODE,
        value: 'GA-123',
        name: 'GA code',
        description: 'Google Analytics Code',
        public: true,
        group: 'analytics',
        editable: true,
        type: 'text'
      },
      {
        key: SETTING_KEYS.VIEW_PORT_CONTENT,
        value: 'width=device-width, initial-scale=1, user-scalable=no',
        name: 'content',
        description: 'Viewport Setting',
        public: true,
        group: 'mobile',
        editable: true,
        type: 'text'
      },
      {
        key: SETTING_KEYS.SCREEN_ORIENTATION,
        value: 'autoRotate:disabled',
        name: 'content',
        description: 'Disable Landscape Mode',
        public: true,
        group: 'mobile',
        editable: true,
        type: 'text'
      }
    ] as any;

    // eslint-disable-next-line no-restricted-syntax
    for (const setting of settings) {
      // eslint-disable-next-line no-await-in-loop
      const test = await this.settingService.get(setting.key);
      if (!test) {
        const payload = new SettingCreatePayload();
        payload.key = setting.key;
        payload.value = setting.value;
        payload.name = setting.name;
        payload.description = setting.description;
        payload.public = setting.public;
        payload.editable = setting.editable;
        payload.group = setting.group;
        payload.type = setting.type || 'text';
        payload.meta = setting.meta;
        // eslint-disable-next-line no-await-in-loop
        await this.settingService.create(payload);
      } else {
        // eslint-disable-next-line no-console
        console.log(`Key ${setting.key} has been existed!`);
      }
    }
  }
}
