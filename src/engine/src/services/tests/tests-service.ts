import chalk from 'chalk'
import { select } from '@inquirer/prompts'
import { PrismaClient, UserProfile } from '@prisma/client'
import { CommonCommands } from '@/types/server-only-types'
import { CalcTestsService } from './calc-tests-service'
import { CalcV2TestsService } from './calc-v2-tests-service'

// Services
const calcTestsService = new CalcTestsService()
const calcV2TestsService = new CalcV2TestsService()

// Class
export class TestsService {

  // Consts
  clName = 'TestsService'

  calcTests = `calc-tests`
  calcV2Tests = `calc-v2-tests`

  // Code
  async tests(prisma: PrismaClient,
              regularTestUserProfile: UserProfile,
              adminUserProfile: UserProfile) {

    // Tests menu
    console.log(``)
    console.log(chalk.bold(`─── Tests ───`))
    console.log(``)

    // Choices
    var choices = [
      {
        name: `Back`,
        value: CommonCommands.back as string
      },
      {
        name: `Calc project`,
        value: this.calcTests
      },
      {
        name: `Calc v2 project`,
        value: this.calcV2Tests
      }
    ]

    // Prompt for command
    const command = await select({
      message: `Select an option`,
      loop: false,
      pageSize: 10,
      choices: choices
    })

    // Run the selected test
    switch (command) {

      case this.calcTests: {
        await calcTestsService.tests(
                prisma,
                regularTestUserProfile,
                adminUserProfile)
        return
      }

      case this.calcV2Tests: {
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
