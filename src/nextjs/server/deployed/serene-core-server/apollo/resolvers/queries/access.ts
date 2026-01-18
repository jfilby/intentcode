import { prisma } from '@/db'
import { AccessService } from '../../../services/access/access-service'

const accessService = new AccessService()

export async function isAdminUser(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  return accessService.isAdminUser(
           prisma,
           args.userProfileId)
}
