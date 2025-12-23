import { PrismaClient } from '@prisma/client'

export class UserGroupMemberModel {

  // Consts
  clName = 'UserGroupMemberModel'

  // Code
  async create(
          prisma: PrismaClient,
          userGroupId: string,
          userProfileId: string,
          isGroupAdmin: boolean) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.userGroupMember.create({
        data: {
          userGroupId: userGroupId,
          userProfileId: userProfileId,
          isGroupAdmin: isGroupAdmin
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async delete(
          prisma: PrismaClient,
          id: string) {

    // Debug
    const fnName = `${this.clName}.delete()`

    // Delete record
    try {
      return await prisma.userGroupMember.delete({
        where: {
          id: id
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async filter(
          prisma: PrismaClient,
          userGroupId: string | undefined,
          isGroupAdmin: boolean | undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Query
    try {
      return await prisma.userGroupMember.findMany({
        where: {
          userGroupId: userGroupId,
          isGroupAdmin: isGroupAdmin
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
    var userGroupMember: any = null

    try {
      userGroupMember = await prisma.userGroupMember.findUnique({
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
    return userGroupMember
  }

  async getByUniqueKey(
          prisma: PrismaClient,
          userGroupId: string,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.getByUniqueKey()`

    // Validate
    if (userGroupId == null) {
      console.error(`${fnName}: id is null and userGroupId is null`)
      throw 'Prisma error'
    }

    if (userProfileId == null) {
      console.error(`${fnName}: id is null and userProfileId is null`)
      throw 'Prisma error'
    }

    // Query
    var userGroupMember: any = null

    try {
      userGroupMember = await prisma.userGroupMember.findFirst({
        where: {
          userGroupId: userGroupId,
          userProfileId: userProfileId
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return
    return userGroupMember
  }

  async update(
          prisma: PrismaClient,
          id: string,
          userGroupId: string | undefined,
          userProfileId: string | undefined,
          isGroupAdmin: boolean | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Update record
    try {
      return await prisma.userGroupMember.update({
        data: {
          userGroupId: userGroupId,
          userProfileId: userProfileId,
          isGroupAdmin: isGroupAdmin
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

  async upsert(prisma: PrismaClient,
               id: string | undefined,
               userGroupId: string | undefined,
               userProfileId: string | undefined,
               isGroupAdmin: boolean | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If id isn't specified, but the unique keys are, try to get the record
    if (id == null &&
        userGroupId != null &&
        userProfileId != null) {

      const userGroupMember = await
              this.getByUniqueKey(
                prisma,
                userGroupId,
                userProfileId)

      if (userGroupMember != null) {
        id = userGroupMember.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (userGroupId == null) {
        console.error(`${fnName}: id is null and userGroupId is null`)
        throw 'Prisma error'
      }

      if (userProfileId == null) {
        console.error(`${fnName}: id is null and userProfileId is null`)
        throw 'Prisma error'
      }

      if (isGroupAdmin == null) {
        console.error(`${fnName}: id is null and isGroupAdmin is null`)
        throw 'Prisma error'
      }

      // Create
      return await
               this.create(
                 prisma,
                 userGroupId,
                 userProfileId,
                 isGroupAdmin)
    } else {

      // Update
      return await
               this.update(
                 prisma,
                 id,
                 userGroupId,
                 userProfileId,
                 isGroupAdmin)
    }
  }
}
