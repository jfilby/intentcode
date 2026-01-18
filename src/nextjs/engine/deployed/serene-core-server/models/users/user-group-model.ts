import { PrismaClient } from '@prisma/client'

export class UserGroupModel {

  // Consts
  clName = 'UserGroupModel'

  // Code
  async create(
          prisma: PrismaClient,
          ownerUserProfileId: string,
          name: string) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.userGroup.create({
        data: {
          ownerUserProfileId: ownerUserProfileId,
          name: name
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async getById(
          prisma: PrismaClient,
          id: string) {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Query
    var userGroup: any = null

    try {
      userGroup = await prisma.userGroup.findUnique({
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
    return userGroup
  }

  async getByUniqueKey(
          prisma: PrismaClient,
          ownerUserProfileId: string,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getByUniqueKey()`

    // Validate
    if (name == null) {
      console.error(`${fnName}: id is null and name is null`)
      throw 'Prisma error'
    }

    // Query
    var userGroup: any = null

    try {
      userGroup = await prisma.userGroup.findFirst({
        where: {
          ownerUserProfileId: ownerUserProfileId,
          name: name
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return
    return userGroup
  }

  async update(
          prisma: PrismaClient,
          id: string,
          ownerUserProfileId: string | undefined,
          name: string | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Update record
    try {
      return await prisma.userGroup.update({
        data: {
          ownerUserProfileId: ownerUserProfileId,
          name: name
        },
        where: {
          id: id
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async upsert(prisma: PrismaClient,
               ownerUserProfileId: string | undefined,
               id: string | undefined,
               name: string | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If id isn't specified, try to get by the unique key
    if (id == null &&
        ownerUserProfileId != null &&
        name != null) {

      const userGroup = await
              this.getByUniqueKey(
                prisma,
                ownerUserProfileId,
                name)

      if (userGroup != null) {
        id = userGroup.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (ownerUserProfileId == null) {
        console.error(`${fnName}: id is null and ownerUserProfileId is null`)
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
                 ownerUserProfileId,
                 name)
    } else {

      // Update
      return await
               this.update(
                 prisma,
                 id,
                 ownerUserProfileId,
                 name)
    }
  }
}
