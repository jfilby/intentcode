/**
 * The CommandCode provider.
 *
 * CommandCode is not one of the OpenAI shaped gateways the AI SDK ships a
 * package for, so this is the one place that knows its wire format. It speaks
 * the generate transport the CommandCode CLI itself uses, POST /alpha/generate,
 * which is the one a CommandCode subscription can reach; the OpenAI compatible
 * surface beside it (/provider/v1) is only on plans with provider API access
 * and answers a 403 upgrade_required to a key that has none.
 *
 * The endpoint answers with a stream of JSON events, one per line, in the SSE
 * framing of `data: ` prefixed lines or in plain line delimited JSON, so both
 * are read here. An event carrying nothing this engine knows is passed over
 * rather than refused, and an event that is not an event at all is refused
 * rather than passed over.
 *
 *   POST /alpha/generate
 *   Authorization: Bearer <CommandCode Studio API key>
 *   x-command-code-version: <the version of the command-code CLI>
 *   x-cli-environment: production
 *
 * The version header is not decoration: the request envelope is the CLI's own
 * and it changed shape as the CLI grew, so a client that names a version the
 * server has moved past is talking about a request the server no longer reads.
 */

import { randomUUID } from 'node:crypto'
import { APICallError } from '@ai-sdk/provider'
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4FinishReason,
  LanguageModelV4GenerateResult,
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
  LanguageModelV4Usage,
  SharedV4Warning
} from '@ai-sdk/provider'
import * as z from 'zod'

/** The API host, and the only path a CommandCode subscription can reach. */
export const COMMANDCODE_BASE_URL = 'https://api.commandcode.ai'
const GENERATE_PATH = '/alpha/generate'

/**
 * The published `command-code` CLI version, which is what the request
 * envelope and the version header are shaped by.
 */
export const COMMANDCODE_CLI_VERSION = '1.66.0'

/**
 * The output budget a request is given when the engine sets none. It is the
 * ceiling the service accepts for a single answer.
 */
const DEFAULT_MAX_TOKENS = 64_000

export interface CommandCodeSettings {
  readonly apiKey: string
  readonly baseUrl: string
  /** Extra request headers, such as the attribution a gateway accepts. */
  readonly headers?: Record<string, string>
  readonly fetch?: typeof globalThis.fetch
}

/* -------------------------------------------------------------------------- */
/* The wire                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A field the wire may leave out or send as null, which says the same thing
 * here: the provider did not report it.
 */
const reported = <T extends z.ZodType>(field: T) =>
  field.nullish().transform((value) => value ?? undefined) as z.ZodType<
    z.output<T> | undefined
  >

const Usage = z.looseObject({
  inputTokens: reported(z.number()),
  outputTokens: reported(z.number()),
  inputTokenDetails: reported(
    z.looseObject({
      noCacheTokens: reported(z.number()),
      cacheReadTokens: reported(z.number()),
      cacheWriteTokens: reported(z.number())
    })
  ),
  outputTokenDetails: reported(
    z.looseObject({
      textTokens: reported(z.number()),
      reasoningTokens: reported(z.number())
    })
  )
})

/**
 * What one event of the answer stream says. Loosened past the fields the
 * clients of this endpoint agree on, because a provider that adds a field to
 * an event is not a provider whose events have stopped being events.
 */
const Event = z.looseObject({
  type: z.string(),
  text: reported(z.string()),
  finishReason: reported(z.string()),
  rawFinishReason: reported(z.string()),
  usage: reported(Usage),
  totalUsage: reported(Usage),
  error: reported(
    z.looseObject({
      message: reported(z.string()),
      code: reported(z.string()),
      statusCode: reported(z.number())
    })
  ),
  message: reported(z.string())
})

/** What a refused request comes back as. */
const Refusal = z.looseObject({
  success: reported(z.boolean()),
  message: reported(z.string()),
  error: reported(
    z.looseObject({
      code: reported(z.string()),
      status: reported(z.number()),
      message: reported(z.string()),
      docs: reported(z.string())
    })
  )
})

type CommandCodeEvent = z.infer<typeof Event>

const callError = (
  message: string,
  url: string,
  statusCode: number | undefined,
  responseBody: unknown,
  cause?: unknown
): APICallError =>
  new APICallError({
    message,
    url,
    requestBodyValues: {},
    ...(statusCode === undefined ? {} : { statusCode }),
    ...(responseBody === undefined
      ? {}
      : { responseBody: JSON.stringify(responseBody) }),
    ...(cause === undefined ? {} : { cause }),
    // What this provider is asked to do with a failure is the caller's: the
    // request loop asks for it again in place, so the classification only
    // decides what the failure is reported as.
    isRetryable:
      statusCode === undefined ? false : statusCode === 429 || statusCode >= 500
  })

