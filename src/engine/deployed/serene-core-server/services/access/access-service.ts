import { PrismaClient } from '@prisma/client'
import { UsersService } from '../users/service'

export class AccessService {

  usersService = new UsersService()

  async isAdminUser(
          prisma: PrismaClient,
          userProfileId: string) {

    // Get UserProfile record
    var userProfile: any = null

    try {
      userProfile = await prisma.userProfile.findUnique({
        where: {
          id: userProfileId
        }
      })
    } catch(NotFound) {}

    if (userProfile == null) {
      return {
        status: false,
        message: 'User not found'
      }
    }

    // Return isAdmin value
    return {
      status: userProfile.isAdmin,
      message: null
    }
  }
}
