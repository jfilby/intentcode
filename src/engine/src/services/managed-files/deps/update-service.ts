import { PrismaClient, SourceNode } from '@prisma/client'
import { BuildData } from '@/types/build-types'
import { ExtensionsData } from '@/types/source-graph-types'
import { ExtensionMutateService } from '@/services/extensions/extension/mutate-service'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service'
import { ProjectSetupService } from '@/services/projects/setup-project'
import { SourceDepsFileService } from './source-deps-service'

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
    extensionName: string,
    extensionsData: ExtensionsData) {

    for (const extensionNode of extensionsData.extensionNodes) {

      if ((extensionNode.jsonContent as any).id === extensionName) {
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

    // Iterate project extensions (from project graph)
    for (const extensionNode of extensionsData.extensionNodes) {

      // Check if extension in depsNode
      var inDepsNode = false

      for (const [name, version] of Object.entries(depsNodeExtensions)) {

        if (this.checkExtensionInExtensionsData(
          name,
          extensionsData)) {

          inDepsNode = true
        }
      }

      // If extension not in depsNode delete it
      await extensionMutateService.deleteExtension(
        prisma,
        extensionNode.id)
    }
  }

  async loadExtensionsFromDepsNode(
    prisma: PrismaClient,
    projectNode: SourceNode,
    extensionsData: ExtensionsData,
    depsNodeExtensions: any) {

    // Validate
    if (Array.isArray(depsNodeExtensions)) {

      console.error(`Extensions from deps.json isn't a map`)
      process.exit(1)
    }

    // Iterate depsNode extensions
    for (const [name, version] of Object.entries(depsNodeExtensions)) {

      if (!this.checkExtensionInExtensionsData(
        name,
        extensionsData)) {

        // Load extension into project
        await extensionMutateService.loadExtensionsInSystemToUserProject(
          prisma,
          projectNode.instanceId,
          [name])
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

    // Try to load any extensions not in the project
    if ((depsNode?.jsonContent as any)?.extensions != null) {

      await this.loadExtensionsFromDepsNode(
        prisma,
        projectNode,
        projectExtensionsData,
        (depsNode?.jsonContent as any)?.extensions)
    }

    // Try to delete any extensions not in the new depsNode
    await this.deleteExtensionsNotInDepsNode(
      prisma,
      projectNode,
      projectExtensionsData,
      depsNode)
  }
}