const transportError = (message: string, detail: string): APICallError =>
  callError(
    message,
    COMMANDCODE_BASE_URL,
    undefined,
    undefined,
    new Error(detail))

/* -------------------------------------------------------------------------- */
/* Request                                                                     */
/* -------------------------------------------------------------------------- */

interface WireRequest {
  readonly config: {
    readonly workingDir: string
    readonly date: string
    readonly environment: string
    readonly structure: readonly unknown[]
    readonly isGitRepo: boolean
    readonly currentBranch: string
    readonly mainBranch: string
    readonly gitStatus: string
    readonly recentCommits: readonly unknown[]
  }
  readonly memory: null
  readonly taste: null
  readonly skills: null
  readonly permissionMode: string
  /** A UUID, or the service refuses the request. */
  readonly threadId: string
  readonly params: {
    readonly model: string
    readonly messages: readonly { role: string; content: string }[]
    readonly system: string
    readonly max_tokens: number
    readonly temperature?: number
    readonly stop?: readonly string[]
    readonly stream: true
  }
}

/**
 * The request, in the envelope the CLI sends: the conversation is a
 * conversation, and everything around it describes a working session this
 * engine does not have.
 *
 * The system text is hoisted out of the messages because that is where this
 * endpoint keeps it, and it is always sent, even when there is none: a
 * request with the field left out is answered with a prompt of the service's
 * own, several thousand tokens long, ahead of the question.
 *
 * A part that is not text is reported rather than dropped, since a request
 * that quietly lost half its prompt is one whose answer cannot be read as the
 * model's answer to the question that was asked.
 */
