import { PrismaClient } from '@prisma/client'
import { CustomError } from '../../types/errors'
import { ChatParticipantModel } from './chat-participant-model'

const { v4: uuidv4 } = require('uuid')

export class ChatSessionModel {

  // Consts
  clName = 'ChatSessionModel'

  newStatus = 'N'

  // Models
  chatParticipantModel = new ChatParticipantModel()

  // Code
  async create(prisma: PrismaClient,
               id: string | undefined,
               chatSettingsId: string,
               instanceId: string | null,
               status: string,
               isEncryptedAtRest: boolean,
               name: string | null,
               externalIntegration: string | null,
               externalId: string | null,
               createdById: string) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Generate a token
    const token = uuidv4()

    // Create record
    try {
      return await prisma.chatSession.create({
        data: {
          id: id,
          chatSettingsId: chatSettingsId,
          instanceId: instanceId,
          status: status,
          isEncryptedAtRest: isEncryptedAtRest,
          token: token,
          name: name,
          externalIntegration: externalIntegration,
          externalId: externalId,
          createdById: createdById
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

    // Delete chat session
    try {
      return await prisma.chatSession.delete({
        where: {
          id: id
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async deleteByIdCascade(
          prisma: PrismaClient,
          id: string) {

    // Debug
    const fnName = `${this.clName}.deleteByIdCascade()`

    // Delete chat messages (code copied directly from chat-message-model.ts
    // to avoid setting the encryption key via the constructor).
    try {
      await prisma.chatMessage.deleteMany({
        where: {
          chatSessionId: id
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }

    // Delete chat participants
    await this.chatParticipantModel.deleteByChatSessionId(
            prisma,
            id)

    // Delete chat session
    await this.deleteById(
            prisma,
            id)
  }

  async deleteByInstanceId(
          prisma: PrismaClient,
          instanceId: string) {

    // Debug
    const fnName = `${this.clName}.deleteByInstanceId()`

    // Get records for the instanceId
    const chatSessions = await
            this.filter(
              prisma,
              instanceId,
              undefined,
              undefined,
              undefined,
              undefined)

    // Validate
    if (chatSessions == null) {
      throw new CustomError(`${fnName}: chatSessions == null`)
    }

    // Delete cascade each chat session
    for (const chatSession of chatSessions) {

      await this.deleteByIdCascade(
              prisma,
              chatSession.id)
    }
  }

  async filter(
          prisma: PrismaClient,
          instanceId: string | null | undefined,
          status: string | undefined,
          isEncryptedAtRest: boolean | undefined,
          externalIntegration: string | null | undefined,
          createdById: string | undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Query records
    try {
      return await prisma.chatSession.findMany({
        where: {
          instanceId: instanceId,
          status: status,
          isEncryptedAtRest: isEncryptedAtRest,
          externalIntegration: externalIntegration,
          createdById: createdById
        },
        orderBy: [
          {
            created: 'desc'
          }
        ]
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }
  }

  async getByExternalIntegrationAndExternalId(
          prisma: PrismaClient,
          externalIntegration: string,
          externalId: string,
          includeChatSettings: boolean = false) {

    // Debug
    const fnName = `${this.clName}.getByExternalIntegrationAndExternalId()`

    // Query record
    var chatSession: any = undefined

    try {
      chatSession = await prisma.chatSession.findFirst({
        include: {
          chatSettings: includeChatSettings
        },
        where: {
          externalIntegration: externalIntegration,
          externalId: externalId
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return OK
    return chatSession
  }

  async getById(prisma: PrismaClient,
                id: string,
                includeChatSettings: boolean = false) {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Query record
    var chatSession: any = undefined

    try {
      chatSession = await prisma.chatSession.findUnique({
        include: {
          chatSettings: includeChatSettings
        },
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
    return chatSession
  }

  async getNewStatusOver3DaysOld(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.getNewStatusOver3DaysOld()`

    // Days ago
    const day = 1000 * 60 * 60 * 24
    const days3 = day * 3
    const days3AgoDate = new Date(new Date().getTime() - days3)

    // Query records
    try {
      return await prisma.chatSession.findMany({
        where: {
          status: this.newStatus,
          created: {
            lt: days3AgoDate
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

  async update(prisma: PrismaClient,
               id: string,
               chatSettingsId: string | undefined,
               instanceId: string | null | undefined,
               status: string | undefined,
               isEncryptedAtRest: boolean | undefined,
               name: string | null | undefined,
               externalIntegration: string | null | undefined,
               externalId: string | null | undefined,
               createdById: string | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Update record
    try {
      return await prisma.chatSession.update({
        data: {
          chatSettingsId: chatSettingsId,
          instanceId: instanceId,
          status: status,
          isEncryptedAtRest: isEncryptedAtRest,
          name: name,
          externalIntegration: externalIntegration,
          externalId: externalId,
          createdById: createdById
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
               id: string,
               chatSettingsId: string | undefined,
               instanceId: string | null | undefined,
               status: string | undefined,
               isEncryptedAtRest: boolean | undefined,
               name: string | null | undefined,
               externalIntegration: string | null | undefined,
               externalId: string | null | undefined,
               createdById: string) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If the id is specified, try to get it
    if (id != null) {

      const chatSession = await
              this.getById(
                prisma,
                id)

      if (chatSession != null) {
        id = chatSession.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (chatSettingsId == null) {
        console.error(`${fnName}: id is null and chatSettingsId is null`)
        throw 'Prisma error'
      }

      if (instanceId === undefined) {
        console.error(`${fnName}: id is null and instanceId is undefined`)
        throw 'Prisma error'
      }

      if (status == null) {
        console.error(`${fnName}: id is null and status is null`)
        throw 'Prisma error'
      }

      if (name === undefined) {
        console.error(`${fnName}: id is null and name is undefined`)
        throw 'Prisma error'
      }

      if (externalIntegration === undefined) {
        console.error(`${fnName}: id is null and externalIntegration is undefined`)
        throw 'Prisma error'
      }

      if (externalId === undefined) {
        console.error(`${fnName}: id is null and externalId is undefined`)
        throw 'Prisma error'
      }

      if (isEncryptedAtRest == null) {
        console.error(`${fnName}: id is null and isEncryptedAtRest is null`)
        throw 'Prisma error'
      }

      // Create
      return await this.create(
                     prisma,
                     undefined,  // id
                     chatSettingsId,
                     instanceId,
                     status,
                     isEncryptedAtRest,
                     name,
                     externalIntegration,
                     externalId,
                     createdById)
    } else {

      // Update
      return await this.update(
                     prisma,
                     id,
                     chatSettingsId,
                     instanceId,
                     status,
                     isEncryptedAtRest,
                     name,
                     externalIntegration,
                     externalId,
                     createdById)
    }
  }
}
