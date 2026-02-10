import { prisma } from '@/db'
import { UsersService } from '../../../services/users/service'

const usersService = new UsersService()

export async function createBlankUser(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  // console.log('createBlankUser..')

  return usersService.createBlankUser(prisma)
}

export async function createUserByEmail(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  return usersService.createUserByEmail(prisma, args.email)
}

export async function getOrCreateSignedOutUser(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  // console.log(`getOrCreateSignedOutUser(): args: ${JSON.stringify(args)}`)

  try {
    return usersService.getOrCreateSignedOutUser(
             prisma,
             args.signedOutId,
             args.defaultUserPreferences)
  } catch(error) {
    console.error(`getOrCreateSignedOutUser(): error: ${error}`)
  }
}

export async function getOrCreateUserByEmail(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  try {
    return usersService.getOrCreateUserByEmail(
             prisma,
             args.email,
             args.defaultUserPreferences)
  } catch(error) {
    console.error(`getOrCreateUserByEmail(): error: ${error}`)
  }
}
