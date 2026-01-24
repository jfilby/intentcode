const NodeCache = require('node-cache')
import path from 'path'
import { Instance, PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { InstanceModel } from '@/serene-core-server/models/instances/instance-model'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { InstanceSettingModel } from '@/serene-core-server/models/instances/instance-setting-model'
import { UsersService } from '@/serene-core-server/services/users/service'
import { ServerTestTypes } from '@/types/server-test-types'
import { InstanceSettingNames, ProjectDetails, ServerOnlyTypes } from '@/types/server-only-types'
import { DotIntentCodeGraphQueryService } from '../graphs/dot-intentcode/graph-query-service'
import { FsUtilsService } from '../utils/fs-utils-service'
import { ProjectGraphQueryService } from '../graphs/project/query-service'
import { SpecsGraphQueryService } from '../graphs/specs/graph-query-service'

// Cache objects must be global, to access all data (e.g. ability to delete
// an item from an object if InstanceService).
const cachedInstances = new NodeCache()
const cachedInstancesWithIncludes = new NodeCache()

// Models
const instanceModel = new InstanceModel()
const instanceSettingModel = new InstanceSettingModel()

// Services
const consoleService = new ConsoleService()
const dotIntentCodeGraphQueryService = new DotIntentCodeGraphQueryService()
const fsUtilsService = new FsUtilsService()
const projectGraphQueryService = new ProjectGraphQueryService()
const specsGraphQueryService = new SpecsGraphQueryService()
const usersService = new UsersService()

// Class
export class ProjectsQueryService {

  // Consts
  clName = 'ProjectsQueryService'

  // Code
  async getProjectsMap(
          prisma: PrismaClient,
          instanceId: string,
          instance: Instance | undefined,
          projectsMap: Map<number, ProjectDetails>,
          maxProjectNo: number = 1,
          indents: number = 0) {

    // Debug
    const fnName = `${this.clName}.getProjectsMap()`

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
            this.getProjectDetails(
              prisma,
              indents,
              instance)

    // Add instance to the map
    projectsMap.set(
      maxProjectNo,
      projectDetails)

    maxProjectNo += 1

    // Get child instances
    const childInstances = await
            instanceModel.filter(
              prisma,
              instanceId)  // parentId

    // Cascade to child instances
    for (const childInstance of childInstances) {

      await this.getProjectsMap(
              prisma,
              childInstance.id,
              childInstance,
              projectsMap,
              maxProjectNo,
              indents + 1)
    }

    // Return
    return projectsMap
  }

  getProjectsPrompting(projectsMap: Map<number, ProjectDetails>) {

    // Debug
    const fnName = `${this.clName}.getProjectsPrompting()`

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
         projectsMap.entries()) {

      // Add to prompting
      const indents = ' '.repeat(projectDetails.indents * 2)

      prompting +=
        `${indents}- ${projectNo}: ${projectDetails.instance.name}`
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
    const fnName = `${this.clName}.getProject()`

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

      // Print entry
      console.log(`${i}: ${instance.name}`)

      // Inc i
      i += 1
    }

    // Prompt for project by number
    const loadProjectNo = await
            consoleService.askQuestion('> ')

    // Invalid selection?
    if (!instancesMap.has(loadProjectNo)) {

      console.log(`Invalid selection`)
      process.exit(1)
    }

    // Return selected project
    return instancesMap.get(loadProjectNo)
  }

  async getProjectDetails(
          prisma: PrismaClient,
          indents: number,
          instance: Instance) {

    // Debug
    const fnName = `${this.clName}.getProjectDetails()`

    // Get ProjectNode
    const projectNode = await
            projectGraphQueryService.getProjectNode(
              prisma,
              instance.id)

    // Validate
    if (projectNode == null) {
      throw new CustomError(`${fnName}: projectNode == null`)
    }

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

    // Get ProjectIntentCodeNode
    const projectIntentCodeNode = await
            projectGraphQueryService.getIntentCodeProjectNode(
              prisma,
              projectNode)

    // Get ProjectSourceNode
    const projectSourceNode = await
            projectGraphQueryService.getSourceProjectNode(
              prisma,
              projectNode)

    // Define ProjectDetails
    const projectDetails: ProjectDetails = {
      indents: indents,
      instance: instance,
      projectNode: projectNode,
      dotIntentCodeProjectNode: dotIntentCodeProjectNode,
      projectSpecsNode: projectSpecsNode,
      projectIntentCodeNode: projectIntentCodeNode,
      projectSourceNode: projectSourceNode
    }

    // Return
    return projectDetails
  }
}
