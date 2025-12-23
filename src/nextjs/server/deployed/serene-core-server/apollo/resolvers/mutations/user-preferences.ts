import { prisma } from '@/db'
import { UserPreferenceModel } from '../../../models/users/user-preference-model'

const userPreferenceModel = new UserPreferenceModel()

export async function upsertUserPreference(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  // console.log('userById..')

  try {
    return await
             userPreferenceModel.upsert(
               prisma,
               undefined,  // id
               args.userProfileId,
               args.category,
               args.key,
               args.value,
               args.values)
  } catch(error) {
    console.error(`upsertUserPreference: ${error}`)
  }
}
