import { Prisma } from '@prisma/client'

export class InstanceModel {

  // Consts
  clName = 'InstanceModel'

  // Code
  async create(
          prisma: Prisma.TransactionClient,
          parentId: string | null,
          userProfileId: string,
          instanceType: string,
          projectType: string | null,
          isDemo: boolean,
          isDefault: boolean,
          status: string,
          publicAccess: string | null,
          name: string) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.instance.create({
        data: {
          parent: parentId != null ? {
            connect: {
              id: parentId
            }
          } : undefined,
          userProfile: {
            connect: {
              id: userProfileId
            }
          },
          instanceType: instanceType,
          projectType: projectType,
          isDemo: isDemo,
          isDefault: isDefault,
          status: status,
          publicAccess: publicAccess,
          name: name
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async deleteById(
          prisma: Prisma.TransactionClient,
          id: string) {

    // Debug
    const fnName = `${this.clName}.deleteById()`

    // Delete
    try {
      return await prisma.instance.delete({
        where: {
          id: id
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }
  }

  async filter(
          prisma: Prisma.TransactionClient,
          parentId: string | null | undefined = undefined,
          userProfileId: string | undefined = undefined,
          instanceType: string | undefined = undefined,
          projectType: string | null | undefined = undefined,
          isDemo: boolean | undefined = undefined,
          isDefault: boolean | undefined = undefined,
          status: string | undefined = undefined,
          publicAccess: string | null | undefined = undefined,
          includeUserProfile: boolean = false,
          includeUser: boolean = false) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // console.log(`${fnName}: starting with parentId: ${parentId} ` +
    //             `status: ${status} ` +
    //             `includeUserProfile: ${includeUserProfile} ` +
    //             `includeUser: ${includeUser}`)

    // Query
    try {
      return await prisma.instance.findMany({
        include: {
          userProfile: includeUserProfile ? {
            include: {
              user: includeUser
            }
          } : false
        },
        where: {
          parentId: parentId,
          userProfileId: userProfileId,
          instanceType: instanceType,
          projectType: projectType,
          isDemo: isDemo,
          isDefault: isDefault,
          status: status,
          publicAccess: publicAccess
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async getById(
          prisma: Prisma.TransactionClient,
          id: string,
          includeParent: boolean = false,
          includeUserProfile: boolean = false,
          includeUser: boolean = false) {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Query
    var instance: any = null

    try {
      instance = await prisma.instance.findUnique({
        include: {
          parent: includeParent,
          userProfile: includeUserProfile ? {
            include: {
              user: includeUser
            }
          } : false
        },
        where: {
          id: id
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return
    return instance
  }

  async getByNameAndIsAdminUserProfile(
          prisma: Prisma.TransactionClient,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getByName()`

    // Query
    var instance: any

    try {
      instance = await prisma.instance.findFirst({
        where: {
          userProfile: {
            isAdmin: true
          },
          name: name
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }

    // Return
    return instance
  }

  async getByParentIdAndUserProfileIdAndIsDefault(
          prisma: Prisma.TransactionClient,
          parentId: string | null,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.getByParentIdAndUserProfileIdAndIsDefault()`

    // Query
    var instance: any

    try {
      instance = await prisma.instance.findFirst({
        where: {
          parentId: parentId,
          userProfileId: userProfileId,
          isDefault: true
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }

    // Return
    return instance
  }

  async getByParentIdAndName(
          prisma: Prisma.TransactionClient,
          parentId: string | null,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getByParentIdAndName()`

    // console.log(`${fnName}: parentId: ${parentId} name: ${name} ` +
    //             `userProfileId: ${userProfileId}`)

    // Validate
    if (name == null) {
      console.error(`${fnName}: name == null`)
      throw 'Validation error'
    }

    // Query
    var instance: any

    try {
      instance = await prisma.instance.findFirst({
        where: {
          parentId: parentId,
          name: name
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }

    // Return
    return instance
  }

  async getByParentIdAndNameAndUserProfileId(
          prisma: Prisma.TransactionClient,
          parentId: string | null,
          name: string,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.getByParentIdAndNameAndUserProfileId()`

    // console.log(`${fnName}: parentId: ${parentId} name: ${name} ` +
    //             `userProfileId: ${userProfileId}`)

    // Validate
    if (name == null) {
      console.error(`${fnName}: name == null`)
      throw 'Validation error'
    }

    if (userProfileId == null) {
      console.error(`${fnName}: userProfileId == null`)
      throw 'Validation error'
    }

    // Query
    var instance: any

    try {
      instance = await prisma.instance.findFirst({
        where: {
          parentId: parentId,
          name: name,
          userProfileId: userProfileId
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }

    // Return
    return instance
  }

  async getByUserProfileIdAndName(
          prisma: Prisma.TransactionClient,
          userProfileId: string,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getByUserProfileIdAndName()`

    // Query
    var instance: any

    try {
      instance = await prisma.instance.findFirst({
        where: {
          userProfileId: userProfileId,
          name: name
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }

    // Return
    return instance
  }

  async getByUserProfileIdAndParentNameAndName(
          prisma: Prisma.TransactionClient,
          userProfileId: string,
          parentName: string,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getByUserProfileIdAndParentNameAndName()`

    // Validate
    if (userProfileId == null) {
      console.error(`${fnName}: userProfileId == null`)
      throw 'Validation error'
    }

    if (parentName == null) {
      console.error(`${fnName}: parentName == null`)
      throw 'Validation error'
    }

    if (name == null) {
      console.error(`${fnName}: name == null`)
      throw 'Validation error'
    }

    // Query
    var instance: any

    try {
      instance = await prisma.instance.findFirst({
        where: {
          parent: {
            userProfileId: userProfileId,
            parentId: null,
            name: parentName
          },
          userProfileId: userProfileId,
          name: name          
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }

    // Return
    return instance
  }

  async update(
          prisma: Prisma.TransactionClient,
          id: string,
          parentId: string | null | undefined,
          userProfileId: string | undefined,
          instanceType: string | undefined,
          projectType: string | null | undefined,
          isDemo: boolean | undefined,
          isDefault: boolean | undefined,
          status: string | undefined,
          publicAccess: string | null | undefined,
          name: string | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Update record
    try {
      return await prisma.instance.update({
        data: {
          parentId: parentId,
          userProfileId: userProfileId,
          instanceType: instanceType,
          projectType: projectType,
          isDemo: isDemo,
          isDefault: isDefault,
          status: status,
          publicAccess: publicAccess,
          name: name
        },
        where: {
          id: id
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async updateByParentId(
          prisma: Prisma.TransactionClient,
          parentId: string | null | undefined,
          userProfileId: string | undefined,
          instanceType: string | undefined,
          projectType: string | null | undefined,
          isDemo: boolean | undefined,
          isDefault: boolean | undefined,
          status: string | undefined,
          publicAccess: string | null | undefined,
          name: string | undefined) {

    // Debug
    const fnName = `${this.clName}.updateByParentId()`

    // Update record
    try {
      return await prisma.instance.updateMany({
        data: {
          userProfileId: userProfileId,
          instanceType: instanceType,
          projectType: projectType,
          isDemo: isDemo,
          isDefault: isDefault,
          status: status,
          publicAccess: publicAccess,
          name: name
        },
        where: {
          parentId: parentId
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async upsert(prisma: Prisma.TransactionClient,
               id: string | undefined,
               parentId: string | null | undefined,
               userProfileId: string | undefined,
               instanceType: string | undefined,
               projectType: string | null | undefined,
               isDemo: boolean | undefined,
               isDefault: boolean | undefined,
               status: string | undefined,
               publicAccess: string | null | undefined,
               name: string | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If id isn't specified, try to get by the unique key
    if (id == null &&
        parentId !== undefined &&
        name != null &&
        userProfileId != null) {

      const instance = await
              this.getByParentIdAndNameAndUserProfileId(
                prisma,
                parentId,
                name,
                userProfileId)

      if (instance != null) {
        id = instance.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (parentId === undefined) {
        console.error(`${fnName}: id is null and parentId is undefined`)
        throw 'Prisma error'
      }

      if (userProfileId == null) {
        console.error(`${fnName}: id is null and userProfileId is null`)
        throw 'Prisma error'
      }

      if (instanceType == null) {
        console.error(`${fnName}: id is null and instanceType is null`)
        throw 'Prisma error'
      }

      if (projectType === undefined) {
        console.error(`${fnName}: id is null and projectType is undefined`)
        throw 'Prisma error'
      }

      if (isDemo == null) {
        console.error(`${fnName}: id is null and isDemo is null`)
        throw 'Prisma error'
      }

      if (isDefault == null) {
        console.error(`${fnName}: id is null and isDefault is null`)
        throw 'Prisma error'
      }

      if (status == null) {
        console.error(`${fnName}: id is null and status is null`)
        throw 'Prisma error'
      }

      if (publicAccess === undefined) {
        console.error(`${fnName}: id is null and publicAccess is undefined`)
        throw 'Prisma error'
      }

      if (name == null) {
        console.error(`${fnName}: id is null and name is null`)
        throw 'Prisma error'
      }

      // Create
      return await
               this.create(
                 prisma,
                 parentId,
                 userProfileId,
                 instanceType,
                 projectType,
                 isDemo,
                 isDefault,
                 status,
                 publicAccess,
                 name)
    } else {

      // Update
      return await
               this.update(
                 prisma,
                 id,
                 parentId,
                 userProfileId,
                 instanceType,
                 projectType,
                 isDemo,
                 isDefault,
                 status,
                 publicAccess,
                 name)
    }
  }
}
