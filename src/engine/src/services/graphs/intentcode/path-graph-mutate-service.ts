import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { FsUtilsService } from '../../utils/fs-utils-service.js'
import { IntentCodeGraphMutateService } from './graph-mutate-service.js'
import { IntentCodeGraphQueryService } from './graph-query-service.js'

// Services
const fsUtilsService = new FsUtilsService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const intentCodeGraphQueryService = new IntentCodeGraphQueryService()

// Class
export class IntentCodePathGraphMutateService {

  // Consts
  clName = 'IntentCodePathGraphMutateService'

  // Code
  async deleteIntentCodePathAsGraph(
          store: ProjectStore,
          projectIntentCodeNode: SourceNodeRecord,
          fullPath: string) {

    // Debug
    const fnName = `${this.clName}.deleteIntentCodePathAsGraph()`

    // console.log(`${fnName}: fullPath: ${fullPath}`)

    // Get project source path
    const jsonContent = projectIntentCodeNode.jsonContent
    const projectSourcePath =
      jsonContent != null &&
      typeof jsonContent === 'object' &&
      'path' in jsonContent &&
      typeof jsonContent.path === 'string'
        ? jsonContent.path
        : undefined

    // Validate project path
    if (projectSourcePath == null ||
        !fsUtilsService.isPathWithin(fullPath, projectSourcePath)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: Invalid path: ${fullPath} for project source ` +
          `node: ${projectSourcePath}`
      })
    }

    // Strip project path from fullPath prefix
    // The fullPath must have been verified as starting with the project path
    const relativePath = fullPath.slice(projectSourcePath.length)

    // Split up dirs and filename
    const filename = fsUtilsService.getFilenamePart(relativePath)
    const dirsPath = fsUtilsService.getDirectoriesPart(relativePath)
    const dirs = fsUtilsService.getDirectoriesArray(dirsPath)

    // Debug
    // console.log(`${fnName}: relativePath: ${relativePath}`)
    // console.log(`${fnName}: dirsPath: ${dirsPath}`)
    // console.log(`${fnName}: dirs: ${dirs}`)

    // Get/create nodes for dirs. A dir that is not in the graph means the
    // file below it was never written, so there is nothing to delete.
    var dirSourceNode: SourceNodeRecord | null = projectIntentCodeNode

    for (const dir of dirs) {

      dirSourceNode = await
        intentCodeGraphQueryService.getIntentCodeDir(
          store,
          projectIntentCodeNode.projectId,
          dirSourceNode,
          dir)

      if (dirSourceNode == null) {
        return
      }
    }

    // Get/create nodes for the filename
    await intentCodeGraphMutateService.deleteIntentCodeFile(
      store,
      projectIntentCodeNode.projectId,
      dirSourceNode,
      filename)
  }

  async upsertIntentCodePathAsGraph(
          store: ProjectStore,
          projectIntentCodeNode: SourceNodeRecord,
          fullPath: string,
          content?: string) {

    // Debug
    const fnName = `${this.clName}.upsertIntentCodePathAsGraph()`

    // console.log(`${fnName}: fullPath: ${fullPath}`)

    // Get project source path
    const jsonContent = projectIntentCodeNode.jsonContent
    const projectSourcePath =
      jsonContent != null &&
      typeof jsonContent === 'object' &&
      'path' in jsonContent &&
      typeof jsonContent.path === 'string'
        ? jsonContent.path
        : undefined

    // Validate project path
    if (projectSourcePath == null ||
        !fsUtilsService.isPathWithin(fullPath, projectSourcePath)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: Invalid path: ${fullPath} for project source ` +
          `node: ${projectSourcePath}`
      })
    }

    // Strip project path from fullPath prefix
    // The fullPath must have been verified as starting with the project path
    const relativePath = fullPath.slice(projectSourcePath.length)

    // Split up dirs and filename
    const filename = fsUtilsService.getFilenamePart(relativePath)
    const dirsPath = fsUtilsService.getDirectoriesPart(relativePath)
    const dirs = fsUtilsService.getDirectoriesArray(dirsPath)

    // Debug
    // console.log(`${fnName}: relativePath: ${relativePath}`)
    // console.log(`${fnName}: dirsPath: ${dirsPath}`)
    // console.log(`${fnName}: dirs: ${dirs}`)

    // Get/create nodes for dirs
    var dirSourceNode: SourceNodeRecord = projectIntentCodeNode

    for (const dir of dirs) {

      dirSourceNode = await
        intentCodeGraphMutateService.getOrCreateIntentCodeDir(
          store,
          projectIntentCodeNode.projectId,
          dirSourceNode,
          dir)
    }

    // Get/create nodes for the filename
    const filenameSourceNode = await
            intentCodeGraphMutateService.upsertIntentCodeFile(
              store,
              projectIntentCodeNode.projectId,
              dirSourceNode,
              filename,
              relativePath,
              content)

    // Return filename's node
    return filenameSourceNode
  }
}
