/**
 * A chat turn.
 *
 * A chat is a session that is kept rather than discarded: its transcript is
 * the history, so the next turn continues the same conversation instead of
 * being handed a list of previous messages to read. That is why this opens a
 * file-backed session and hands the same one back each time.
 */

import { input } from '@inquirer/prompts'
import type { ProjectRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { IntentCodeAiTasks } from '@/core/ai/model.js'
import { PiService } from '@/services/ai/pi-service.js'
import { ExtensionQueryService } from
  '@/services/extensions/extension/query-service.js'
import { PiSkillsService } from
  '@/services/extensions/skills/pi-skills-service.js'


// Services
const piService = new PiService()
const piSkillsService = new PiSkillsService()

const extensionQueryService = new ExtensionQueryService()

// Contract
export interface ChatTurnResults {

  /** What the agent said. */
  text: string
}

// Class
export class ChatService {

  // Consts
  clName = 'ChatService'

  /** How a person ends a chat. */
  exitCommand = '/b'

  // Code

  /**
   * Hold a conversation about a project, until the person leaves.
   *
   * The session is opened once and prompted once per turn, so the agent's
   * tools stay available across the whole conversation: it can read the
   * project while it answers, rather than answering from what it was told.
   */
  async chat(
          store: ProjectStore,
          project: ProjectRecord,
          framing: string) {

    // The project's own skills, read the way a build reads them. A chat has no
    // build behind it, so the extensions are loaded here rather than passed in.
    const extensionsData =
      await extensionQueryService.loadExtensions(store, project.id)

    const skills = piSkillsService.getSkills(
      extensionsData ?? {
        extensionNodes: [],
        skillNodes: [],
        hooksNodes: []
      },
      project.path)

    // Open the session. It is prompted below rather than here, because a
    // session that is opened and never asked anything is a session with an
    // empty transcript saved against the chat.
    const session = await piService.openSession(store, {
      cwd: project.path,
      aiTask: IntentCodeAiTasks.compiler,
      skills,
      persistent: true,
      // The framing is what the chat is about: who the agent is, and what it
      // is being asked.
      systemPrompt: framing,
      tools: {
        toolNames: ['read', 'glob', 'grep', 'write', 'edit'],
        restrict: true
      },
      prompt: `Say hello, and state in one line what you can help with in ` +
              `this project. Do not change any file yet.`
    })

    // The conversation loop, with the session torn down on the way out. A chat
    // keeps its session rather than having it closed after each turn, so this
    // is the one place that disposes it.
    try {
    while (true) {

      console.log(``)

      const userInput = (await input({
        message: `Chat.. or ${this.exitCommand} (Back)`
      })).trim()

      if (userInput === this.exitCommand) return

      if (userInput === ``) continue

      // Ask
      const unsubscribe = session.subscribe((event) => {

        if (event.type === `message_update` &&
            event.assistantMessageEvent.type === `text_delta`) {

          process.stdout.write(event.assistantMessageEvent.delta)
        }
      })

      try {
        await session.prompt(userInput)
      } catch (error) {

        console.log(``)
        console.log(`The session failed to answer: ` +
                    `${error instanceof Error ? error.message : String(error)}`)

      } finally {
        unsubscribe()
      }

      console.log(``)
    }

    } finally {
      await session.dispose()
    }
  }
}
