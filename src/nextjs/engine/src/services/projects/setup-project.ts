import fs from 'fs'
import path from 'path'
import { blake3 } from '@noble/hashes/blake3'
import { Instance, PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { DependenciesMutateService } from '../graphs/dependencies/mutate-service'
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

    // Determine filename and read the file
    const filename = `${configPath}${path.sep}deps.json`

    // Check if the file exists
    if (fs.existsSync(filename) === false) {

      // console.log(`Deps config file doesn't exist: ${filename}`)
      // process.exit(1)
      return
    }

    // Read the file
    const depsJsonContent = fs.readFileSync(filename, 'utf-8')

    // Validate
    if (depsJsonContent == null) {
      throw new CustomError(`${fnName}: depsJsonContent == null`)
    }

    // Debug
    // console.log(`${fnName}: depsJsonContent: ${depsJsonContent}`)

    // Parse JSON
    const depsJson = JSON.parse(depsJsonContent)

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
    for (const [key, value] of Object.entries(depsJson)) {

      // Invalid key?
      if (!ServerOnlyTypes.depsNodeKeys.includes(key)) {
        console.warn(`Skipping unknown key ${key} from ${filename}`)
        continue
      }

      // Load key/value
      depsNode.jsonContent[key] = value
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

    // Get/create .intentcode project node
    if (await fs.existsSync(specsPath)) {

      const projectDotIntentCodeNode = await
              dotIntentCodeGraphMutateService.getOrCreateDotIntentCodeProject(
                prisma,
                projectNode,
                dotIntentCodePath)
    }

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
