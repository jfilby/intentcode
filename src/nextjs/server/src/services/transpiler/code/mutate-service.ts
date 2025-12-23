import { PrismaClient, Tech } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'
import { UsersService } from '@/serene-core-server/services/users/service'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { CodeMutateLlmService } from './llm-service'

// Models
const techModel = new TechModel()

// Services
const codeMutateLlmService = new CodeMutateLlmService()
const usersService = new UsersService()

// Class
export class CodeMutateService {

  // Consts
  clName = 'CodeMutateService'

  // Code
  getPrompt() {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

    // Start the prompt
    var prompt =
          `## Instructions\n`

    // Return
    return prompt
  }

  async run(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.run()`

    // console.log(`${fnName}: starting..`)

    // Get the admin UserProfile
    const adminUserProfile = await
            usersService.getUserProfileByEmail(
              prisma,
              ServerTestTypes.adminUserEmail)

    if (adminUserProfile == null) {
      throw new CustomError(`${fnName}: adminUserProfile == null`)
    }

    // Run
    ;

    // Debug
    // console.log(`${fnName}: completed`)
  }
}
