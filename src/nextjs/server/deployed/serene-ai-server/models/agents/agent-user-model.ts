import { PrismaClient } from '@prisma/client'
import { UserTypes } from '@/serene-core-server/types/user-types'

export class AgentUserModel {

  // Consts
  clName = 'AgentUserModel'

  // Code
  async create(
          prisma: PrismaClient,
          uniqueRefId: string | null,
          name: string,
          role: string,
          maxPrevMessages: number | null,
          defaultPrompt: string | null) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create UserProfile record
    console.log(`${fnName}: creating userProfile record..`)

    var userProfile: any = null

    try {
      userProfile = await prisma.userProfile.create({
        data: {
          isAdmin: false,
          ownerType: UserTypes.botRoleOwnerType,
          roles: role ? [role] : undefined
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
    }

    // Create and return AgentUser record
    console.log(`${fnName}: creating agentUser record..`)

    try {
      return await prisma.agentUser.create({
        data: {
          userProfile: {
            connect: {
              id: userProfile.id,
            }
          },
          uniqueRefId: uniqueRefId,
          name: name,
          role: role,
          maxPrevMessages: maxPrevMessages,
          defaultPrompt: defaultPrompt
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
    }
  }

  async getById(
          prisma: PrismaClient,
          id: string) {

    // Debug
    const fnName = `${this.clName}.getById()`
  
    // Get record
    try {
      return await prisma.agentUser.findUnique({
        where: {
          id: id
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }
  }

  async getByUniqueRefId(
          prisma: PrismaClient,
          uniqueRefId: string) {

    // Debug
    const fnName = `${this.clName}.getByUniqueRefId()`

    // Validate
    if (uniqueRefId == null) {
      console.error(`${fnName}: uniqueRefId must be specified`)
      throw 'Prisma error'
    }

    // Get AgentUser record
    try {
      return await prisma.agentUser.findUnique({
        where: {
          uniqueRefId: uniqueRefId
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }
  }

  async getByUserProfileId(
          prisma: PrismaClient,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.getByUserProfileId()`

    console.log(`${fnName}: userProfileId: ${userProfileId}`)

    // Query
    try {
      return await prisma.agentUser.findUnique({
        where: {
          userProfileId: userProfileId
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.log(`${fnName}: error: ${error}`)
      }
    }
  }

  async update(prisma: PrismaClient,
               id: string,
               uniqueRefId: string | null | undefined,
               name: string | undefined,
               role: string | undefined,
               maxPrevMessages: number | null | undefined,
               defaultPrompt: string | null | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    console.log(`${fnName}: updating agentUser record..`)

    try {
      return await prisma.agentUser.update({
        data: {
          name: name,
          role: role,
          maxPrevMessages: maxPrevMessages,
          defaultPrompt: defaultPrompt
        },
        where: {
          id: id
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
    }
  }

  async upsert(prisma: PrismaClient,
               id: string | undefined,
               uniqueRefId: string | null | undefined,
               name: string,
               role: string,
               maxPrevMessages: number | null | undefined,
               defaultPrompt: string | null | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // Try to get by name
    if (id == null &&
        uniqueRefId != null) {

      const agentUser = await
              this.getByUniqueRefId(
                prisma,
                uniqueRefId)

      if (agentUser != null) {
        id = agentUser.id
      }
    }

    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (uniqueRefId == null) {
        console.error(`${fnName}: id is null and uniqueRefId is null`)
        throw 'Prisma error'
      }

      if (maxPrevMessages === undefined) {
        console.error(`${fnName}: id is null and maxPrevMessages is undefined`)
        throw 'Prisma error'
      }

      if (defaultPrompt === undefined) {
        console.error(`${fnName}: id is null and defaultPrompt is undefined`)
        throw 'Prisma error'
      }

      return await this.create(
                     prisma,
                     uniqueRefId,
                     name,
                     role,
                     maxPrevMessages,
                     defaultPrompt)
    } else {
      return await this.update(
                     prisma,
                     id,
                     uniqueRefId,
                     name,
                     role,
                     maxPrevMessages,
                     defaultPrompt)
    }
  }
}
