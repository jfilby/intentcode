import { PrismaClient } from '@prisma/client'

export class UserErrorModel {

  // Consts
  clName = 'UserErrorModel'

  // Code
  async create(prisma: PrismaClient,
               userErrorSummaryId: string,
               userProfileId: string,
               endUserProfileId: string | null,
               instanceId: string | null,
               origin: string,
               message: string,
               techMessage: string | null) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Create
    try {
      return await prisma.userError.create({
        data: {
          userErrorSummaryId: userErrorSummaryId,
          userProfileId: userProfileId,
          endUserProfileId: endUserProfileId,
          instanceId: instanceId,
          origin: origin,
          message: message,
          techMessage: techMessage
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async deleteByUserErrorSummaryId(
          prisma: PrismaClient,
          userErrorSummaryId: string) {

    // Debug
    const fnName = `${this.clName}.deleteByUserErrorSummaryId()`

    // Query
    try {
      return await prisma.userError.deleteMany({
        where: {
          userErrorSummaryId: userErrorSummaryId
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw `Prisma error`
    }
  }

  async deleteByUserProfileId(
          prisma: PrismaClient,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.deleteByUserProfileId()`

    // Query
    try {
      return await prisma.userError.deleteMany({
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
               userErrorSummaryId: string | undefined,
               userProfileId: string | undefined,
               endUserProfileId: string | null | undefined,
               instanceId: string | null | undefined,
               origin: string | undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Query
    try {
      return await prisma.userError.findMany({
        where: {
          userErrorSummaryId: userErrorSummaryId,
          userProfileId: userProfileId,
          endUserProfileId: endUserProfileId,
          instanceId: instanceId,
          origin: origin
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw `Prisma error`
    }
  }

  async update(prisma: PrismaClient,
               id: string,
               userErrorSummaryId: string | undefined,
               userProfileId: string | undefined,
               endUserProfileId: string | null | undefined,
               instanceId: string | null | undefined,
               origin: string | undefined,
               message: string | undefined,
               techMessage: string | null | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Create
    try {
      return await prisma.userError.update({
        data: {
          userErrorSummaryId: userErrorSummaryId,
          userProfileId: userProfileId,
          endUserProfileId: endUserProfileId,
          instanceId: instanceId,
          origin: origin,
          message: message,
          techMessage: techMessage
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
               userErrorSummaryId: string | undefined,
               userProfileId: string | undefined,
               endUserProfileId: string | null | undefined,
               instanceId: string | null | undefined,
               origin: string | undefined,
               message: string | undefined,
               techMessage: string | null | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (userErrorSummaryId == null) {
        console.error(`${fnName}: id is null and userErrorSummaryId is null`)
        throw 'Prisma error'
      }

      if (userProfileId == null) {
        console.error(`${fnName}: id is null and userProfileId is null`)
        throw 'Prisma error'
      }

      if (endUserProfileId === undefined) {
        console.error(`${fnName}: id is null and endUserProfileId is undefined`)
        throw 'Prisma error'
      }

      if (instanceId === undefined) {
        console.error(`${fnName}: id is null and instanceId is undefined`)
        throw 'Prisma error'
      }

      if (origin == null) {
        console.error(`${fnName}: id is null and origin is null`)
        throw 'Prisma error'
      }

      if (message == null) {
        console.error(`${fnName}: id is null and message is null`)
        throw 'Prisma error'
      }

      if (techMessage === undefined) {
        console.error(`${fnName}: id is null and techMessage is undefined`)
        throw 'Prisma error'
      }

      // Create
      return await this.create(
                     prisma,
                     userErrorSummaryId,
                     userProfileId,
                     endUserProfileId,
                     instanceId,
                     origin,
                     message,
                     techMessage)
    } else {

      // Update
      return await this.update(
                     prisma,
                     id,
                     userErrorSummaryId,
                     userProfileId,
                     endUserProfileId,
                     instanceId,
                     origin,
                     message,
                     techMessage)
    }
  }
}
