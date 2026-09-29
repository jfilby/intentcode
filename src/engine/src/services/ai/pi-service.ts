/**
 * The engine's one door onto the Pi coding agent.
 *
 * Everything the engine asks a model to do is a Pi session: a per-file compile
 * worker, a chat, a single analysis request. The differences between them are
 * the session's lifetime, its tools and its model, so they are parameters here
 * rather than three code paths that each grow their own idea of how to call a
 * model.
 *
 * The engine holds no credentials of its own. Pi resolves the key for the
 * provider it ends up on, so a model named in `intent.toml` is all the engine
 * has to say.
 */

import {
  createAgentSession,
  SessionManager,
  type AgentSession,
  type Skill
} from '@oh-my-pi/pi-coding-agent'
import { IntentError } from '@/core/errors.js'
import type { ProjectStore } from '@/core/store.js'
import { getModelPattern, type IntentCodeAiTasks } from '@/core/ai/model.js'
import { LlmCacheService } from './llm-cache-service.js'
import { LlmMessage } from '@/types/ai-types.js'
import { ServerOnlyTypes } from '@/types/server-only-types.js'

// Contract

/** What a session is allowed to do to the project. */
export interface PiToolSet {

  /**
   * The tools the session may call. A session given none is a text-only
   * completion: it answers a question and touches nothing.
   */
  toolNames?: string[]

  /**
   * Whether the named tools are the whole set. True keeps a session to exactly
   * the tools it was given, so an unrelated tool contributed by a discovered
   * extension cannot widen what a compile worker is allowed to do.
   */
  restrict?: boolean
}

export interface PiRequestParams {

  /** The project directory the session works in, and discovers skills from. */
  cwd: string

  /** The AI task, which names the model when a project overrides it per task. */
  aiTask: IntentCodeAiTasks

  /** What to ask. */
  prompt: string

  /** Replaces the default system prompt. */
  systemPrompt?: string

  /** Appended to the default system prompt. */
  appendSystemPrompt?: string

  /** The skills the session is given. Omit to discover none. */
  skills?: Skill[]

  /** What the session may do. Omit for a text-only completion. */
  tools?: PiToolSet

  /**
   * Whether the session's transcript is kept. False for a worker that has one
   * prompt and is discarded; true for a chat that is resumed.
   */
  persistent?: boolean
}

export interface PiRequestResults {

  /** `provider/model` of the model that answered. */
  modelId: string

  /** The reply as text. */
  text: string

  /**
   * The session, for a caller that keeps one. A cache hit answers from the
   * cache without building a session, so this is null for one.
   */
  session: AgentSession | null
}

// Services
const llmCacheService = new LlmCacheService()

// Class
export class PiService {

  // Consts
  clName = 'PiService'

  /**
   * A request whose caller needs the session itself, which is a chat rather
   * than a one-shot answer. Throws rather than returning a null session, so a
   * caller that has to keep talking cannot silently end up holding nothing.
   */
  async openSession(
          store: ProjectStore | undefined,
          params: PiRequestParams): Promise<AgentSession> {

    const { session } = await this.request(store, params)

    if (session == null) {

      throw new IntentError({
        category: 'AiError',
        stage: `${this.clName}.openSession()`,
        message: `no session was opened for a persistent request`
      })
    }

    return session
  }

  /**
   * A single request. The model is the one the project names for the task; the
   * session is created, prompted, and handed back, because a caller that asked
   * for a persistent session is the one that knows what to do with it next.
   */
  async request(
          store: ProjectStore | undefined,
          params: PiRequestParams): Promise<PiRequestResults> {

    // Debug
    const fnName = `${this.clName}.request()`

    // The model this task runs on
    const modelPattern = await getModelPattern(params.aiTask)

    // The session. Pi reports a model it could not use in
    // `modelFallbackMessage` rather than failing, so a selector that does not
    // resolve would otherwise surface as a session that simply answers
    // nothing — the two commonest setup faults, a mistyped model and a
    // missing key, would both read as silence.
    const { session, modelFallbackMessage } = await createAgentSession({
      cwd: params.cwd,
      sessionManager: this.getSessionManager(params),
      modelPattern,
      ...(params.systemPrompt == null
        ? {}
        : { systemPrompt: params.systemPrompt }),
      ...(params.appendSystemPrompt == null
        ? {}
        : { appendSystemPrompt: params.appendSystemPrompt }),
      ...(params.skills == null ? {} : { skills: params.skills }),
      ...(params.tools?.toolNames == null
        ? {}
        : {
            toolNames: params.tools.toolNames,
            restrictToolNames: params.tools.restrict ?? true
          })
    })

    if (modelFallbackMessage != null) {

      await session.dispose()

      throw new IntentError({
        category: 'AiError',
        stage: `${this.clName}.request()`,
        message: `could not use the model ${modelPattern}`,
        detail: modelFallbackMessage
      })
    }

    // The model's id is what a generation record has to name
    const modelId = session.model != null
      ? `${session.model.provider}/${session.model.id}`
      : modelPattern

    // Run. A worker is discarded once it has answered, so its session is
    // torn down here rather than left for the garbage collector: a session
    // holds an extension runtime, an event bus and an LSP server, and a build
    // opens one per Intent file. A chat asked for a session it keeps, so its
    // own caller disposes it.
    const text = await this.run(session, params.prompt)

    if (params.persistent !== true) {
      await session.dispose()
    }

    // Return
    return {
      modelId,
      text,
      session
    }
  }

