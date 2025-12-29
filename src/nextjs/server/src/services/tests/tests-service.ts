import { PrismaClient, UserProfile } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { CalcTestsService } from './calc-tests-service'

// Services
const calcTestsService = new CalcTestsService()

// Class
export class TestsService {

  // Consts
  clName = 'TestsService'

  // Code
  async tests(prisma: PrismaClient,
              regularTestUserProfile: UserProfile,
              adminUserProfile: UserProfile) {

    // Run the calc test
    await calcTestsService.tests(
            prisma,
            regularTestUserProfile,
            adminUserProfile)
  }
}
