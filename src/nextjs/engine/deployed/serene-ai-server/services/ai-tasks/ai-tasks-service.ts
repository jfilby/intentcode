import { AiTask, PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { AiTaskModel } from '../../models/ai-tasks/ai-task-model'
import { AiTaskTechModel } from '../../models/ai-tasks/ai-task-tech-model'

// Types
export interface AiTaskDetail {
  aiTask: AiTask
  description: string
}

// Models
const aiTaskModel = new AiTaskModel()
const aiTaskTechModel = new AiTaskTechModel()

// Class
export class AiTasksService {

  // Consts
  clName = 'AiTasksService'

  // Code
  async getTech(
    prisma: PrismaClient,
    namespace: string,
    name: string,
    userProfileId: string | null,
    exceptionOnNotFound: boolean = true) {

    // Debug
    const fnName = `${this.clName}.getTech`

    // Get AiTask
    const aiTask = await
      aiTaskModel.getByUniqueKey(
        prisma,
        namespace,
        name)

    // Validate
    if (aiTask == null) {

      throw new CustomError(
        `${fnName}: AiTask not found for namespace: ${namespace} ` +
        `name: ${name}`)
    }

    // Get AiTaskTech
    const aiTaskTech = await
      aiTaskTechModel.getByUniqueKey(
        prisma,
        aiTask.id,
        userProfileId)

    // Validate
    if (aiTaskTech?.tech == null &&
        exceptionOnNotFound === true) {

      throw new CustomError(
        `${fnName}: AiTaskTech not found for aiTaskId: ${aiTask.id} ` +
        `userProfileId: ${userProfileId}`)
    }

    // Return
    return aiTaskTech?.tech
  }

  async getNumberedTechMap(
    prisma: PrismaClient,
    status: string | undefined,
    namespace: string,
    userProfileId: string | null) {

    // Debug
    const fnName = `${this.clName}.getNumberedTechMap`

    // Get AiTasks
    const aiTasks = await
      aiTaskModel.filter(
        prisma,
        status,
        namespace)

    // Validate
    if (aiTasks == null) {

      throw new CustomError(
        `${fnName}: aiTasks is null`)
    }

    // Form a numbered map
    var i = 1
    const aiTaskMap = new Map<string, AiTaskDetail>()

    for (const aiTask of aiTasks) {

      // Get AiTaskTech
      const aiTaskTech = await
        aiTaskTechModel.getByUniqueKey(
          prisma,
          aiTask.id,
          userProfileId)

      // Get description
      var description = `${aiTask.name}: `

      if (aiTaskTech?.tech != null) {

        description += aiTaskTech.tech.variantName
      } else {

        description += `none`
      }

      // Add entry
      aiTaskMap.set(
        `${i}`,
        {
          aiTask: aiTask,
          description: description
        })

      // Inc i
      i += 1
    }

    // Return
    return aiTaskMap
  }
}
