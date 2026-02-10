import { prisma } from '@/db'
import { UsersService } from '../../../services/users/service'

const usersService = new UsersService()

export async function userById(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  // console.log('userById..')

  return usersService.getById(prisma, args.userProfileId)
}

export async function verifySignedInUserProfileId(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  // console.log('userById..')

  return usersService.verifySignedInUserProfileId(prisma, args.userProfileId)
}
