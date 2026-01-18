import { prisma } from '@/db'
import { ProfileService } from '../../../services/users/profile-service'

const profileService = new ProfileService()

export async function validateProfileCompleted(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {
  // console.log('validateProfileCompleted(): ' +
  //             `args.userProfileId: ${args.userProfileId}`)

  return profileService.validateProfileCompleted(
           prisma,
           args.forAction,
           args.userProfileId)
}
