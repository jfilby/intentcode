import { prisma } from '@/db'
import { MailingListSubscriberService } from '../../../services/mailing-lists/mailing-list-subscriber-service'

const mailingListSubscriberService = new MailingListSubscriberService()

export async function upsertUserPreference(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  // console.log('userById..')

  // Subscribe
  try {
    return await
             mailingListSubscriberService.subscribe(
               prisma,
               args.mailingListName,
               args.email,
               args.firstName)
  } catch(error) {
    console.error(`upsertUserPreference: ${error}`)
  }
}
