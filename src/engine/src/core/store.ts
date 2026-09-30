/**
 * A project's store.
 *
 * Everything the engine derives for a project lives under `<project>/.intent/`
 * and is disposable: deleting the directory loses the graph, the chats and the
 * cached replies, and nothing that was written by hand. The project itself is
 * the `intent.toml` beside it, which is the only file a user has to keep.
 *
 * A store is created for a project root and is not shared between projects,
 * so a record name can never name another project's data. The engine's own
 * bundled extensions are read from the engine directory and written into a
 * project like any other extension, so no state of the engine's own is kept
 * outside a project.
 */

import { join } from 'node:path'
import { createCollection, type Collection } from './collection.js'
import { IntentError } from './errors.js'
import { createJsonStore, type JsonStore } from './json-store.js'
import type {
  AgentUserRecord,
  ChatMessageRecord,
  ChatParticipantRecord,
  ChatSessionWithSettings,
  ChatSettingsRecord,
  LlmCacheRecord,
  SourceEdgeWithRelations,
  SourceNodeGenerationRecord,
  SourceNodeWithRelations
} from './records.js'

/** The directory a project's derived state lives in. */
export const STATE_DIRECTORY = '.intent'

/** The file that makes a directory a project. */
export const PROJECT_CONFIG_FILE = 'intent.toml'

export interface ProjectStore {
  /** The absolute project root: the directory holding intent.toml. */
  readonly projectPath: string
  /** The absolute `.intent` directory. */
  readonly statePath: string
  readonly files: JsonStore

  readonly sourceNodes: Collection<SourceNodeWithRelations>
  readonly sourceEdges: Collection<SourceEdgeWithRelations>
  readonly sourceNodeGenerations: Collection<SourceNodeGenerationRecord>
  readonly chatSettings: Collection<ChatSettingsRecord>
  readonly chatSessions: Collection<ChatSessionWithSettings>
  readonly chatParticipants: Collection<ChatParticipantRecord>
  readonly chatMessages: Collection<ChatMessageRecord>
  readonly agents: Collection<AgentUserRecord>
  readonly llmCache: Collection<LlmCacheRecord>
}

export function createProjectStore(projectPath: string): ProjectStore {

  const statePath = join(projectPath, STATE_DIRECTORY)
  const files = createJsonStore(statePath)

  const sourceNodes = createCollection<SourceNodeWithRelations>(
    files, 'source node', 'graph/source-nodes.json')
  const sourceEdges = createCollection<SourceEdgeWithRelations>(
    files, 'source edge', 'graph/source-edges.json')
  const sourceNodeGenerations =
    createCollection<SourceNodeGenerationRecord>(
      files, 'source node generation', 'graph/generations.json')
  const chatSettings = createCollection<ChatSettingsRecord>(
    files, 'chat settings', 'chat/settings.json')
  const chatSessions = createCollection<ChatSessionWithSettings>(
    files, 'chat session', 'chat/sessions.json')
  const chatParticipants = createCollection<ChatParticipantRecord>(
    files, 'chat participant', 'chat/participants.json')
  const chatMessages = createCollection<ChatMessageRecord>(
    files, 'chat message', 'chat/messages.json')
  const agents = createCollection<AgentUserRecord>(
    files, 'agent', 'chat/agents.json')
  const llmCache = createCollection<LlmCacheRecord>(
    files, 'llm cache', 'cache/llm.json')

  // The relations the graph and chat services read. They resolve a record to
  // the rows it points at rather than storing the join, so a record is only
  // written when one of its own fields changes.
  sourceNodes.registerRelation('parent', async (node) => {
    if (node.parentId == null) return undefined
    return (await sourceNodes.findFirst({
      where: { id: node.parentId }
    })) ?? undefined
  })

  sourceNodes.registerRelation('children', async (node) =>
    await sourceNodes.findMany({ where: { parentId: node.id } }))

  sourceEdges.registerRelation('from', async (edge) =>
    (await sourceNodes.findFirst({ where: { id: edge.fromId } })) ?? undefined)

  sourceEdges.registerRelation('to', async (edge) =>
    (await sourceNodes.findFirst({ where: { id: edge.toId } })) ?? undefined)

  chatSessions.registerRelation('chatSettings', async (session) =>
    (await chatSettings.findFirst({
      where: { id: session.chatSettingsId }
    })) ?? undefined)

  chatSessions.registerRelation('agentUser', async (session) => {
    const settings = await chatSettings.findFirst({
      where: { id: session.chatSettingsId }
    })
    if (settings == null) return undefined
    return (await agents.findFirst({
      where: { uniqueRefId: settings.agentUniqueRefId }
    })) ?? undefined
  })

  return {
    projectPath,
    statePath,
    files,
    sourceNodes,
    sourceEdges,
    sourceNodeGenerations,
    chatSettings,
    chatSessions,
    chatParticipants,
    chatMessages,
    agents,
    llmCache
  }
}

export function requireProjectStore(
  store: ProjectStore | undefined,
  stage: string
): ProjectStore {

  if (store == null) {
    throw new IntentError({
      category: 'ProjectError',
      stage,
      message: 'no project: run this from a directory with an intent.toml, ' +
        'or pass a project path'
    })
  }
  return store
}
