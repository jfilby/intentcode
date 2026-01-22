const NodeCache = require('node-cache')
import path from 'path'
import { Instance, PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { InstanceModel } from '@/serene-core-server/models/instances/instance-model'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { InstanceSettingModel } from '@/serene-core-server/models/instances/instance-setting-model'
import { UsersService } from '@/serene-core-server/services/users/service'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { InstanceSettingNames, ServerOnlyTypes } from '@/types/server-only-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { FsUtilsService } from '../utils/fs-utils-service'

// Cache objects must be global, to access all data (e.g. ability to delete
// an item from an object if InstanceService).
const cachedInstances = new NodeCache()
const cachedInstancesWithIncludes = new NodeCache()

// Models
const instanceModel = new InstanceModel()
const instanceSettingModel = new InstanceSettingModel()

// Services
const consoleService = new ConsoleService()
const fsUtilsService = new FsUtilsService()
const sourceNodeModel = new SourceNodeModel()
const usersService = new UsersService()

// Class
export class ProjectsQueryService {

  // Consts
  clName = 'ProjectsQueryService'

  // Code
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
              undefined)  // value

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
}
