/**
 * What this project is built with.
 *
 * A project's tech stack is written by hand, in `tech-stack.md`, and this stage
 * turns it into the two things the rest of the build needs: the extensions
 * that carry the conventions for it, and the libraries its source depends on.
 *
 * The work is a reading of a document against a catalogue rather than a
 * generation, so it is asked of a session that can look at the extensions on
 * offer and say which apply — and that is given no way to change anything,
 * because what comes back is merged into a record rather than written out.
 */

import { IntentError } from '@/core/errors.js'
import fs from 'fs'
import type { NodeContent, SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { BuildData } from '@/types/build-types.js'
import { IntentCodeAiTasks } from '@/core/ai/model.js'
import { SourceNodeGenerationData } from '@/types/source-graph-types.js'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service.js'
import { IntentCodeGraphMutateService } from '@/services/graphs/intentcode/graph-mutate-service.js'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service.js'
import { PiService } from '@/services/ai/pi-service.js'
import { ProjectsQueryService } from '@/services/projects/query-service.js'
import { TechStackQueryService } from './query-service.js'

/** Whether a JSON value is an object whose keys can be written to. */
function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' &&
    Array.isArray(value) === false
}

/** The extensions and deps a session reported, merged into what is recorded. */
function mergeIntoDepsJson(
  existing: NodeContent | null,
  reported: NodeContent): NodeContent {

  const depsJson: NodeContent = existing ?? {}

  const extensions =
    isJsonObject(depsJson.extensions) ? depsJson.extensions : {}

  const reportedExtensions = isJsonObject(reported.extensions)
    ? reported.extensions
    : {}

  for (const [key, value] of Object.entries(reportedExtensions)) {
    extensions[key] = value
  }
  depsJson.extensions = extensions

  const source = isJsonObject(depsJson.source) ? depsJson.source : {}
  const deps = isJsonObject(source.deps) ? source.deps : {}

  const reportedSource = isJsonObject(reported.source) ? reported.source : {}
  const reportedDeps = isJsonObject(reportedSource.deps)
    ? reportedSource.deps
    : {}

  for (const [key, value] of Object.entries(reportedDeps)) {
    deps[key] = value
  }
  source.deps = deps
  depsJson.source = source

  return depsJson
}

// Services
const dependenciesMutateService = new DependenciesMutateService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const piService = new PiService()
const projectsQueryService = new ProjectsQueryService()
const techStackQueryService = new TechStackQueryService()

// Class
export class TechStackMutateService {

  // Consts
  clName = 'TechStackMutateService'

  // Code
  async processTechStack(
          store: ProjectStore,
          buildData: BuildData,
          projectNode: SourceNodeRecord) {

    // Get ProjectDetails
    const projectDetails =
      projectsQueryService.getProjectDetailsByProjectId(
        projectNode.projectId,
        buildData.projects)

    // Get tech-stack.md
    const { techStackFilename } = await
      techStackQueryService.getFilename(projectDetails)

    if (techStackFilename == null) return

    // Read the document
    const techStack = fs.readFileSync(
      techStackFilename,
      { encoding: 'utf8', flag: 'r' })

    // Record the file against the project, so the graph holds what the stack
    // was when it was read.
    await intentCodePathGraphMutateService.upsertIntentCodePathAsGraph(
      store,
      projectDetails.projectIntentCodeNode,
      techStackFilename,
      techStack)

    // The extensions on offer, so the answer names ones that exist
    const extensionsPrompting =
      buildData.extensionsData.extensionNodes
        .map((extensionNode) => {
          const jsonContent = extensionNode.jsonContent
          if (jsonContent == null) return null
          return `- ${String(jsonContent.id)} ` +
                 `(${String(jsonContent.name)}): ` +
                 `${String(jsonContent.version)}`
        })
        .filter((line) => line != null)
        .join('\n')

    // Ask
    const prompt =
      `This project states its tech stack:\n` +
      `\n` +
      `\`\`\`\n${techStack}\`\`\`\n` +
      `\n` +
      `Name the extensions and the libraries it implies.\n` +
      `\n` +
      `The extensions available are:\n${extensionsPrompting}\n\n` +
      `Reply with JSON only, in this shape:\n` +
      `{"extensions": {"<extension id>": "<min version>"}, ` +
      `"source": {"deps": {"<package>": "<min version>"}}}\n` +
      `\n` +
      `List an extension only if it is in the list above. Give a library ` +
      `only if the stack clearly calls for it.`

    const { modelId, text } = await piService.cachedRequest(store, {
      cwd: projectDetails.project.path,
      aiTask: IntentCodeAiTasks.compiler,
      prompt,
      // Reading only: what comes back is merged into a record, so the session
      // has no reason to be able to write.
      tools: {
        toolNames: ['read'],
        restrict: true
      }
    })

    // The reply is JSON inside whatever prose the model wrapped it in
    const reported = this.parseJson(text)

    if (reported == null) {
      console.log(`Could not read the tech stack: no JSON in the reply.`)
      return
    }

    // Record it
    const sourceNodeGenerationData: SourceNodeGenerationData = {
      modelId,
      prompt
    }

    await this.processQueryResults(
      store,
      projectNode,
      projectDetails.projectIntentCodeNode,
      reported,
      sourceNodeGenerationData)
  }

  async processQueryResults(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          projectIntentCodeNode: SourceNodeRecord,
          reported: NodeContent,
          sourceNodeGenerationData: SourceNodeGenerationData) {

    // Debug
    const fnName = `${this.clName}.processQueryResults()`

    // Validate
    if (projectIntentCodeNode == null) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: projectIntentCodeNode == null`
      })
    }

    // Update DepsNode and write it to .intentcode/deps.json
    if (reported.extensions != null || reported.source != null) {

      const depsNode = await
              dependenciesMutateService.getOrCreateDepsNode(
                store,
                projectNode)

      // Merged rather than replaced: a deps key the session did not mention
      // has to survive.
      depsNode.jsonContent = mergeIntoDepsJson(
        depsNode.jsonContent,
        reported)

      await dependenciesMutateService.updateDepsNode(
        store,
        projectNode,
        depsNode,
        true)  // writeToDepsJson
    }

    // Upsert the tech-stack.json node
    await intentCodeGraphMutateService.upsertTechStackJson(
      store,
      projectIntentCodeNode.projectId,
      projectIntentCodeNode,  // parentNode
      reported,
      sourceNodeGenerationData,
      new Date())
  }

  /**
   * The outermost JSON object in a reply. Models wrap JSON in a fence or in a
   * sentence of prose, and neither is worth failing a build over.
   */
  private parseJson(text: string): NodeContent | null {

    const start = text.search(/[[{]/)
    const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))

    if (start < 0 || end <= start) return null

    try {
      const parsed: unknown = JSON.parse(text.slice(start, end + 1))
      return isJsonObject(parsed) ? parsed : null
    } catch {
      return null
    }
  }
}