function toWire(
  modelId: string,
  options: LanguageModelV4CallOptions,
  warnings: SharedV4Warning[]
): WireRequest {

  const system: string[] = []
  const messages: { role: string; content: string }[] = []
  let dropped = 0

  for (const message of options.prompt) {
    if (message.role === 'system') {
      system.push(message.content)
      continue
    }
    if (typeof message.content === 'string') {
      messages.push({ role: message.role, content: message.content })
      continue
    }
    const text: string[] = []
    for (const part of message.content) {
      if (part.type === 'text') text.push(part.text)
      else dropped += 1
    }
    messages.push({ role: message.role, content: text.join('') })
  }

  dropped += options.tools?.length ?? 0
  if (dropped > 0) {
    warnings.push({
      type: 'unsupported',
      feature: 'prompt parts and tools',
      details: `${dropped} part(s) or tool(s) were left out; ` +
        'this endpoint is asked for text only.'
    })
  }

  const joined = system.join('\n\n')

  return {
    config: {
      workingDir: process.cwd(),
      date: new Date().toISOString().slice(0, 10),
      environment: process.platform,
      structure: [],
      isGitRepo: false,
      currentBranch: '',
      mainBranch: '',
      gitStatus: '',
      recentCommits: []
    },
    memory: null,
    taste: null,
    skills: null,
    permissionMode: 'standard',
    threadId: randomUUID(),
    params: {
      model: modelId,
      messages,
      // The blank system prompt is deliberate: an empty string is read as
      // "no instructions" and the service substitutes its own.
      system: joined === '' ? ' ' : joined,
      max_tokens: options.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
      ...(options.temperature === undefined
        ? {}
        : { temperature: options.temperature }),
      ...(options.stopSequences === undefined
        ? {}
        : { stop: options.stopSequences }),
      stream: true
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Answer                                                                      */
/* -------------------------------------------------------------------------- */

/** The stop words this endpoint uses, in the ones the AI SDK unifies. */
const FINISH_REASONS: Record<string, LanguageModelV4FinishReason['unified']> = {
  stop: 'stop',
  end_turn: 'stop',
  stop_sequence: 'stop',
  length: 'length',
  max_tokens: 'length',
  max_output_tokens: 'length',
  model_context_window_exceeded: 'length',
  tool_calls: 'tool-calls',
  'tool-calls': 'tool-calls',
  tool_use: 'tool-calls',
  content_filter: 'content-filter',
  error: 'error',
  upstream_error: 'error'
}

function toFinishReason(event: CommandCodeEvent): LanguageModelV4FinishReason {
  const raw = event.rawFinishReason ?? event.finishReason
  return {
    unified:
      raw === undefined || !Object.hasOwn(FINISH_REASONS, raw)
        ? 'other'
        : FINISH_REASONS[raw],
    raw
  }
}

/**
 * The tokens the endpoint charged the request for. What it does not report is
 * left undefined rather than zeroed: a number this provider never had is not a
 * request that cost nothing.
 */
function toUsage(
  reportedUsage: z.infer<typeof Usage> | undefined
): LanguageModelV4Usage {

  const details = reportedUsage?.inputTokenDetails
  const output = reportedUsage?.outputTokenDetails

  return {
    inputTokens: {
      total: reportedUsage?.inputTokens,
      noCache: details?.noCacheTokens,
      cacheRead: details?.cacheReadTokens,
      cacheWrite: details?.cacheWriteTokens
    },
    outputTokens: {
      total: reportedUsage?.outputTokens,
      text: output?.textTokens,
      reasoning: output?.reasoningTokens
    }
  }
}

/** What the endpoint says went wrong, in its own words where it gives them. */
function eventError(event: CommandCodeEvent): Error {
  const message = event.error?.message ?? event.message
  if (message === undefined || message === '') {
    return transportError(
      'CommandCode reported an error',
      'no message given')
  }
  return callError(
    message,
    COMMANDCODE_BASE_URL,
    event.error?.statusCode ?? undefined,
    event.error)
}

/* -------------------------------------------------------------------------- */
/* Answer stream                                                               */
/* -------------------------------------------------------------------------- */

/**
 * One decoded event, or nothing for a line that carries none: a keepalive, a
 * comment, the terminator a stream ends with, or a frame of an SSE stream that
 * has no data. A line that is none of those and is not an event is a stream
 * this reader has lost its place in, and is refused rather than skipped,
 * because everything after it would be read as though it were the next thing
 * the model said.
 */
function parseEvent(
  line: string,
  url: string
): CommandCodeEvent | undefined {

  const trimmed = line.trim()
  if (trimmed === '' || trimmed.startsWith(':')) return undefined

  const payload = trimmed.startsWith('data:')
    ? trimmed.slice('data:'.length).trim()
    : trimmed
  if (payload === '' || payload === '[DONE]') return undefined

  const parsed = Event.safeParse(JSON.parse(payload) as unknown)
  if (!parsed.success) {
    throw callError(
      `CommandCode sent a line that is not an event: ` +
        `${trimmed.slice(0, 200)}`,
      url,
      undefined,
      undefined,
      parsed.error)
  }
  return parsed.data
}

function eventStream(
  body: ReadableStream<Uint8Array>,
  url: string
): ReadableStream<CommandCodeEvent> {

  const decoder = new TextDecoder()
  let buffered = ''

  return body.pipeThrough(
    new TransformStream<Uint8Array, CommandCodeEvent>({
      transform(chunk, controller) {
        buffered += decoder.decode(chunk, { stream: true })
        let newline = buffered.indexOf('\n')
        while (newline >= 0) {
          const event = parseEvent(buffered.slice(0, newline), url)
          buffered = buffered.slice(newline + 1)
          if (event !== undefined) controller.enqueue(event)
          newline = buffered.indexOf('\n')
        }
      },
      flush(controller) {
        const event = parseEvent(buffered, url)
        if (event !== undefined) controller.enqueue(event)
      }
    })
  )
}

/* -------------------------------------------------------------------------- */
/* Model                                                                       */
/* -------------------------------------------------------------------------- */

const TEXT_ID = '0'
const REASONING_ID = 'r0'

class CommandCodeLanguageModel implements LanguageModelV4 {

  readonly specificationVersion = 'v4' as const
  readonly modelId: string
  /** This endpoint takes text, so it supports no URL patterns. */
  readonly supportedUrls = {}

  private readonly settings: CommandCodeSettings

  constructor(modelId: string, settings: CommandCodeSettings) {
    this.modelId = modelId
    this.settings = settings
  }

  get provider(): string {
    return 'commandcode.generate'
  }

  /**
   * Asks the endpoint for one answer. Every request streams: this endpoint has
   * no non-streaming form any client has demonstrated, so this resolves once
   * the answer has started and hands back the events still to read.
   */
  private async send(
    options: LanguageModelV4CallOptions,
    warnings: SharedV4Warning[]
  ): Promise<{
    stream: ReadableStream<CommandCodeEvent>
    request: WireRequest
    url: string
  }> {

    const request = toWire(this.modelId, options, warnings)
    const url = `${this.settings.baseUrl.replace(/\/+$/, '')}${GENERATE_PATH}`

    const response = await (this.settings.fetch ?? fetch)(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
        authorization: `Bearer ${this.settings.apiKey}`,
        'x-command-code-version': COMMANDCODE_CLI_VERSION,
        'x-cli-environment': 'production',
        ...this.settings.headers,
        ...options.headers
      },
      body: JSON.stringify(request),
      ...(options.abortSignal === undefined
        ? {}
        : { signal: options.abortSignal })
    })

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => undefined)
      const refusal = Refusal.safeParse(body)
      throw callError(
        refusal.data?.error?.message ??
          refusal.data?.message ??
          `CommandCode refused the request with ${response.status}`,
        url,
        response.status,
        body)
    }

    if (response.body === null) {
      throw transportError(
        'CommandCode answered with no body',
        'the response carried no stream')
    }

    return { stream: eventStream(response.body, url), request, url }
  }

  async doGenerate(
    options: LanguageModelV4CallOptions
  ): Promise<LanguageModelV4GenerateResult> {

    const warnings: SharedV4Warning[] = []
    const { stream, request } = await this.send(options, warnings)
    const reader = stream.getReader()

    let text = ''
    let reasoning = ''
    let finish: CommandCodeEvent | undefined

    try {
      for (;;) {
        const next = await reader.read()
        if (next.done) break
        const event = next.value
        if (event.type === 'text-delta') text += event.text ?? ''
        else if (event.type === 'reasoning-delta') reasoning += event.text ?? ''
        else if (event.type === 'error') throw eventError(event)
        else if (event.type === 'finish') finish = event
      }
    } finally {
      reader.releaseLock()
    }

    // An answer that stops without saying why was cut off in transit. What
    // arrived is a prefix of an implementation rather than one.
    if (finish === undefined) {
      throw transportError(
        'the CommandCode stream ended without a finish event',
        'the answer was truncated in transit')
    }

    const content: LanguageModelV4GenerateResult['content'] = []
    if (reasoning !== '') content.push({ type: 'reasoning', text: reasoning })
    if (text !== '') content.push({ type: 'text', text })

    return {
      content,
      finishReason: toFinishReason(finish),
      usage: toUsage(finish.totalUsage ?? finish.usage),
      request: { body: request },
      response: { id: undefined, timestamp: new Date() },
      warnings
    }
  }

  async doStream(
    options: LanguageModelV4CallOptions
  ): Promise<LanguageModelV4StreamResult> {

    const warnings: SharedV4Warning[] = []
    const { stream, request } = await this.send(options, warnings)

    let finishReason: LanguageModelV4FinishReason = {
      unified: 'other',
      raw: undefined
    }
    let usage: LanguageModelV4Usage | undefined
    let textOpen = false
    let reasoningOpen = false

    // Reasoning and text are one answer taking turns, and the SDK reads them
    // as blocks, so the block in progress is closed before the next opens.
    const closeReasoning = (
      controller: TransformStreamDefaultController<LanguageModelV4StreamPart>
    ): void => {
      if (!reasoningOpen) return
      controller.enqueue({ type: 'reasoning-end', id: REASONING_ID })
      reasoningOpen = false
    }

    const closeText = (
      controller: TransformStreamDefaultController<LanguageModelV4StreamPart>
    ): void => {
      if (!textOpen) return
      controller.enqueue({ type: 'text-end', id: TEXT_ID })
      textOpen = false
    }

    return {
      stream: stream.pipeThrough(
        new TransformStream<CommandCodeEvent, LanguageModelV4StreamPart>({
          start(controller) {
            controller.enqueue({ type: 'stream-start', warnings })
          },
          transform(event, controller) {
            if (event.type === 'text-delta') {
              closeReasoning(controller)
              if (!textOpen) {
                controller.enqueue({ type: 'text-start', id: TEXT_ID })
                textOpen = true
              }
              controller.enqueue({
                type: 'text-delta',
                id: TEXT_ID,
                delta: event.text ?? ''
              })
            } else if (event.type === 'reasoning-delta') {
              closeText(controller)
              if (!reasoningOpen) {
                controller.enqueue({
                  type: 'reasoning-start',
                  id: REASONING_ID
                })
                reasoningOpen = true
              }
              controller.enqueue({
                type: 'reasoning-delta',
                id: REASONING_ID,
                delta: event.text ?? ''
              })
            } else if (event.type === 'error') {
              finishReason = { unified: 'error', raw: undefined }
              controller.enqueue({ type: 'error', error: eventError(event) })
            } else if (event.type === 'finish') {
              finishReason = toFinishReason(event)
              usage = toUsage(event.totalUsage ?? event.usage)
            }
          },
          flush(controller) {
            closeReasoning(controller)
            closeText(controller)
            controller.enqueue({
              type: 'finish',
              // A stream that ended without saying why has charged nothing
              // this engine can account for, and has not finished either.
              usage: usage ?? toUsage(undefined),
              finishReason:
                usage === undefined
                  ? { unified: 'other', raw: undefined }
                  : finishReason
            })
          }
        })
      ),
      request: { body: request }
    }
  }
}

/**
 * The provider, in the shape the other providers here are called: a model id
 * in, the model that speaks for it out.
 */
export function createCommandCode(
  settings: CommandCodeSettings
): (modelId: string) => LanguageModelV4 {

  return (modelId: string): LanguageModelV4 =>
    new CommandCodeLanguageModel(modelId, settings)
}
