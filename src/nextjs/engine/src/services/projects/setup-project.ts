import fs from 'fs'
import path from 'path'
import { blake3 } from '@noble/hashes/blake3'
import { Instance, PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { DependenciesMutateService } from '../graphs/dependencies/mutate-service'
import { DepsJsonService } from '../managed-files/deps/deps-json-service'
import { DotIntentCodeGraphMutateService } from '../graphs/dot-intentcode/graph-mutate-service'
import { ExtensionMutateService } from '../extensions/extension/mutate-service'
import { IntentCodeGraphMutateService } from '../graphs/intentcode/graph-mutate-service'
import { ProjectGraphMutateService } from '../graphs/project/mutate-service'
import { SourceCodeGraphMutateService } from '../graphs/source-code/graph-mutate-service'
import { SpecsGraphMutateService } from '../graphs/specs/graph-mutate-service'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const dependenciesMutateService = new DependenciesMutateService()
const depsJsonService = new DepsJsonService()
const dotIntentCodeGraphMutateService = new DotIntentCodeGraphMutateService()
const extensionMutateService = new ExtensionMutateService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const projectGraphMutateService = new ProjectGraphMutateService()
const sourceCodeGraphMutateService = new SourceCodeGraphMutateService()
const specsGraphMutateService = new SpecsGraphMutateService()

// Class
export class ProjectSetupService {

  // Consts
  clName = 'ProjectSetupService'

  // Code
  async loadConfigFiles(
          prisma: PrismaClient,
          projectNode: SourceNode,
          configPath: string) {

    // Create the path if it doesn't exist
    fs.mkdirSync(configPath, { recursive: true })

    // Load deps config file
    await this.loadDepsConfigFile(
            prisma,
            projectNode,
            configPath)
  }

  async loadDepsConfigFile(
          prisma: PrismaClient,
          projectNode: SourceNode,
          configPath: string) {

    // Debug
    const fnName = `${this.clName}.loadDepsConfigFile()`

    // Read and validate deps.json file
    const { found, data, filename } = await
            depsJsonService.readFile(
              prisma,
              projectNode)

    // Get/create Deps node
    var depsNode = await
          dependenciesMutateService.getOrCreateDepsNode(
            prisma,
            projectNode)

    // Prep depsNode for key/values
    if (depsNode.jsonContent == null) {
      depsNode.jsonContent = {}
    }

    // Load in depsJson for valid keys only
    if (data != null) {

      for (const [key, value] of Object.entries(data)) {

        // Load key/value
        depsNode.jsonContent[key] = value
      }
    }

    // Get jsonContentHash
    depsNode.jsonContentHash =
      blake3(JSON.stringify(depsNode.jsonContent)).toString()

    // Update DepsNode's jsonContent
    depsNode = await
      sourceNodeModel.setJsonContent(
        prisma,
        depsNode.id,
        depsNode.jsonContent,
        depsNode.jsonContentHash)

    // Load in extensions from System
    if (depsNode.jsonContent?.extensions != null) {

      console.log(`Loading extensions specified in ${filename}..`)

      await extensionMutateService.loadExtensionsInSystemToUserProjectByMap(
              prisma,
              projectNode.instanceId,
              depsNode.jsonContent.extensions)
    }
  }

  async setupProject(
          prisma: PrismaClient,
          instance: Instance,
          projectName: string,
          projectPath: string) {

    // Get/create project node
    const projectNode = await
            projectGraphMutateService.getOrCreateProject(
              prisma,
              instance.id,
              projectName,
              projectPath)

    // Infer other paths
    const dotIntentCodePath = `${projectPath}${path.sep}.intentcode`
    const intentPath = `${projectPath}${path.sep}intent`
    const srcPath = `${projectPath}${path.sep}src`
    const specsPath = `${projectPath}${path.sep}specs`

    // Get/create specs project node
    if (await fs.existsSync(specsPath)) {

      const projectSpecsNode = await
              specsGraphMutateService.getOrCreateSpecsProject(
                prisma,
                projectNode,
                specsPath)
    }

    // Get/create dotIntentCode node
    const projectDotIntentCodeNode = await
            dotIntentCodeGraphMutateService.getOrCreateDotIntentCodeProject(
              prisma,
              projectNode,
              dotIntentCodePath)

    // Get/create IntentCode project node
    if (await fs.existsSync(intentPath)) {

      const projectIntentCodeNode = await
              intentCodeGraphMutateService.getOrCreateIntentCodeProject(
                prisma,
                projectNode,
                intentPath)
    }

    // Get/create source code project node
    if (await fs.existsSync(intentPath) ||
        await fs.existsSync(srcPath)) {

      const projectSourceCodeNode = await
              sourceCodeGraphMutateService.getOrCreateSourceCodeProject(
                prisma,
                projectNode,
                srcPath)
    }

    // Get/create extensions node
    const extensionsNode = await
            extensionMutateService.getOrCreateExtensionsNode(
              prisma,
              instance.id)

    // Load project-level config files
    if (await fs.existsSync(dotIntentCodePath)) {

      await this.loadConfigFiles(
              prisma,
              projectNode,
              dotIntentCodePath)
    }

    // Return
    return projectNode
  }
}
