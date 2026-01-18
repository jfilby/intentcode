import { PrismaClient } from '@prisma/client'

export class ExternalUserIntegrationModel {

  // Consts
  clName = 'ExternalUserIntegrationModel'

  // Code
  async create(
          prisma: PrismaClient,
          userProfileId: string,
          externalIntegrationUserId: string,
          externalIntegration: string) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.externalUserIntegration.create({
        data: {
          userProfileId: userProfileId,
          externalIntegrationUserId: externalIntegrationUserId,
          externalIntegration: externalIntegration
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async deleteById(
          prisma: PrismaClient,
          id: string) {

    // Debug
    const fnName = `${this.clName}.deleteById()`

    // Delete
    try {
      return await prisma.externalUserIntegration.delete({
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

  async filter(
          prisma: PrismaClient,
          userProfileId: string | undefined,
          externalIntegrationUserId: string | undefined,
          externalIntegration: string | undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Query
    try {
      return await prisma.externalUserIntegration.findMany({
        where: {
          userProfileId: userProfileId,
          externalIntegrationUserId: externalIntegrationUserId,
          externalIntegration: externalIntegration
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async getById(
          prisma: PrismaClient,
          id: string) {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Query
    var externalUserIntegration: any = null

    try {
      externalUserIntegration = await prisma.externalUserIntegration.findUnique({
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

    // Return
    return externalUserIntegration
  }

  async getByUniqueKey(
          prisma: PrismaClient,
          externalIntegrationUserId: string,
          externalIntegration: string) {

    // Debug
    const fnName = `${this.clName}.getByUniqueKey()`

    // Validate
    if (externalIntegrationUserId == null) {
      console.error(`${fnName}: externalIntegrationUserId is null`)
      throw 'Prisma error'
    }

    if (externalIntegration == null) {
      console.error(`${fnName}: externalIntegration is null`)
      throw 'Prisma error'
    }

    // Query
    var externalUserIntegration: any = null

    try {
      externalUserIntegration = await prisma.externalUserIntegration.findFirst({
        where: {
          externalIntegrationUserId: externalIntegrationUserId,
          externalIntegration: externalIntegration
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }
    // Return
    return externalUserIntegration
  }

  async update(
          prisma: PrismaClient,
          id: string,
          userProfileId: string | undefined,
          externalIntegrationUserId: string | undefined,
          externalIntegration: string | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Update record
    try {
      return await prisma.externalUserIntegration.update({
        data: {
          userProfileId: userProfileId,
          externalIntegrationUserId: externalIntegrationUserId,
          externalIntegration: externalIntegration
        },
        where: {
          id: id
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async upsert(prisma: PrismaClient,
               id: string | undefined,
               userProfileId: string | undefined,
               externalIntegrationUserId: string | undefined,
               externalIntegration: string | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If id isn't specified, but the unique keys are, try to get the record
    if (id == null &&
        externalIntegrationUserId != null &&
        externalIntegration != null) {

      const externalUserIntegration = await
              this.getByUniqueKey(
                prisma,
                externalIntegrationUserId,
                externalIntegration)

      if (externalUserIntegration != null) {
        id = externalUserIntegration.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (userProfileId == null) {
        console.error(`${fnName}: id is null and userProfileId is null`)
        throw 'Prisma error'
      }

      if (externalIntegrationUserId == null) {
        console.error(`${fnName}: id is null and externalIntegrationUserId is null`)
        throw 'Prisma error'
      }

      if (externalIntegration == null) {
        console.error(`${fnName}: id is null and externalIntegration is null`)
        throw 'Prisma error'
      }

      // Create
      return await
               this.create(
                 prisma,
                 userProfileId,
                 externalIntegrationUserId,
                 externalIntegration)
    } else {

      // Update
      return await
               this.update(
                 prisma,
                 id,
                 userProfileId,
                 externalIntegrationUserId,
                 externalIntegration)
    }
  }
}
