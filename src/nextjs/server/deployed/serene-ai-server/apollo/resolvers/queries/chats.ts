import { prisma } from '@/db'
import { CustomError } from '@/serene-core-server/types/errors'
import { ChatSessionService } from '../../../services/chats/sessions/chat-session-service'


// Services
const chatSessionService = new ChatSessionService()


// Code
export async function getChatMessages(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  const fnName = `getChatMessages()`

  console.log(`${fnName}: args: ${JSON.stringify(args)}`)

  var results: any

  try {
    results = await
      chatSessionService.getChatMessages(
        prisma,
        args.chatSessionId,
        args.userProfileId,
        args.lastMessageId)

    console.log
  } catch (error) {
    if (error instanceof CustomError) {
      return {
        status: false,
        message: error.message
      }
    } else {
      return {
        status: false,
        message: `Unexpected error: ${error}`
      }
    }
  }

  return results
}

export async function getChatParticipants(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  const fnName = `getChatParticipants()`

  // console.log(`${fnName}: args: ${JSON.stringify(args)}`)

  var results: any

  try {
    results = await
      chatSessionService.getChatParticipants(
        prisma,
        args.chatSessionId,
        args.userProfileId)
  } catch (error) {
    if (error instanceof CustomError) {
      return {
        status: false,
        message: error.message
      }
    } else {
      return {
        status: false,
        message: `Unexpected error: ${error}`
      }
    }
  }

  return results
}

export async function getChatSession(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  const fnName = `getChatSession()`

  // console.log(`${fnName}: args: ${JSON.stringify(args)}`)

  var results: any

  try {
    results = await
      chatSessionService.getChatSessionById(
        prisma,
        args.chatSessionId,
        args.userProfileId)
  } catch (error) {
    if (error instanceof CustomError) {
      return {
        status: false,
        message: error.message
      }
    } else {
      return {
        status: false,
        message: `Unexpected error: ${error}`
      }
    }
  }

  return results
}

export async function getChatSessions(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  const fnName = `getChatSessions()`

  // console.log(`${fnName}: args: ${JSON.stringify(args)}`)

  var results: any

  try {
    results = await
      chatSessionService.getChatSessions(
        prisma,
        args.status,
        args.userProfileId,
        args.instanceId)
  } catch (error) {
    if (error instanceof CustomError) {
      return {
        status: false,
        message: error.message
      }
    } else {
      return {
        status: false,
        message: `Unexpected error: ${error}`
      }
    }
  }

  // console.log(`${fnName}: results: ${JSON.stringify(results)}`)

  return results
}
