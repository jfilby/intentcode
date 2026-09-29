/**
 * A chat about a project's Intent.
 *
 * This is a conversation rather than a report: the person asks, the agent
 * answers with the project in front of it, and anything that ought to change is
 * changed by the agent as it goes rather than by the engine afterwards. What
 * used to follow an answer here — a ranked suggestion handed back to the
 * engine to apply to the Intent file — is gone, because the agent that raised
 * it is the one holding the conversation.
 */

import type { ProjectRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { ChatService } from '@/services/instance-chats/chat-service.js'
import { IntentCodeAnalyzerQueryService } from './query-service.js'

// Services
const chatService = new ChatService()
const intentCodeAnalyzerQueryService = new IntentCodeAnalyzerQueryService()

// Class
export class IntentCodeAnalyzerChatService {

  // Consts
  clName = 'IntentCodeAnalyzerChatService'

  // Code
  async openChat(
    store: ProjectStore,
    project: ProjectRecord) {

    // Debug
    const fnName = `${this.clName}.openChat()`

    // The Intent directory, which is what the chat is about
    const { projectDetails } = await
      intentCodeAnalyzerQueryService.getBuildInfo(
        store,
        project)

    const jsonContent = projectDetails.projectIntentCodeNode.jsonContent

    const intentCodePath =
      jsonContent != null &&
      typeof jsonContent === 'object' &&
      'path' in jsonContent &&
      typeof jsonContent.path === 'string'
        ? jsonContent.path
        : undefined

    if (intentCodePath == null) {
      console.log(`This project has no IntentCode directory to talk about.`)
      return
    }

    // Hold the conversation
    await chatService.chat(
      store,
      project,
      `You are helping with this project's IntentCode, in ${intentCodePath}.\n` +
      `\n` +
      `The Intent files describe what the source should be. Ask about them, ` +
      `report what is wrong with them, and change them when that is what ` +
      `should happen — reading the source as you go, so a change fits what ` +
      `is there.`)
  }
}
