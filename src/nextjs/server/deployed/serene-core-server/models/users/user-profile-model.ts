import { PrismaClient } from '@prisma/client'
import { UserTypes } from '../../types/user-types'

export class UserProfileModel {

  // Consts
  clName = 'UserProfileModel'

  // Code
  async create(prisma: PrismaClient,
               userId: string | null,
               isAdmin: boolean,
               deletePending: Date | null) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.userProfile.create({
        data: {
          userId: userId,
          isAdmin: isAdmin,
          deletePending: deletePending
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async getById(prisma: PrismaClient,
                id: string) {

    // Debug
    const fnName = `${this.clName}.getById()`
  
    // Get record
    try {
      return await prisma.userProfile.findUnique({
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

  async getByUserId(
          prisma: PrismaClient,
          userId: string) {

    // Debug
    const fnName = `${this.clName}.getByUserId()`
  
    // Get record
    try {
      return await prisma.userProfile.findFirst({
        where: {
          userId: userId
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }
  }

  async setOwnerType(
          prisma: PrismaClient,
          userProfile: any) {

    // Debug
    const fnName = `${this.clName}.setOwnerType()`

    console.log(`${fnName}: starting with userProfile: ` +
                JSON.stringify(userProfile))

    // Return immediately if ownerType is set
    if (userProfile.ownerType != null) {

      return {
        status: true,
        userProfile: userProfile
      }
    }

    // Set to human ownerType if the userId field is set
    var ownerType: string = ''

    if (userProfile.ownerType == null) {

      ownerType = UserTypes.humanRoleOwnerType
    }

    // Update record
    userProfile = await prisma.userProfile.update({
      data: {
        ownerType: ownerType
      },
      where: {
        id: userProfile.id
      }
    })

    // Return
    return {
      status: true,
      userProfile: userProfile
    }
  }

  async update(prisma: PrismaClient,
               id: string,
               userId: string | null | undefined,
               isAdmin: boolean | undefined,
               deletePending: Date | null | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Create record
    try {
      return await prisma.userProfile.update({
        data: {
          userId: userId,
          isAdmin: isAdmin
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
               id: string | undefined,
               userId: string | null | undefined,
               isAdmin: boolean | undefined,
               deletePending: Date | null | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If id isn't specified, but the unique keys are, try to get the record
    if (id == null &&
        userId != null) {

      const userProfile = await
              this.getByUserId(
                prisma,
                userId)

      if (userProfile != null) {
        id = userProfile.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (userId === undefined) {
        console.error(`${fnName}: id is null and userId is undefined`)
        throw 'Prisma error'
      }

      if (isAdmin == null) {
        console.error(`${fnName}: id is null and isAdmin is null`)
        throw 'Prisma error'
      }

      if (deletePending === undefined) {
        console.error(`${fnName}: id is null and deletePending is undefined`)
        throw 'Prisma error'
      }

      // Create
      return await
               this.create(
                 prisma,
                 userId,
                 isAdmin,
                 deletePending)
    } else {

      // Update
      return await
               this.update(
                 prisma,
                 id,
                 userId,
                 isAdmin,
                 deletePending)
    }
  }
}