  /**
   * A request whose reply is cached against its prompt.
   *
   * Pi caches provider-side prompt prefixes, not replies, so a request whose
   * prompt has not changed still costs a round trip through the provider. The
   * engine's own cache is what makes a repeated prompt free, and it is keyed on
   * the model id as well as the prompt, so a project that changes model does
   * not read back an answer from the previous one.
   */
  async cachedRequest(
          store: ProjectStore,
          params: PiRequestParams): Promise<PiRequestResults> {

    // Debug
    const fnName = `${this.clName}.cachedRequest()`

    // The model partitions the cache
    const modelPattern = await getModelPattern(params.aiTask)

    // Caching off: ask, and skip both the lookup and the write. The flag is
    // the engine's to set, so a project that wants a fresh answer every time
    // does not have to wait for the cache to be emptied.
    if (ServerOnlyTypes.llmCaching === false) {
      return await this.request(store, params)
    }

    // The messages the cache key is built from: what the session is told, and
    // what it is asked. The system prompt is part of the request, so a change
    // to it is a different request rather than a new framing of one.
    const cacheMessages: LlmMessage[] = []

    const systemPrompt =
      params.systemPrompt ?? params.appendSystemPrompt

    if (systemPrompt != null && systemPrompt !== ``) {
      cacheMessages.push({ role: 'system', content: systemPrompt })
    }

    cacheMessages.push({ role: 'user', content: params.prompt })

    const { cacheKey, inputMessage } =
      llmCacheService.buildCacheKey(cacheMessages)

    // Already answered?
    const cached = await llmCacheService.tryGet(
      store,
      modelPattern,
      cacheMessages)

    if (cached.llmCache != null) {

      // The model recorded is the one that answered rather than the selector
      // that was asked for, so a generation record names the same model
      // whether the reply came from the cache or from the provider. An entry
      // written before this was kept carries no model and falls back to the
      // selector.
      return {
        modelId: this.readCachedModelId(cached.llmCache.outputJson) ??
                 modelPattern,
        text: cached.llmCache.outputMessage ?? ``,
        session: null
      }
    }

    // Not answered: ask, then remember what it said
    const results = await this.request(store, params)

    await llmCacheService.save(
      store,
      modelPattern,
      cacheKey,
      inputMessage,
      results.text,
      { modelId: results.modelId, text: results.text })

    // Return
    return results
  }

  /** The model a cache entry was written by, when it records one. */
  private readCachedModelId(outputJson: unknown): string | undefined {

    if (outputJson == null ||
        typeof outputJson !== 'object' ||
        !('modelId' in outputJson)) {

      return undefined
    }

    const modelId = outputJson.modelId

    return typeof modelId === 'string' ? modelId : undefined
  }

  /**
   * The session manager a request's lifetime calls for: a chat is file-backed
   * so its transcript outlives the process, and a worker is in-memory because
   * it has one prompt and is discarded.
   */
  private getSessionManager(params: PiRequestParams) {

    if (params.persistent === true) {
      return SessionManager.create(params.cwd)
    }

    return SessionManager.inMemory(params.cwd)
  }

  /** Prompt a session and collect what it said. */
  private async run(session: AgentSession, prompt: string) {

    // Debug
    const fnName = `${this.clName}.run()`

    // The reply is streamed out of the session rather than read back from it:
    // the assistant's text arrives in pieces, and a session that is asked a
    // question it answers in one go never writes a final message the caller
    // could read instead.
    let text = ``

    const unsubscribe = session.subscribe((event) => {

      if (event.type === `message_update` &&
          event.assistantMessageEvent.type === `text_delta`) {

        text += event.assistantMessageEvent.delta
      }
    })

    try {
      await session.prompt(prompt)
    } catch (error) {

      throw new IntentError({
        category: 'AiError',
        stage: fnName,
        message: `the session failed to answer`,
        detail: error instanceof Error ? error.message : String(error)
      })

    } finally {
      unsubscribe()
    }

    // Return
    return text.trim()
  }
}
