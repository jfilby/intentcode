import { PrismaClient } from '@prisma/client'

export class AiTaskTechModel {

  // Consts
  clName = 'AiTaskTechModel'

  // Code
  async create(
    prisma: PrismaClient,
    aiTaskId: string,
    techId: string,
    userProfileId: string | null) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create AiTaskTech record
    try {
      return await prisma.aiTaskTech.create({
        data: {
          aiTaskId: aiTaskId,
          techId: techId,
          userProfileId: userProfileId
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
  
    // Get AiTaskTech record
    try {
      return await prisma.aiTaskTech.findUnique({
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

  async getByUniqueKey(
    prisma: PrismaClient,
    aiTaskId: string,
    userProfileId: string | null) {

    // Debug
    const fnName = `${this.clName}.getByUniqueKey()`

    // Validate
    if (aiTaskId == null) {
      console.error(`${fnName}: aiTaskId must be specified`)
      throw 'Prisma error'
    }

    if (userProfileId === undefined) {
      console.error(`${fnName}: userProfileId must not be undefined`)
      throw 'Prisma error'
    }

    // Get AiTaskTech record
    try {
      return await prisma.aiTaskTech.findFirst({
        include: {
          tech: {
            include: {
              techProvider: true
            }
          }
        },
        where: {
          aiTaskId: aiTaskId,
          userProfileId: userProfileId
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }
  }

  async update(
    prisma: PrismaClient,
    id: string,
    aiTaskId: string | undefined,
    techId: string | undefined,
    userProfileId: string | null | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    try {
      return await prisma.aiTaskTech.update({
        data: {
          aiTaskId: aiTaskId,
          techId: techId,
          userProfileId: userProfileId
        },
        where: {
          id: id
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
    }
  }

  async upsert(
    prisma: PrismaClient,
    id: string | undefined,
    aiTaskId: string | undefined,
    techId: string | undefined,
    userProfileId: string | null | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // Try to get by name
    if (id == null &&
        aiTaskId != null &&
        userProfileId !== undefined) {

      const aiTaskTech = await
        this.getByUniqueKey(
          prisma,
          aiTaskId,
          userProfileId)

      if (aiTaskTech != null) {
        id = aiTaskTech.id
      }
    }

    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (aiTaskId == null) {
        console.error(`${fnName}: id is null and aiTaskId is null`)
        throw 'Prisma error'
      }

      if (techId == null) {
        console.error(`${fnName}: id is null and techId is null`)
        throw 'Prisma error'
      }

      if (userProfileId === undefined) {
        console.error(`${fnName}: id is null and userProfileId is undefined`)
        throw 'Prisma error'
      }

      return await this.create(
        prisma,
        aiTaskId,
        techId,
        userProfileId)
    } else {
      return await this.update(
        prisma,
        id,
        aiTaskId,
        techId,
        userProfileId)
    }
  }
}
