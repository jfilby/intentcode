import { PrismaClient } from '@prisma/client'
import { CustomError } from '../../types/errors'
import { UsersService } from '../../services/users/service'

export class ChatParticipantModel {

  // Consts
  clName = 'ChatParticipantModel'

  // Services
  usersService = new UsersService()

  // Code
  async create(prisma: PrismaClient,
               id: string | undefined,
               chatSessionId: string,
               userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Validate
    if (userProfileId == null) {

      console.error(`${fnName}: userProfileId not specified`)
      throw `Validation error`
    }

    // Create record
    try {
      return await prisma.chatParticipant.create({
        data: {
          id: id,
          chatSessionId: chatSessionId,
          userProfileId: userProfileId
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async deleteByChatSessionId(
          prisma: PrismaClient,
          chatSessionId: string) {

    // Debug
    const fnName = `${this.clName}.deleteByChatSessionId()`

    // Delete records
    try {
      await prisma.chatParticipant.deleteMany({
        where: {
          chatSessionId: chatSessionId
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async getById(prisma: PrismaClient,
                id: string) {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Query record
    var chatParticipant: any = undefined

    try {
      chatParticipant = await prisma.chatParticipant.findUnique({
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

    // Return OK
    return chatParticipant
  }

  async getByChatSessionId(
          prisma: PrismaClient,
          chatSessionId: string) {

    // Debug
    const fnName = `${this.clName}.getByChatSessionId()`

    // Get by chatSessionId
    // Query records
    try {
      return await prisma.chatParticipant.findMany({
        where: {
          chatSessionId: chatSessionId
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }
  }

  async getByChatSessionIdAndOwnerType(
          prisma: PrismaClient,
          chatSessionId: string,
          ownerType: string) {

    // Debug
    const fnName = `${this.clName}.getByChatSessionId()`

    // Query record
    try {
      return await prisma.chatParticipant.findFirst({
        where: {
          chatSessionId: chatSessionId,
          userProfile: {
            ownerType: ownerType
          }
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }
  }

  async getByChatSessionIdAndUserProfileId(
          prisma: PrismaClient,
          chatSessionId: string,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.getByChatSessionId()`

    // Query record
    try {
      return await prisma.chatParticipant.findFirst({
        where: {
          chatSessionId: chatSessionId,
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

  async getParticipantTypeByUserProfileId(
          prisma: PrismaClient,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.getParticipantTypeByUserProfileId()`

    // Query record
    const userProfile = await
            this.usersService.getById(
              prisma,
              userProfileId)

    // Validate
    if (userProfile == null) {
      throw new CustomError(`${fnName}: userProfile == null`)
    }

    // Return OK
    return userProfile.ownerType
  }

  async update(prisma: PrismaClient,
               id: string,
               chatSessionId: string,
               userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Create record
    try {
      return await prisma.chatParticipant.update({
        data: {
          chatSessionId: chatSessionId,
          userProfileId: userProfileId
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
               chatSessionId: string,
               userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If the id is specified, try to get it
    if (id != null) {

      const chatParticipant = await
              this.getById(
                prisma,
                id)

      if (chatParticipant != null) {
        id = chatParticipant.id
      }
    }

    // Upsert
    if (id == null) {

      return await this.create(
                     prisma,
                     id,
                     chatSessionId,
                     userProfileId)
    } else {

      return await this.update(
                     prisma,
                     id,
                     chatSessionId,
                     userProfileId)
    }
  }
}
