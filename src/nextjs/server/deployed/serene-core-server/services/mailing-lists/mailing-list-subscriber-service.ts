import { PrismaClient } from '@prisma/client'
import { MailingListModel } from '../../models/mailing-lists/mailing-list-model'
import { MailingListSubscriberModel } from '../../models/mailing-lists/mailing-list-subscriber-model'

export class MailingListSubscriberService {

  // Models
  mailingListModel = new MailingListModel()
  mailingListSubscriberModel = new MailingListSubscriberModel()

  // Code
  async subscribe(
          prisma: PrismaClient,
          mailingListName: string,
          email: string,
          firstName: string) {

    // Get mailingList.id
    var mailingListId = await
          this.mailingListModel.getByName(
            prisma,
            mailingListName)

    // Check for existing subscriber
    const mailingListSubscriber = await
            this.mailingListSubscriberModel.getByMailingListIdAndEmail(
              prisma,
              mailingListId,
              email)

    if (mailingListSubscriber != null) {

      // Return
      return {
        verified: false,
        message: 'This email is already subscribed for this list.'
      }
    }

    // Subscribe
    await this.mailingListSubscriberModel.create(
            prisma,
            mailingListId,
            email,
            firstName,
            undefined,  // verificationCode
            undefined)  // verified

    // Return
    return {
      verified: true
    }
  }
}
