const NodeCache = require('node-cache')
import path from 'path'
import { select } from '@inquirer/prompts'
import { Instance, PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { InstanceModel } from '@/serene-core-server/models/instances/instance-model'
import { InstanceSettingModel } from '@/serene-core-server/models/instances/instance-setting-model'
import { UsersService } from '@/serene-core-server/services/users/service'
import { ServerTestTypes } from '@/types/server-test-types'
import { CommonCommands, InstanceSettingNames, ProjectDetails, ServerOnlyTypes } from '@/types/server-only-types'
import { BuildsGraphMutateService } from '../graphs/builds/mutate-service'
import { DotIntentCodeGraphQueryService } from '../graphs/dot-intentcode/graph-query-service'
import { FsUtilsService } from '../utils/fs-utils-service'
import { IntentCodeAnalysisGraphMutateService } from '../graphs/intentcode-analysis/mutate-service'
import { IntentCodeGraphMutateService } from '../graphs/intentcode/graph-mutate-service'
import { ProjectGraphQueryService } from '../graphs/project/query-service'
import { SourceCodeGraphMutateService } from '../graphs/source-code/graph-mutate-service'
import { SpecsGraphQueryService } from '../graphs/specs/graph-query-service'

// Cache objects must be global, to access all data (e.g. ability to delete
// an item from an object if InstanceService).
const cachedInstances = new NodeCache()
const cachedInstancesWithIncludes = new NodeCache()

// Models
const instanceModel = new InstanceModel()
const instanceSettingModel = new InstanceSettingModel()

// Services
const buildsGraphMutateService = new BuildsGraphMutateService()
const dotIntentCodeGraphQueryService = new DotIntentCodeGraphQueryService()
const fsUtilsService = new FsUtilsService()
const intentCodeAnalysisGraphMutateService = new IntentCodeAnalysisGraphMutateService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const projectGraphQueryService = new ProjectGraphQueryService()
const sourceCodeGraphMutateService = new SourceCodeGraphMutateService()
const specsGraphQueryService = new SpecsGraphQueryService()
const usersService = new UsersService()

// Class
export class ProjectsQueryService {

  // Consts
  clName = 'ProjectsQueryService'

  // Code
  getProjectDetailsByInstanceId(
    instanceId: string,
    projects: Record<number, ProjectDetails>) {

    // Debug
    const fnName = `${this.clName}.getProjectsPrompting()`

    // Find projectDetails
    for (const projectDetails of Object.values(projects)) {

      if (projectDetails.instance.id === instanceId) {
        return projectDetails
      }
    }

    // Not found
    throw new CustomError(
      `${fnName}: projectDetails not found for instanceId: ${instanceId}`)
  }

  async createProjectsList(
          prisma: PrismaClient,
          instanceId: string,
          instance: Instance | undefined,
          projects: Record<number, ProjectDetails>,
          maxProjectNo: number = 1,
          indents: number = 0) {

    // Debug
    const fnName = `${this.clName}.createProjectsList()`

    // Get instance (and add it to the map) if not known
    if (instance == null) {

      instance = await
        instanceModel.getById(
          prisma,
          instanceId)
    }

    // Validate
    if (instance == null) {
      throw new CustomError(`${fnName}: instance == null`)
    }

    // Get ProjectDetails
    const projectDetails = await
            this.createProjectDetails(
              prisma,
              indents,
              instance)

    // Add instance to the map
    projects[maxProjectNo] = projectDetails

    maxProjectNo += 1

    // Get child instances
    const childInstances = await
            instanceModel.filter(
              prisma,
              instanceId)  // parentId

    // Cascade to child instances
    for (const childInstance of childInstances) {

      await this.createProjectsList(
              prisma,
              childInstance.id,
              childInstance,
              projects,
              maxProjectNo,
              indents + 1)
    }

    // Return
    return projects
  }

  getProjectsPrompting(projects: Record<number, ProjectDetails>) {

    // Debug
    const fnName = `${this.clName}.getProjectsPrompting()`

    // Validate
    if (projects == null) {
      throw new CustomError(`${fnName}: projects == null`)
    }

    // Start prompting for projects
    var prompting =
      `## Projects\n` +
      `\n` +
      `By project no:\n` +
      `\n`

    // Debug
    // console.log(`${fnName}: projectsMap: ${projectsMap.size}`)

    // Iter projectsMap
    for (const [projectNo, projectDetails] of
         Object.entries(projects)) {

      // Add to prompting
      const indents = ' '.repeat(projectDetails.indents * 2)

      prompting +=
        `${indents}- ${projectNo}: ${projectDetails.instance.name}\n`
    }

    // Final new-line
    prompting += `\n`

    // Return
    return prompting
  }

  async getParentProjectByPath(
          prisma: PrismaClient,
          fullPath: string) {

    // Debug
    const fnName = `${this.clName}.getParentProjectByPath()`

    // Get path root
    const root = fsUtilsService.getPathRoot(fullPath)
    var curPath = fullPath

    // Debug
    // console.log(`${fnName}: root: ${root}`)
    // console.log(`${fnName}: curPath: ${curPath}`)

    // Iterate
    var i = 0

    while (curPath !== root) {

      // Get parent directory
      const parentPath = path.dirname(curPath)

      // Debug
      // console.log(`${fnName}: parentPath: ${parentPath}`)

      // Check for a project
      const instance = await
              this.getProjectByPath(
                prisma,
                parentPath)

      // Found?
      if (instance != null) {
        return instance
      }

      // Set curPath
      curPath = parentPath

      /* Safety iterator
      i += 1

      if (i > 1000) {
        throw new CustomError(`${fnName}: path too deep!`)
      } */
    }

    // Not found
    return undefined
  }

  async getProject(
          prisma: PrismaClient,
          parentId: string | null,
          projectName: string) {

    // Debug
    const fnName = `${this.clName}.getProject()`

    // Get the admin UserProfile
    const adminUserProfile = await
            usersService.getUserProfileByEmail(
              prisma,
              ServerTestTypes.adminUserEmail)

    if (adminUserProfile == null) {
      throw new CustomError(`${fnName}: UserProfile not found for email: ` +
                            ServerTestTypes.adminUserEmail)
    }

    // Get the System project
    const project = await
            instanceModel.getByParentIdAndNameAndUserProfileId(
              prisma,
              parentId,
              projectName,
              adminUserProfile.id)

    // Return
    return project
  }

  async getProjectByPath(
          prisma: PrismaClient,
          fullPath: string) {

    // Debug
    const fnName = `${this.clName}.getProjectByPath()`

    // Debug
    // console.log(`${fnName}: fullPath: ${fullPath}`)

    // Get project's path
    const projectPaths = await
            instanceSettingModel.filter(
              prisma,
              undefined,  // instanceId
              InstanceSettingNames.projectPath,
              fullPath)   // value

    // Debug
    // console.log(`${fnName}: projectPaths: ` + JSON.stringify(projectPaths))

    // Matching
    for (const projectPath of projectPaths) {

      if (fullPath.startsWith(projectPath.value)) {

        // Get instance
        const instance = await
                instanceModel.getById(
                  prisma,
                  projectPath.instanceId)

        // Return instance
        return instance
      }
    }

    // Not found
    return null
  }

  async getProjectByList(prisma: PrismaClient) {

    // Choices
    var choices = [
      {
        name: `Back`,
        value: CommonCommands.back as string
      }
    ]

    // Get projects
    const instances = await
            instanceModel.filter(
              prisma,
              null)  // parentId

    // Build and print a list
    var i = 1
    var instancesMap = new Map<string, Instance>()

    for (const instance of instances) {

      // Skip System
      if (instance.name === ServerOnlyTypes.systemProjectName) {
        continue
      }

      // Set entry
      instancesMap.set(
        `${i}`,
        instance)

      // Add to choices
      choices.push({
        name: instance.name,
        value: `${i}`
      })

      // Inc i
      i += 1
    }

    // Prompt for project by number
    const command = await select({
      message: `Select an option`,
      loop: false,
      pageSize: 10,
      choices: choices
    })

    // Non-project selection
    if (!instancesMap.has(command)) {
      return undefined
    }

    // Return selected project
    return instancesMap.get(command)
  }

  async getProjectPath(
          prisma: PrismaClient,
          instanceId: string) {

    // Debug
    const fnName = `${this.clName}.getProjectPath()`

    // Get project's path
    const projectPaths = await
            instanceSettingModel.filter(
              prisma,
              instanceId,
              InstanceSettingNames.projectPath,
              undefined)  // value

    // Validate
    if (projectPaths.length === 0) {
      return undefined
    } else if (projectPaths.length > 1) {
      throw new CustomError(`${fnName}: more than one project path found`)
    }

    // Return
    return projectPaths[0].value
  }

  async createProjectDetails(
          prisma: PrismaClient,
          indents: number,
          instance: Instance) {

    // Debug
    const fnName = `${this.clName}.createProjectDetails()`

    // Get ProjectNode
    const projectNode = await
            projectGraphQueryService.getProjectNode(
              prisma,
              instance.id)

    // Validate
    if (projectNode == null) {
      throw new CustomError(`${fnName}: projectNode == null`)
    }

    // Determine paths
    const projectPath = (projectNode.jsonContent as any).path
    const intentPath = `${projectPath}${path.sep}intent`
    const srcPath = `${projectPath}`

    // Get DotIntentCodeProjectNode
    const dotIntentCodeProjectNode = await
      dotIntentCodeGraphQueryService.getDotIntentCodeProject(
        prisma,
        projectNode)

    // Get ProjectSpecsNode
    const projectSpecsNode = await
      specsGraphQueryService.getSpecsProjectNode(
        prisma,
        projectNode)

    // Get/create builds node
    const buildsNode = await
     buildsGraphMutateService.getOrCreateBuildsNode(
      prisma,
      projectNode)

    // Create a new build node
    const buildNode = await
      buildsGraphMutateService.createBuildNode(
        prisma,
        buildsNode)

    // Get or create ProjectIntentCodeNode
    const projectIntentCodeNode = await
      intentCodeGraphMutateService.getOrCreateIntentCodeProjectNode(
        prisma,
        buildNode,
        intentPath)

    // Get or create ProjectSourceNode
    const projectSourceNode = await
      sourceCodeGraphMutateService.getOrCreateSourceCodeProject(
        prisma,
        buildNode,
        srcPath)

    // Get or create ProjectIntentCodeAnalysisNode
    const projectIntentCodeAnalysisNode = await
      intentCodeAnalysisGraphMutateService.getOrCreateProjectIntentCodeAnalysisNode(
        prisma,
        buildNode)

    // Define ProjectDetails
    const projectDetails: ProjectDetails = {
      indents: indents,
      instance: instance,
      projectNode: projectNode,
      dotIntentCodeProjectNode: dotIntentCodeProjectNode,
      projectSpecsNode: projectSpecsNode,
      projectIntentCodeNode: projectIntentCodeNode,
      projectSourceNode: projectSourceNode,
      projectIntentCodeAnalysisNode: projectIntentCodeAnalysisNode
    }

    // Return
    return projectDetails
  }
}
