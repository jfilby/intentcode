import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BuildData } from '@/types/build-types'
import { ExtensionsData } from '@/types/source-graph-types'
import { ExtensionMutateService } from '@/services/extensions/extension/mutate-service'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service'
import { ProjectSetupService } from '@/services/projects/setup-project'
import { SourceDepsFileService } from './source-deps-service'
import { ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types'

// Services
const extensionMutateService = new ExtensionMutateService()
const extensionQueryService = new ExtensionQueryService()
const projectSetupService = new ProjectSetupService()
const sourceDepsFileService = new SourceDepsFileService()

// Class
export class DepsUpdateService {

  // Consts
  clName = 'DepsUpdateService'

  // Code
  checkExtensionInExtensionsData(
    extensionId: string,
    extensionsData: ExtensionsData) {

    // Debug
    const fnName = `${this.clName}.checkExtensionInExtensionsData()`

    // Check every extension in the graph
    for (const extensionNode of extensionsData.extensionNodes) {

      // Debug
      // console.log(`${fnName}: checking ` +
      //   `${(extensionNode.jsonContent as any).id}`)

      // Check
      if ((extensionNode.jsonContent as any).id === extensionId) {
        return true
      }
    }

    return false
  }

  async deleteExtensionsNotInDepsNode(
    prisma: PrismaClient,
    projectNode: SourceNode,
    extensionsData: ExtensionsData,
    depsNodeExtensions: any) {

    // Debug
    const fnName = `${this.clName}.deleteExtensionsNotInDepsNode()`

    // console.log(`${fnName}: starting with depsNodeExtensions: ` +
    //   JSON.stringify(depsNodeExtensions))

    // Iterate project extensions (from project graph)
    for (const extensionNode of extensionsData.extensionNodes) {

      // Debug
      console.log(`${fnName}: checking extensionNode..`)

      // Get id
      const extensionId = (extensionNode.jsonContent as any).id

      // Check if extension in depsNode
      var inDepsNode = false

      for (const [id, version] of Object.entries(depsNodeExtensions)) {

        if (id === extensionId) {
          inDepsNode = true
        }
      }

      // If extension not in depsNode delete it
      if (inDepsNode === false) {

        // Verbose
        if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {
          console.log(`Deleting extension not in deps.json: ${extensionId}`)
        }

        // Delete
        await extensionMutateService.deleteExtension(
          prisma,
          extensionNode.id)
      }
    }
  }

  async loadExtensionsFromDepsNode(
    prisma: PrismaClient,
    projectNode: SourceNode,
    extensionsData: ExtensionsData,
    depsNodeExtensions: any) {

    // Debug
    const fnName = `${this.clName}.loadExtensionsFromDepsNode()`

    // console.log(`${fnName}: starting..`)

    // Validate
    if (Array.isArray(depsNodeExtensions)) {

      console.error(`Extensions from deps.json isn't a map`)
      process.exit(1)
    }

    // Iterate depsNode extensions
    for (const [id, version] of Object.entries(depsNodeExtensions)) {

      // Debug
      // console.log(`${fnName}: checking if ${id} is loaded..`)

      // Check if the extension exists in the graph
      if (!this.checkExtensionInExtensionsData(
        id,
        extensionsData)) {

        // Debug
        // console.log(`${fnName}: loading extensions ${id}..`)

        // Load extension into project
        await extensionMutateService.loadExtensionsInSystemToUserProject(
          prisma,
          projectNode.instanceId,
          [id])
      }
    }
  }

  async update(
    prisma: PrismaClient,
    buildData: BuildData,
    projectNode: SourceNode) {

    // Load any new extensions
    const depsNode = await
      projectSetupService.loadDepsConfigFile(
      prisma,
      projectNode)

    // Update extensions by deps file
    await this.updateExtensions(
      prisma,
      projectNode,
      depsNode)

    // Update and write the package manager file
    await sourceDepsFileService.updateAndWriteFile(
      prisma,
      buildData,
      projectNode)
  }

  async updateExtensions(
    prisma: PrismaClient,
    projectNode: SourceNode,
    depsNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.updateExtensions()`

    // Get extensions in the project
    const projectExtensionsData = await
      extensionQueryService.loadExtensions(
        prisma,
        projectNode.instanceId)

    // Validate
    if (projectExtensionsData?.extensionNodes == null) {

      console.error(`Extensions not setup for project with instanceId: ` +
        `${projectNode.instanceId}`)

      process.exit(1)
    }

    // Debug
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {

      console.log(`${fnName}: projectExtensionsData.extensionNodes: ` +
        `${projectExtensionsData.extensionNodes.length}`)
    }

    // Get depsNode extensions
    const depsNodeExtensions = (depsNode?.jsonContent as any)?.extensions

    // Try to load any extensions not in the project
    if (depsNodeExtensions != null) {

      await this.loadExtensionsFromDepsNode(
        prisma,
        projectNode,
        projectExtensionsData,
        depsNodeExtensions)
    }

    // Try to delete any extensions not in the new depsNode
    await this.deleteExtensionsNotInDepsNode(
      prisma,
      projectNode,
      projectExtensionsData,
      depsNodeExtensions)
  }
}
