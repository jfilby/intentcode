import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { FsUtilsService } from '../../utils/fs-utils-service.js'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const fsUtilsService = new FsUtilsService()

// Class
export class SourceCodePathGraphQueryService {

  // Consts
  clName = 'SourceCodePathGraphQueryService'

  // Code
  async getLatestSourceCodeGenerationByPathGraph(
          store: ProjectStore,
          projectSourceNode: SourceNodeRecord,
          fullPath: string) {

    // Debug
    const fnName = `${this.clName}.getLatestSourceCodeGenerationByPathGraph()`

    // Get the source code node
    const sourceCodeNode = await
            this.getSourceCodePathAsGraph(
              store,
              projectSourceNode,
              fullPath)

    // Validate
    if (sourceCodeNode == null) {

      // console.log(`${fnName}: sourceCodeNode == null`)
      return null
    }

    // Get latest SourceCodeGeneration
    const sourceCodeNodeGenerations = await
            sourceNodeGenerationModel.getLatestForSourceNodeId(
              store,
              1,  // count
              sourceCodeNode.id)

    // Validate
    if (sourceCodeNodeGenerations.length === 0) {

      console.log(`${fnName}: no sourceCodeNodeGenerations found`)
      return null
    }

    // Return
    return sourceCodeNodeGenerations[0]
  }

  async getSourceCodePathAsGraph(
          store: ProjectStore,
          projectSourceNode: SourceNodeRecord,
          fullPath: string) {

    // Debug
    const fnName = `${this.clName}.getSourceCodePathAsGraph()`

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
    var sourceCodeDir: SourceNodeRecord = projectSourceNode

    for (const dir of dirs) {

      // Try to get the dir node
      const found = await
        sourceNodeModel.getByUniqueKey(
          store,
          sourceCodeDir.id,
          projectSourceNode.projectId,
          SourceNodeTypes.sourceCodeDir,
          dir)

      if (found == null) {

        throw new IntentError({
          category: 'StorageError',
          stage: fnName,
          message: `${fnName}: no source code dir node for dir: ${dir}`,
          detail: `under the node ${sourceCodeDir.id}`
        })
      }

      sourceCodeDir = found
    }

    // Try to get the node
    const sourceCodeFile = await
            sourceNodeModel.getByUniqueKey(
              store,
              sourceCodeDir.id,  // parentId
              projectSourceNode.projectId,
              SourceNodeTypes.sourceCodeFile,
              filename)

    // Return filename's node
    return sourceCodeFile
  }
}
