/**
 * The Tests menu.
 *
 * The tests build a bundled example project end to end, which is the only way
 * to check the whole path — index, compile, verify — rather than one stage of
 * it. There is no user: the tests run as the engine, against the example's
 * own directory.
 */

import chalk from 'chalk'
import { select } from '@inquirer/prompts'
import type { ProjectRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { CommonCommands } from '@/types/server-only-types.js'
import { CalcTestsService } from './calc-tests-service.js'
import { CalcV2TestsService } from './calc-v2-tests-service.js'

// Services
const calcTestsService = new CalcTestsService()
const calcV2TestsService = new CalcV2TestsService()

export class TestsService {

  clName = 'TestsService'

  calcTests = `calc-tests`
  calcV2Tests = `calc-v2-tests`

  async tests(store: ProjectStore, project: ProjectRecord) {

    console.log(``)
    console.log(chalk.bold(`─── Tests ───`))
    console.log(``)

    const command = await select({
      message: `Select an option`,
      loop: false,
      pageSize: 10,
      choices: [
        { name: `Calc project`, value: this.calcTests },
        { name: `Calc v2 project`, value: this.calcV2Tests },
        { name: `Back`, value: CommonCommands.back }
      ]
    })

    switch (command) {

      case this.calcTests: {
        await calcTestsService.tests()
        break
      }

      case this.calcV2Tests: {
        await calcV2TestsService.tests()
        break
      }

      default: {
        console.log(`Test not found`)
      }
    }
  }
}
