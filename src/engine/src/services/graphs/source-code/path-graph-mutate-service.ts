import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { FsUtilsService } from '../../utils/fs-utils-service.js'
import { SourceCodeGraphMutateService } from './graph-mutate-service.js'
import { SourceNodeGenerationData } from '@/types/source-graph-types.js'

// Services
const fsUtilsService = new FsUtilsService()
const sourceCodeGraphMutateService = new SourceCodeGraphMutateService()

// Class
export class SourceCodePathGraphMutateService {

  // Consts
  clName = 'SourceCodePathGraphMutateService'

  // Code
  async upsertSourceCodePathAsGraph(
          store: ProjectStore,
          projectSourceNode: SourceNodeRecord,
          fullPath: string,
          content: string,
          sourceNodeGenerationData: SourceNodeGenerationData) {

    // Debug
    const fnName = `${this.clName}.upsertSourceCodePathAsGraph()`

    // Get project source path
    const jsonContent = projectSourceNode.jsonContent
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
    let dirSourceNode: SourceNodeRecord = projectSourceNode

    for (const dir of dirs) {

      dirSourceNode = await
        sourceCodeGraphMutateService.getOrCreateSourceCodeDir(
          store,
          projectSourceNode.projectId,
          dirSourceNode,
          dir)
    }

    // Get/create nodes for the filename
    const filenameSourceNode = await
            sourceCodeGraphMutateService.upsertSourceCodeFile(
              store,
              projectSourceNode.projectId,
              dirSourceNode,
              filename,
              content,
              sourceNodeGenerationData)

    // Return filename's node
    return filenameSourceNode
  }
}
