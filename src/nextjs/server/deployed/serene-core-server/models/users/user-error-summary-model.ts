import { PrismaClient } from '@prisma/client'

export class UserErrorSummaryModel {

  // Consts
  clName = 'UserErrorSummaryModel'

  // Code
  async create(prisma: PrismaClient,
               userProfileId: string,
               instanceId: string | null,
               origin: string | null,
               message: string,
               count: number) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Create
    try {
      return await prisma.userErrorSummary.create({
        data: {
          userProfileId: userProfileId,
          instanceId: instanceId,
          origin: origin,
          message: message,
          count: count
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async deleteByUserProfileId(
          prisma: PrismaClient,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.deleteByUserProfileId()`

    // Query
    try {
      return await prisma.userErrorSummary.deleteMany({
        where: {
          userProfileId: userProfileId
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw `Prisma error`
    }
  }

  async filter(prisma: PrismaClient,
               userProfileId: string | undefined,
               instanceId: string | null | undefined,
               origin: string | null | undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Query
    try {
      return await prisma.userErrorSummary.findMany({
        where: {
          userProfileId: userProfileId,
          instanceId: instanceId,
          origin: origin
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw `Prisma error`
    }
  }

  async getByUniqueKey(
          prisma: PrismaClient,
          userProfileId: string,
          instanceId: string | null,
          origin: string | null | undefined,
          message: string) {

    // Debug
    const fnName = `${this.clName}.getByUniqueKey()`

    // Query
    try {
      return await prisma.userErrorSummary.findFirst({
        where: {
          userProfileId: userProfileId,
          instanceId: instanceId,
          origin: origin,
          message: message
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw `Prisma error`
    }
  }

  async update(prisma: PrismaClient,
               id: string,
               userProfileId: string | undefined,
               instanceId: string | null | undefined,
               origin: string | null | undefined,
               message: string | undefined,
               count: number | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Create
    try {
      return await prisma.userErrorSummary.update({
        data: {
          userProfileId: userProfileId,
          instanceId: instanceId,
          origin: origin,
          message: message,
          count: count
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
               instanceId: string | null | undefined,
               origin: string | null | undefined,
               message: string | undefined,
               count: number | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // Try to get by the unique key
    if (id == null &&
        userProfileId != null &&
        instanceId !== undefined &&
        message != null) {

      const userErrorSummary = await
              this.getByUniqueKey(
                prisma,
                userProfileId,
                instanceId,
                origin,
                message)

      if (userErrorSummary != null) {
        id = userErrorSummary.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (userProfileId == null) {
        console.error(`${fnName}: id is null and userProfileId is null`)
        throw 'Prisma error'
      }

      if (instanceId === undefined) {
        console.error(`${fnName}: id is null and instanceId is undefined`)
        throw 'Prisma error'
      }

      if (origin === undefined) {
        console.error(`${fnName}: id is null and origin is undefined`)
        throw 'Prisma error'
      }

      if (message == null) {
        console.error(`${fnName}: id is null and message is null`)
        throw 'Prisma error'
      }

      if (count == null) {
        console.error(`${fnName}: id is null and count is null`)
        throw 'Prisma error'
      }

      // Create
      return await this.create(
                     prisma,
                     userProfileId,
                     instanceId,
                     origin,
                     message,
                     count)
    } else {

      // Update
      return await this.update(
                     prisma,
                     id,
                     userProfileId,
                     instanceId,
                     origin,
                     message,
                     count)
    }
  }
}
