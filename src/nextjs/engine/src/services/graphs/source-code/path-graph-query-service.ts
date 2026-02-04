import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { FsUtilsService } from '../../utils/fs-utils-service'

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
          prisma: PrismaClient,
          projectSourceNode: SourceNode,
          fullPath: string) {

    // Debug
    const fnName = `${this.clName}.getLatestSourceCodeGenerationByPathGraph()`

    // Get the source code node
    const sourceCodeNode = await
            this.getSourceCodePathAsGraph(
              prisma,
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
              prisma,
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
          prisma: PrismaClient,
          projectSourceNode: SourceNode,
          fullPath: string) {

    // Debug
    const fnName = `${this.clName}.getSourceCodePathAsGraph()`

    // Get project source path
    const projectSourcePath = (projectSourceNode.jsonContent as any)?.path

    // Validate project path
    if (projectSourcePath == null ||
        !fullPath.startsWith(projectSourcePath)) {

      throw new CustomError(
        `${fnName}: Invalid path: ${fullPath} for project source node: ` +
        `${projectSourcePath}`)
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
    var sourceCodeDir: SourceNode = projectSourceNode

    for (const dir of dirs) {

      if (dir.length === 0) {
        break
      }

      // Try to get the dir node
      sourceCodeDir = await
        sourceNodeModel.getByUniqueKey(
          prisma,
          sourceCodeDir.id,
          projectSourceNode.instanceId,
          SourceNodeTypes.sourceCodeDir,
          dir)
    }

    // Try to get the node
    const sourceCodeFile = await
            sourceNodeModel.getByUniqueKey(
              prisma,
              sourceCodeDir.id,  // parentId
              projectSourceNode.instanceId,
              SourceNodeTypes.sourceCodeFile,
              filename)

    // Return filename's node
    return sourceCodeFile
  }
}
