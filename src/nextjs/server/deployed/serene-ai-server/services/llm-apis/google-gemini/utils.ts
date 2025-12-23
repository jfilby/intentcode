import { CustomError } from '@/serene-core-server/types/errors'
import { ChatMessage, SereneAiServerOnlyTypes } from '../../../types/server-only-types'

export class GoogleGeminiLlmUtilsService {

  // Consts
  clName = 'GoogleGeminiLlmUtilsService'

  // Code
  buildMessagesWithRoles(
    chatMessages: any[],
    fromContents: ChatMessage[],
    userChatParticipantIds: string[],
    agentChatParticipantIds: string[]) {

    // Debug
    const fnName = `${this.clName}.buildMessagesWithRoles()`

    /* console.log(`${fnName}: chatMessages: ` + JSON.stringify(chatMessages))

    console.log(`${fnName}: userChatParticipantIds: ` +
                JSON.stringify(userChatParticipantIds))

    console.log(`${fnName}: agentChatParticipantIds: ` +
                JSON.stringify(agentChatParticipantIds)) */

    // Messages var
    var messagesWithRoles: any[] = []

    // If this is the first message, then add a system prompt
    if (chatMessages.length === 0) {
      messagesWithRoles.push()
    }

    // Build messages with roles
    for (const chatMessage of chatMessages) {

      // Determine the role
      var role: string = ''

      if (chatMessage.sentByAi === false) {
        role = SereneAiServerOnlyTypes.geminiUserMessageRole
      } else if (chatMessage.sentByAi === true) {
        role = SereneAiServerOnlyTypes.geminiModelMessageRole
      } else {
        throw new CustomError(
                    `${fnName}: unhandled chatMessage.sentByAi: ` +
                    JSON.stringify(chatMessage.sentByAi))
      }

      // Add chat message
      messagesWithRoles.push({
        role: role,
        parts: JSON.parse(chatMessage.message)
      })
    }

    // Add latest message from the user
    messagesWithRoles.push({
      role: SereneAiServerOnlyTypes.geminiUserMessageRole,
      parts: fromContents
    })

    // Return
    return messagesWithRoles
  }

  buildMessagesWithRolesForSinglePrompt(prompt: string) {

    // Debug
    const fnName = `${this.clName}.buildMessagesWithRolesForSinglePrompt()`

    // Messages var
    var messagesWithRoles: any[] = []

    // Add a system prompt
    messagesWithRoles.push()

    // Determine the role
    var role: string = ''

    role = SereneAiServerOnlyTypes.geminiUserMessageRole

    // Add chat message
    messagesWithRoles.push({
      role: role,
      parts: [{ text: prompt }]
    })

    // Return
    return messagesWithRoles
  }
}
