import chalk from 'chalk'
import { PrismaClient, UserProfile } from '@prisma/client'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { CalcTestsService } from './calc-tests-service'
import { CalcV2TestsService } from './calc-v2-tests-service'

// Services
const consoleService = new ConsoleService()
const calcTestsService = new CalcTestsService()
const calcV2TestsService = new CalcV2TestsService()

// Class
export class TestsService {

  // Consts
  clName = 'TestsService'

  // Code
  async tests(prisma: PrismaClient,
              regularTestUserProfile: UserProfile,
              adminUserProfile: UserProfile) {

    // Tests menu
    console.log(``)
    console.log(chalk.bold(`─── Tests ───`))
    console.log(``)
    console.log(`[1] Calc project`)
    console.log(`[2] Calc v2 project`)

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

      case '2': {
        await calcV2TestsService.tests(
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
