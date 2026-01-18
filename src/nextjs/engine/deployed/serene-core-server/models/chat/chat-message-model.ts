import { PrismaClient } from '@prisma/client'
import { Encrypter } from '@/serene-core-server/services/access/encrypt-service'
import { CustomError } from '@/serene-core-server/types/errors'

export class ChatMessageModel {

  // Consts
  clName = 'ChatMessageModel'

  msPerMinute = 60000

  // Services
  encrypter

  // Code
  constructor(encryptionKey: string | undefined) {

    this.encrypter = new Encrypter(encryptionKey)
  }

  async countMessages(
          prisma: PrismaClient,
          userProfileId: string,
          startDate: Date,
          sentByAi: boolean) {

    // Debug
    const fnName = `${this.clName}.countMessages()`

    // Query
    const count = await prisma.chatMessage.count({
      where: {
        sentByAi: sentByAi,
        chatSession: {
          createdById: userProfileId,
        },
        created: {
          gte: startDate,
        },
      },
    })

    // Return
    return count
  }

  async create(prisma: PrismaClient,
               id: string | undefined,
               chatSession: any,
               replyToId: string | null,
               fromUserProfileId: string,
               fromChatParticipantId: string,
               toChatParticipantId: string,
               externalId: string | null,
               sentByAi: boolean,
               message: string) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Validate
    if (chatSession == null) {

      throw new CustomError(`${fnName}: chatMessage == null`)
    }

    // Encrypt the message if required
    if (chatSession.isEncryptedAtRest === true) {

      message = this.encrypter.encrypt(message)
    }

    // Create record
    var chatMessage: any = undefined

