/**
 * The records the engine keeps.
 *
 * Each one is a row it used to be: a project, a node in a project's graph, a
 * generation of that node by a model, a chat, a cached reply. The engine runs
 * as a single local user, so there is no user record and nothing is owned by
 * one — a project owns everything below it.
 */

/** A project: a directory holding an `intent.toml`. */
export interface ProjectRecord {
  id: string
  /** The name in intent.toml, unique among a directory's projects. */
  name: string
  /** The stable slug intent.toml is addressed by. */
  key: string
  /** The absolute path of the directory holding intent.toml. */
  path: string
  /**
   * The System project, which holds the bundled extensions every project
   * inherits from. It has a path like any other but is never listed as a
   * project the user can build.
   */
  isSystem: boolean
  status: string
  created: string
  updated: string
}

/**
 * The structured content a node carries, as a keyed object. Every node in
 * the graph stores an object here — a path, a spec's source, a list of
 * suggestions — and every reader reaches into it by key, so it is typed as
 * one rather than as `unknown` that each reader has to narrow.
 */
export type NodeContent = Record<string, unknown>

export interface SourceNodeRecord {
  id: string
  parentId: string | null
  projectId: string
  status: string
  type: string
  name: string
  content: string | null
  contentHash: string | null
  jsonContent: NodeContent | null
  jsonContentHash: string | null
  contentUpdated: string | null
  created: string
  updated: string
}

/** A node read with `include: { parent: true }` or `include: { children }`. */
export interface SourceNodeWithRelations extends SourceNodeRecord {
  parent?: SourceNodeRecord | null
  children?: SourceNodeRecord[]
}

export interface SourceEdgeRecord {
  id: string
  fromId: string
  toId: string
  status: string
  name: string
  created: string
  updated: string
}

export interface SourceEdgeWithRelations extends SourceEdgeRecord {
  from?: SourceNodeRecord | null
  to?: SourceNodeRecord | null
}

export interface SourceNodeGenerationRecord {
  id: string
  sourceNodeId: string
  /** The model that produced the generation, e.g. `google/gemini-3.1-pro`. */
  modelId: string
  temperature: number | null
  prompt: string
  promptHash: string
  content: string | null
  contentHash: string | null
  jsonContent: NodeContent | null
  jsonContentHash: string | null
  created: string
  updated: string
}

/** One of the fixed agent identities a chat can be held with. */
export interface AgentUserRecord {
  id: string
  /** Stable across renames; the name intent.toml's chat settings refer to. */
  uniqueRefId: string
  name: string
  role: string
  maxPrevMessages: number | null
  defaultPrompt: string | null
}

/**
 * A named chat configuration: which agent answers, whether the model is asked
 * for JSON, and the prompt that frames the session.
 */
export interface ChatSettingsRecord {
  id: string
  name: string
  agentUniqueRefId: string
  isJsonMode: boolean
  prompt: string | null
  appCustom: unknown
}

export interface ChatSessionRecord {
  id: string
  chatSettingsId: string
  projectId: string | null
  status: string
  isEncryptedAtRest: boolean
  /** The external handle a saved chat is resumed by, e.g. a file name. */
  externalId: string | null
  name: string | null
  created: string
  updated: string
}

/** A session read with `include: { chatSettings, agentUser }`. */
export interface ChatSessionWithSettings extends ChatSessionRecord {
  chatSettings?: ChatSettingsRecord | null
  agentUser?: AgentUserRecord | null
}

export interface ChatParticipantRecord {
  id: string
  chatSessionId: string
  /** 'U' the local user, 'A' the agent. */
  role: string
  created: string
}

export interface ChatMessageRecord {
  id: string
  chatSessionId: string
  fromChatParticipantId: string
  toChatParticipantId: string | null
  externalId: string | null
  sentByAi: boolean
  message: string
  created: string
  updated: string
}

/** A cached model reply, keyed on the prompt and the model that answered it. */
export interface LlmCacheRecord {
  id: string
  modelId: string
  key: string
  inputMessage: string
  outputMessage: string | null
  outputJson: unknown
  created: string
}

export interface VersionRecord {
  id: string
  name: string
  version: string
}
