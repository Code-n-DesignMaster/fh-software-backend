import { HttpException, Injectable } from '@nestjs/common';
import { EntityNotFoundException, QueueService, StringHelper } from 'src/kernel';
import { createTransport } from 'nodemailer';
import * as nodemailerSengrid from 'nodemailer-sendgrid';
import { SettingService } from 'src/modules/settings';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { render } from 'mustache';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import { IMail } from '../interfaces';

const TEMPLATE_DIR = join(process.env.TEMPLATE_DIR, 'emails');

@Injectable()
export class MailerService {
  private mailerQueue;

  private transport: any;

  constructor(
    private readonly queueService: QueueService,
    private readonly settingService: SettingService
  ) {
    this.init();
  }

  private async init() {
    this.mailerQueue = this.queueService.createInstance('MAILER_QUEUE');
    this.mailerQueue.process(
      process.env.MAILER_CONCURRENCY || 1,
      this.process.bind(this)
    );

    await this.initTransport();
  }

  private async initTransport() {
    // TODO - support DB config
    const useSendgrid = await this.settingService.getKeyValue(SETTING_KEYS.USE_SENDGRID_TRANSPORTER);
    if (useSendgrid) {
      const sendgridApiKey = await this.settingService.getKeyValue(SETTING_KEYS.SENDGRID_API_KEY);
      this.transport = createTransport(
        nodemailerSengrid({
          apiKey: sendgridApiKey || process.env.SENDGRID_API_KEY
        })
      );
    } else if (!useSendgrid) {
      const smtp = await this.settingService.getKeyValue(SETTING_KEYS.SMTP_TRANSPORTER);
      if (!smtp || !smtp.host || !smtp.auth || !smtp.port || !smtp.auth.user || !smtp.auth.pass) {
        const sendgridApiKey = await this.settingService.getKeyValue(SETTING_KEYS.SENDGRID_API_KEY);
        this.transport = createTransport(
          nodemailerSengrid({
            apiKey: sendgridApiKey || process.env.SENDGRID_API_KEY
          })
        );
        return this.transport;
      }
      smtp.port = parseInt(smtp.port, 10);
      this.transport = createTransport(smtp);
      return this.transport;
    } else {
      // TODO user another transport
      throw new HttpException('Not support other mailer transpport yet!', 400);
    }
    return true;
  }

  private getTemplate(template = 'default', isLayout = false): string {
    // eslint-disable-next-line no-param-reassign
    template = StringHelper.getFileName(template, true);

    if (template === 'blank') {
      return isLayout ? '[[BODY]]' : '';
    }

    const layoutFile = isLayout ? join(TEMPLATE_DIR, 'layouts', `${template}.html`) : join(TEMPLATE_DIR, `${template}.html`);
    if (!existsSync(layoutFile)) {
      return isLayout ? '[[BODY]]' : '';
    }

    return readFileSync(layoutFile, 'utf8');
  }

  private async process(job: any, done: Function) {
    try {
      const data = job.data as IMail;
      let { html } = data;
      if (!html && data.template) {
        html = this.getTemplate(data.template);
      }

      const body = html ? render(html, data.data) : '';
      const siteName = await this.settingService.getKeyValue(SETTING_KEYS.SITE_NAME);
      const logoUrl = await this.settingService.getKeyValue(SETTING_KEYS.LOGO_URL);
      const layout = this.getTemplate(data.layout, true);
      html = render(layout, {
        siteName: siteName || process.env.SITENAME || process.env.DOMAIN,
        logoUrl,
        subject: data.subject
      }).replace('[[BODY]]', body);
      const senderConfig = await this.settingService.getKeyValue(SETTING_KEYS.SENDER_EMAIL);
      const senderEmail = senderConfig || process.env.SENDER_EMAIL;
      await this.transport.sendMail({
        from: senderEmail,
        to: Array.isArray(data.to) ? data.to.join(',') : data.to,
        cc: Array.isArray(data.cc) ? data.cc.join(',') : data.cc,
        bcc: Array.isArray(data.cc) ? data.cc.join(',') : data.cc,
        subject: data.subject,
        html
      });
    } catch (e) {
      // console.log('mail_error', e);
    } finally {
      done();
    }
  }

  public async send(email: IMail) {
    await this.mailerQueue.createJob(email).save();
  }

  public async verify() {
    await this.initTransport();
    try {
      if (!this.transport) throw new EntityNotFoundException();
      return await new Promise((resolve, reject) => {
        this.transport.verify((error) => {
          if (error) {
            return reject(error);
          }
          return resolve({ success: true });
        });
      });
    } catch (e) {
      return e;
    }
  }
}