    try {
      chatMessage =  await prisma.chatMessage.create({
        data: {
          id: id,
          chatSessionId: chatSession.id,
          replyToId: replyToId,
          fromChatParticipantId: fromChatParticipantId,
          toChatParticipantId: toChatParticipantId,
          externalId: externalId,
          sentByAi: sentByAi,
          message: message
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }

    // Return
    return chatMessage
  }

  async deleteByChatSessionId(
          prisma: PrismaClient,
          chatSessionId: string) {

    // Debug
    const fnName = `${this.clName}.deleteByChatSessionId()`

    // Delete records
    try {
      await prisma.chatMessage.deleteMany({
        where: {
          chatSessionId: chatSessionId
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async deleteById(
          prisma: PrismaClient,
          id: string) {

    // Debug
    const fnName = `${this.clName}.deleteById()`

    // Delete record
    try {
      await prisma.chatMessage.delete({
        where: {
          id: id
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async getById(prisma: PrismaClient,
                id: string,
                chatSession: any) {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Validate
    if (chatSession == null) {

      throw new CustomError(`${fnName}: chatMessage == null`)
    }

    // Query record
    var chatMessage: any = undefined

    try {
      chatMessage = await prisma.chatMessage.findUnique({
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

    // Decrypt message if required
    if (chatSession.isEncryptedAtRest === true) {

      chatMessage.message = this.encrypter.decrypt(chatMessage.message)
    }

    // Return OK
    return chatMessage
  }

  async getByChatSessionId(
          prisma: PrismaClient,
          chatSession: any,
          maxPrevMessages: number | null) {

    // Debug
    const fnName = `${this.clName}.getByChatSessionId()`

    // Validate
    if (chatSession == null) {
      console.error(`${fnName}: chatSessionId == null`)
      throw 'Prisma error'
    }

    if (chatSession.id == null) {
      console.error(`${fnName}: chatSession.id == null`)
      throw 'Prisma error'
    }

    // Query records
    var chatMessages: any[] = []

    if (maxPrevMessages == null) {

      // No max prev messages; get all messages
      try {
        chatMessages = await prisma.chatMessage.findMany({
          where: {
            chatSessionId: chatSession.id
          },
          orderBy: [
            {
              created: 'asc'
            }
          ]
        })
      } catch(error) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    } else {

      // Limit by max prev messages
      try {
        chatMessages = await prisma.chatMessage.findMany({
          take: maxPrevMessages,
          where: {
            chatSessionId: chatSession.id
          },
          orderBy: [
            {
              created: 'desc'
            }
          ]
        })
      } catch(error) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }

      chatMessages.reverse()
    }

    // Decrypts message if required
    if (chatSession.isEncryptedAtRest === true) {

      for (const chatMessage of chatMessages) {

        chatMessage.message = this.encrypter.decrypt(chatMessage.message)
      }
    }

    // Return
    return chatMessages
  }

  async getByChatSessionAndExternalId(
          prisma: PrismaClient,
          chatSession: any,
          externalId: string) {

    // Debug
    const fnName = `${this.clName}.getByChatSessionIdAndExternalId()`

    // Validate
    if (chatSession == null) {

      throw new CustomError(`${fnName}: chatSessionId == null`)
    }

    if (externalId == null) {

      throw new CustomError(`${fnName}: externalId == null`)
    }

    // Query record
    var chatMessage: any = undefined

    try {
      chatMessage = await prisma.chatMessage.findFirst({
        where: {
          chatSessionId: chatSession.id,
          externalId: externalId
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Decrypt message if required
    if (chatSession.isEncryptedAtRest === true) {

      chatMessage.message = this.encrypter.decrypt(chatMessage.message)
    }

    // Return OK
    return chatMessage
  }

  async getByLastMessageId(
          prisma: PrismaClient,
          chatSession: any,
          lastMessageId: string) {

    // Debug
    const fnName = `${this.clName}.getByLastMessageId()`

    // Validate
    if (chatSession == null) {

      throw new CustomError(`${fnName}: chatMessage == null`)
    }

    // Get the last message if specified
    var lastMessageCreated = new Date()

    if (lastMessageId != null) {

      const lastMessage = await
              this.getById(
                prisma,
                lastMessageId,
                chatSession)

      if (lastMessage != null) {
        lastMessageCreated = lastMessage.created
      }
    }

    // Query records
    var chatMessages: any[] = []

    try {
      chatMessages = await prisma.chatMessage.findMany({
        where: {
          chatSessionId: chatSession.id,
          created: {
            gt: lastMessageCreated
          }
        },
        orderBy: [
          {
            created: 'asc'
          }
        ]
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Decrypts message if required
    if (chatSession.isEncryptedAtRest === true) {

      for (const chatMessage of chatMessages) {

        chatMessage.message = this.encrypter.decrypt(chatMessage.message)
      }
    }

    // Return
    return chatMessages
  }

  async getEarliestUnread(
          prisma: PrismaClient,
          chatSession: any) {

    // Debug
    const fnName = `${this.clName}.getEarliestUnread()`

    // Validate
    if (chatSession == null) {
      throw new CustomError(`${fnName}: chatMessage == null`)
    }

    // Query record
    var chatMessage: any = undefined

    try {
      chatMessage = await prisma.chatMessage.findFirst({
        where: {
          chatSessionId: chatSession.id,
          sentByAi: true
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

    // Decrypt message if required
    if (chatSession.isEncryptedAtRest === true) {

      chatMessage.message = this.encrypter.decrypt(chatMessage.message)
    }

    // Return OK
    return chatMessage
  }

  async getFirst(
          prisma: PrismaClient,
          chatSession: any) {

    // Debug
    const fnName = `${this.clName}.getFirst()`

    // Validate
    if (chatSession == null) {

      throw new CustomError(`${fnName}: chatMessage == null`)
    }

    // Query record
    var chatMessage: any = undefined

    try {
      chatMessage = await prisma.chatMessage.findFirst({
        where: {
          chatSessionId: chatSession.id
        },
        orderBy: [
          {
            created: 'asc'
          }
        ]
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Decrypt message if required
    if (chatSession.isEncryptedAtRest === true) {

      chatMessage.message = this.encrypter.decrypt(chatMessage.message)
    }

    // Return OK
    return chatMessage
  }

  async getLast(
          prisma: PrismaClient,
          chatSession: any) {

    // Debug
    const fnName = `${this.clName}.getLast()`

    // Validate
    if (chatSession == null) {

      throw new CustomError(`${fnName}: chatMessage == null`)
    }

    // Query record
    var chatMessage: any = undefined

    try {
      chatMessage = await prisma.chatMessage.findFirst({
        where: {
          chatSessionId: chatSession.id
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

    // Decrypt message if required
    if (chatSession.isEncryptedAtRest === true) {

      chatMessage.message = this.encrypter.decrypt(chatMessage.message)
    }

    // Return OK
    return chatMessage
  }

  async setExternalId(
          prisma: PrismaClient,
          id: string,
          externalId: string | null) {

    // Debug
    const fnName = `${this.clName}.setExternalId()`

    // Validate
    if (id == null) {

      throw new CustomError(`${fnName}: id == null`)
    }

    if (externalId === undefined) {

      throw new CustomError(`${fnName}: externalId == null`)
    }

    // Update record
    try {
      return await prisma.chatMessage.update({
        data: {
          externalId: externalId
        },
        where: {
          id: id
        }
      })
    } catch(error: any) {
      // Don't fail, this can happen due to a unique constraint violation in
      // some valid scenarios.
      // Trying to handle the specific Prisma error code didn't work
      console.warn(`${fnName}: warning: ` + JSON.stringify(error))
      return null
    }
  }

  async update(prisma: PrismaClient,
               id: string,
               chatSession: any,
               replyToId: string | null | undefined,
               fromChatParticipantId: string | undefined,
               toChatParticipantId: string | undefined,
               externalId: string | null | undefined,
               sentByAi: boolean | undefined,
               message: string | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Validate
    if (chatSession == null) {

      throw new CustomError(`${fnName}: chatMessage == null`)
    }

    // Encrypt the message if required
    if (message != null &&
        chatSession.isEncryptedAtRest === true) {

      message = this.encrypter.encrypt(message)
    }

    // Update record
    try {
      return await prisma.chatMessage.update({
        data: {
          chatSessionId: chatSession.id,
          replyToId: replyToId,
          fromChatParticipantId: fromChatParticipantId,
          toChatParticipantId: toChatParticipantId,
          externalId: externalId,
          sentByAi: sentByAi,
          message: message
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
               chatSession: any,
               replyToId: string | null | undefined,
               fromUserProfileId: string | undefined,
               fromChatParticipantId: string | undefined,
               toChatParticipantId: string | undefined,
               externalId: string | null | undefined,
               sentByAi: boolean | undefined,
               message: string | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If the id is specified, try to get it
    if (id != null) {

      const chatMessage = await
              this.getById(
                prisma,
                id,
                chatSession)

      if (chatMessage != null) {
        id = chatMessage.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (replyToId === undefined) {
        console.error(`${fnName}: id is null and replyToId is undefined`)
        throw 'Prisma error'
      }

      if (fromUserProfileId == null) {
        console.error(`${fnName}: id is null and fromUserProfileId is null`)
        throw 'Prisma error'
      }

      if (fromChatParticipantId === undefined) {
        console.error(`${fnName}: id is null and fromChatParticipantId is undefined`)
        throw 'Prisma error'
      }

      if (toChatParticipantId === undefined) {
        console.error(`${fnName}: id is null and toChatParticipantId is undefined`)
        throw 'Prisma error'
      }

      if (externalId === undefined) {
        console.error(`${fnName}: id is null and externalId is undefined`)
        throw 'Prisma error'
      }

      if (sentByAi === undefined) {
        console.error(`${fnName}: id is null and sentByAi is undefined`)
        throw 'Prisma error'
      }

      if (message === undefined) {
        console.error(`${fnName}: id is null and message is undefined`)
        throw 'Prisma error'
      }

      // Create
      return await this.create(
                     prisma,
                     id,
                     chatSession,
                     replyToId,
                     fromUserProfileId,
                     fromChatParticipantId,
                     toChatParticipantId,
                     externalId,
                     sentByAi,
                     message)
    } else {

      // Update
      return await this.update(
                     prisma,
                     id,
                     chatSession,
                     replyToId,
                     fromChatParticipantId,
                     toChatParticipantId,
                     externalId,
                     sentByAi,
                     message)
    }
  }
}
