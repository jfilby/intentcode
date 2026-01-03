import { PrismaClient, UserProfile } from '@prisma/client'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { CalcTestsService } from './calc-tests-service'

// Services
const consoleService = new ConsoleService()
const calcTestsService = new CalcTestsService()

// Class
export class TestsService {

  // Consts
  clName = 'TestsService'

  // Code
  async tests(prisma: PrismaClient,
              regularTestUserProfile: UserProfile,
              adminUserProfile: UserProfile) {

    // Tests menu
    console.log(`Tests`)
    console.log(`-----`)
    console.log(`1. Calc project`)

    // Get test to run
    const testNo = await
            consoleService.askQuestion('> ')

    // Run the selected test
    switch (testNo) {

      case '1': {
        await calcTestsService.tests(
                prisma,
                regularTestUserProfile,
                adminUserProfile)
        return
      }

      default: {
        console.log(`Test not found`)
      }
    }
  }
}
