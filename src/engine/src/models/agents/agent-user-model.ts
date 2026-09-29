import { AgentUser, PrismaClient } from '@/prisma/client.js'
import { isPrismaNotFound } from '../prisma-error-utils.js'

export class AgentUserModel {

  // Consts
  clName = 'AgentUserModel'

  // Code
  async getById(
          prisma: PrismaClient,
          id: string): Promise<AgentUser | null> {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Query
    var agentUser: AgentUser | null = null

    try {
      agentUser = await prisma.agentUser.findFirst({
        where: {
          id: id
        }
      })
    } catch(error: any) {
      if (isPrismaNotFound(error) === false) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return
    return agentUser
  }

  async getByUniqueRefId(
          prisma: PrismaClient,
          uniqueRefId: string): Promise<AgentUser | null> {

    // Debug
    const fnName = `${this.clName}.getByUniqueRefId()`

    // Validate
    if (uniqueRefId == null) {
      console.error(`${fnName}: uniqueRefId == null`)
      throw 'Validation error'
    }

    // Query
    var agentUser: AgentUser | null = null

    try {
      agentUser = await prisma.agentUser.findFirst({
        where: {
          uniqueRefId: uniqueRefId
        }
      })
    } catch(error: any) {
      if (isPrismaNotFound(error) === false) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return
    return agentUser
  }

  async upsert(
          prisma: PrismaClient,
          id: string | undefined,
          uniqueRefId: string | undefined,
          name: string | undefined,
          role: string | undefined,
          maxPrevMessages: number | null | undefined,
          defaultPrompt: string | null | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // Upsert record
    try {
      return await prisma.agentUser.upsert({
        where: {
          uniqueRefId: uniqueRefId!
        },
        update: {
          name: name,
          role: role,
          maxPrevMessages: maxPrevMessages,
          defaultPrompt: defaultPrompt
        },
        create: {
          id: id,
          uniqueRefId: uniqueRefId,
          name: name!,
          role: role!,
          maxPrevMessages: maxPrevMessages,
          defaultPrompt: defaultPrompt
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw error
    }
  }
}
