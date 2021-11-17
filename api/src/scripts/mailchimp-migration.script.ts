import { Injectable } from '@nestjs/common';
import { UserService } from 'src/modules/user/services';
import Mailchimp = require('mailchimp-api-v3');

@Injectable()
export class MailchimpMigration {
  constructor(private readonly userService: UserService) { }

  async up() {
    console.log('MailchimpMigration start');
    
    const users = await this.userService.find({});
    console.log('users.length:', users.length);

    let calls = []
    for (const user of users){
        calls.push({
            method : 'post',
            path : '/lists/' + process.env.MAILCHIMP_LIST_ID + '/members',
            body : {
              email_address : user.email,
              full_name: user.name,
              merge_fields: {FNAME: user.firstName, LNAME: user.lastName},
              status : 'subscribed'
            }
        });

    }

    if (calls.length > 0){
        try {
            var mailchimp = new Mailchimp(process.env.MAILCHIMP_API_KEY);

            let res = await mailchimp.batch(calls, {
                wait : true,
                interval : 2000,
                unpack : true,
            });     

            console.log('Mailchimp result:', res);
        }
        catch (err){
            console.log('Mailchimp error:', err);
        }
    }
  }
}
