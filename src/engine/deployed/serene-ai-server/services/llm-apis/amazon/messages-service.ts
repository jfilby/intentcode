import { CustomError } from '@/serene-core-server/types/errors'
import { ChatMessage, SereneAiServerOnlyTypes } from '../../../types/server-only-types'
import { EstimateAmazonBedrockTokensService } from './estimate-tokens-service'

// Services
const estimateAmazonBedrockTokensService = new EstimateAmazonBedrockTokensService()

// Class
export class AmazonBedrockMessagesService {

  // Consts
  clName = 'AmazonBedrockMessagesService'

  // OpenAI consts
  stopReason = 'stop'
  lengthReason = 'length'
  contentFilterReason = 'content_filter'
  nullReason = 'null'

  // Code
  addSystemRoleAndPrompt(
    name: string,
    role: string,
    anonymize: boolean,
    systemPrompt: string | undefined,
    messagesWithRoles: any[]) {

    // Set the role with a system message
    var content: any[] = []

    // Role?
    if (role != null) {

      // If the role isn't anonymous, start with a name
      var roleContent: string

      if (anonymize === false) {
        roleContent = `You are ${name}, a ${role}.`
      } else {
        roleContent = `You are a ${role}.`
      }

      content.push({
        text: roleContent
      })
    }

    // System prompt?
    if (systemPrompt != null) {

      content.push({
        text: systemPrompt
      })
    }

    // Add the system message
    messagesWithRoles.push({
      role: SereneAiServerOnlyTypes.chatGptAssistantMessageRole,
      content: content
    })
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
        role = SereneAiServerOnlyTypes.chatGptUserMessageRole
      } else if (chatMessage.sentByAi === true) {
        role = SereneAiServerOnlyTypes.chatGptAssistantMessageRole
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
      role: SereneAiServerOnlyTypes.chatGptUserMessageRole,
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

    role = SereneAiServerOnlyTypes.chatGptUserMessageRole

    // Add chat message
    messagesWithRoles.push({
      role: role,
      parts: [{ text: prompt }]
    })

    // Return
    return messagesWithRoles
  }

  convertAmazonBedrockCompletionResults(amazonBedrockResults: any) {

    // Debug
    const fnName = `${this.clName}.convertAmazonBedrockCompletionResults()`

    // console.log(`${fnName}: amazonBedrockResults: ` +
    //   JSON.stringify(amazonBedrockResults))

    // Validate
    if (amazonBedrockResults == null) {
      throw new CustomError(`${fnName}: amazonBedrockResults == null`)
    }

    // Initial results map
    var results = {
      status: true,
      // statusCode: undefined,
      model: undefined,
      message: '',     // Error message (if any)
      messages: [],    // Reply messages,
      pricingTier: 'paid',
      inputTokens: 0,
      outputTokens: 0,
      actualTech: undefined,
      createdPgCacheEdge: undefined
    }

    // Initial results conversion
    results =
      this.convertAmazonBedrockResults(
        amazonBedrockResults,
        results)

    // Get input and output token counts
    // results.model = amazonBedrockResults.model
    results.inputTokens = amazonBedrockResults.usage.inputTokens
    results.outputTokens = amazonBedrockResults.usage.outputTokens

    // Return
    return results
  }

  convertAmazonBedrockResults(
    amazonBedrockResults: any,
    results: any) {      // Existing results (just an initial map)

    // Debug
    const fnName = `${this.clName}.convertAmazonBedrockResults()`

    // console.log(`${fnName}: results: ` + JSON.stringify(results))

    // Validate
    if (amazonBedrockResults.output?.message == null) {
      throw new CustomError(
        `${fnName}: amazonBedrockResults.output?.message == null`)
    }

    // Attach return message
    var message = ``

    for (const messageContent of amazonBedrockResults.output.message.content) {

      results.messages.push(messageContent.text)
    }

    // Debug
    // console.log(`${fnName}: results: ${JSON.stringify(results)}`)

    // Return
    return results
  }

  prepareMessages(
    tech: any,
    name: string,
    role: string,
    systemPrompt: string | undefined,
    messages: any[],
    anonymize: boolean) {

    // Debug
    const fnName = `${this.clName}.prepareMessages()`

    // console.log(`${fnName}: starting with systemPrompt: ${systemPrompt}`)

    // Create messagesWithRoles
    var addedSystemRoleAndPrompt = false
    var firstUserMessage = false
    var messagesWithRoles: any[] = []

    // Debug
    // console.log(`${fnName}: messages: ` + JSON.stringify(messages))

    // Inform messages set the context
    for (const message of messages) {

      // Add the system prompt after the 1st user message
      if (addedSystemRoleAndPrompt === false &&
          firstUserMessage === true) {

        this.addSystemRoleAndPrompt(
          name,
          role,
          anonymize,
          systemPrompt,
          messagesWithRoles)

        addedSystemRoleAndPrompt = true
      }

      // Get message content
      var content = ''

      if (message.content != null &&
          Array.isArray(message.content)) {

        for (const messageContent of message.content) {

          if (content.length > 0) {
            content += '\n'
          }

          content += messageContent.text
        }
      }

      if (message.parts) {

        for (const part of message.parts) {

          if (content.length > 0) {
            content += '\n'
          }

          content += part.text
        }
      }

      // Get the OpenAI role
      var role: string

      switch (message.role) {
        case 'user': {
          role = SereneAiServerOnlyTypes.chatGptUserMessageRole

          if (firstUserMessage === false) {
            firstUserMessage = true
          }

          break
        }

        case 'system':
        case 'assistant':
        case 'model': {
          role = SereneAiServerOnlyTypes.chatGptAssistantMessageRole
          break
        }

        default: {
          throw new CustomError(`${fnName}: unhandled message role ` +
            JSON.stringify(message.role))
        }
      }

      // Add to messages
      messagesWithRoles.push({
        role: role,
        content: [{
          text: content
        }]
      })
    }

    // Add the system prompt if not yet added
    if (addedSystemRoleAndPrompt === false) {

      this.addSystemRoleAndPrompt(
        name,
        role,
        anonymize,
        systemPrompt,
        messagesWithRoles)
    }

    // Debug
    // console.log(`${fnName}: messagesWithRoles: ` +
    //   JSON.stringify(messagesWithRoles))

    // Estimate the input and output tokens
    const estimatedInputTokens =
      estimateAmazonBedrockTokensService.estimateInputTokens(messagesWithRoles)

    const estimatedOutputTokens =
      estimateAmazonBedrockTokensService.estimatedOutputTokens

    // Variant name: may have to determine this based on input tokens and the
    // estimated output tokens.
    const variantName = tech.variantName

    // Return
    // console.log(`${fnName}: returning..`)
    // console.log(`${fnName}: messagesWithRoles: ` +
    //             JSON.stringify(messagesWithRoles))

    return {
      messages: messagesWithRoles,
      variantName: variantName,
      estimatedInputTokens: estimatedInputTokens,
      estimatedOutputTokens: estimatedOutputTokens
    }
  }
}
