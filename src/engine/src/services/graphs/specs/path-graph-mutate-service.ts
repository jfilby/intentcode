import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { FsUtilsService } from '../../utils/fs-utils-service.js'
import { SpecsGraphMutateService } from './graph-mutate-service.js'

// Services
const fsUtilsService = new FsUtilsService()
const specsGraphMutateService = new SpecsGraphMutateService()

// Class
export class SpecsPathGraphMutateService {

  // Consts
  clName = 'SpecsPathGraphMutateService'

  // Code
  async getOrCreateSpecsPathAsGraph(
          store: ProjectStore,
          projectSpecsNode: SourceNodeRecord,
          fullPath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSpecsPathAsGraph()`

    // Get project source path
    const jsonContent = projectSpecsNode.jsonContent
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
    let dirSourceNode: SourceNodeRecord = projectSpecsNode

    for (const dir of dirs) {

      dirSourceNode = await
        specsGraphMutateService.getOrCreateSpecsDir(
          store,
          projectSpecsNode.projectId,
          dirSourceNode,
          dir)
    }

    // Get/create nodes for the filename
    const filenameSourceNode = await
            specsGraphMutateService.getOrCreateSpecsFile(
              store,
              projectSpecsNode.projectId,
              dirSourceNode,
              filename,
              relativePath)

    // Return filename's node
    return filenameSourceNode
  }
}
