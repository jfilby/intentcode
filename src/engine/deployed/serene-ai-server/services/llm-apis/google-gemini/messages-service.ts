import { CustomError } from '@/serene-core-server/types/errors'
import { ChatMessage, SereneAiServerOnlyTypes } from '../../../types/server-only-types'
import { EstimateGeminiTokensService } from './estimate-tokens-service'

// Services
const estimateGeminiTokensService = new EstimateGeminiTokensService()

// Class
export class GoogleGeminiMessagesService {

  // Consts
  clName = 'GoogleGeminiMessagesService'

  okMsg = 'ok'

  // Code
  addSystemRoleAndPrompt(
    name: string,
    role: string,
    anonymize: boolean,
    systemPrompt: string | undefined,
    messagesWithRoles: any[]) {

    // Set the role with a system message
    if (role != null) {

      // If the role isn't anonymous, start with a name
      var systemAndRolePrompt: string

      if (anonymize === false) {
        systemAndRolePrompt = `You are ${name}, a ${role}.`
      } else {
        systemAndRolePrompt = `You are a ${role}.`
      }

      if (systemPrompt != null) {
        systemAndRolePrompt += '\n' + systemPrompt
      }

      // Add messages
      // Gemini doesn't have the system role
      messagesWithRoles.push({
        role: SereneAiServerOnlyTypes.geminiUserMessageRole,
        parts: [{type: '', text: systemAndRolePrompt}]
      })

      messagesWithRoles.push({
        role: SereneAiServerOnlyTypes.geminiModelMessageRole,
        parts: [{type: '', text: this.okMsg}]
      })
    }
  }

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

  prepareMessages(
    llmTech: any,
    name: string,
    role: string,
    systemPrompt: string | undefined,
    messages: any[],
    anonymize: boolean) {

    // Debug
    const fnName = `${this.clName}.prepareMessages()`

    // console.log(`${fnName}: messages: ${JSON.stringify(messages)}`)

    // Create messagesWithRoles
    var messagesWithRoles: any[] = []

    // Set the system role and prompt
    this.addSystemRoleAndPrompt(
      name,
      role,
      anonymize,
      systemPrompt,
      messagesWithRoles)

    // Inform messages set the context
    var previousRole = ''

    for (const message of messages) {

      // Test
      // console.log(`${fnName}: message: ${JSON.stringify(message)}`)

      // Fill in a model response if none found
      if (previousRole === SereneAiServerOnlyTypes.geminiUserMessageRole &&
          message.role === SereneAiServerOnlyTypes.geminiUserMessageRole) {

        messagesWithRoles.push({
          role: SereneAiServerOnlyTypes.geminiModelMessageRole,
          parts: [{type: '', text: this.okMsg}]
        })
      }

      // Add message
      messagesWithRoles.push({
        role: message.role,
        parts: message.parts
      })

      // Set previousRole
      previousRole = message.role
    }

    // console.log(`${fnName}: messagesWithRoles: ` +
    //             JSON.stringify(messagesWithRoles))

    // Estimate the input and output tokens
    const estimatedInputTokens =
            estimateGeminiTokensService.estimateInputTokens(messagesWithRoles)

    const estimatedOutputTokens =
            estimateGeminiTokensService.estimatedOutputTokens

    // Variant name: may have to determine this based on input tokens and the
    // estimated output tokens.
    const variantName = llmTech.variantName

    // Return
    return {
      messages: messagesWithRoles,
      variantName: variantName,
      estimatedInputTokens: estimatedInputTokens,
      estimatedOutputTokens: estimatedOutputTokens
    }
  }
}
