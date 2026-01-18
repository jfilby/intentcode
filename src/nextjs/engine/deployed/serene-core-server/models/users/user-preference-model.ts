import { PrismaClient } from '@prisma/client'

export class UserPreferenceModel {

  // Consts
  clName = 'UserPreferenceModel'

  // Code
  async create(
          prisma: PrismaClient,
          userProfileId: string,
          category: string,
          key: string,
          value: string | null,
          values: string[] | null) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Values can't be null
    if (values == null) {

      values = []
    }

    // Create record
    try {
      return await prisma.userPreference.create({
        data: {
          userProfileId: userProfileId,
          category: category,
          key: key,
          value: value,
          values: values
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async deleteById(
          prisma: PrismaClient,
          id: string) {

    // Debug
    const fnName = `${this.clName}.deleteById()`

    // Delete
    try {
      return await prisma.userPreference.delete({
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
          prisma: PrismaClient,
          userProfileId: string | undefined,
          category: string | undefined,
          key: string | undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Query
    try {
      return await prisma.userPreference.findMany({
        where: {
          userProfileId: userProfileId,
          category: category,
          key: key
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async filterManyKeys(
          prisma: PrismaClient,
          userProfileId: string | undefined,
          keys: string[] | undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Query
    try {
      return await prisma.userPreference.findMany({
        where: {
          userProfileId: userProfileId,
          key: {
            in: keys
          }
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
    var userpreference: any = null

    try {
      userpreference = await prisma.userPreference.findUnique({
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
    return userpreference
  }

  async getByUniqueKey(
          prisma: PrismaClient,
          userProfileId: string,
          key: string) {

    // Debug
    const fnName = `${this.clName}.getByUniqueKey()`

    // Query
    var userpreference: any = null

    try {
      userpreference = await prisma.userPreference.findFirst({
        where: {
          userProfileId: userProfileId,
          key: key
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }
    // Return
    return userpreference
  }

  async update(
          prisma: PrismaClient,
          id: string,
          userProfileId: string | undefined,
          category: string | undefined,
          key: string | undefined,
          value: string | null | undefined,
          values: string[] | null | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Values can't be null
    if (values == null) {

      values = []
    }

    // Update record
    try {
      return await prisma.userPreference.update({
        data: {
          userProfileId: userProfileId,
          category: category,
          key: key,
          value: value,
          values: values
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
               userProfileId: string | undefined,
               category: string | undefined,
               key: string | undefined,
               value: string | null | undefined,
               values: string[] | null | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If id isn't specified, but the unique keys are, try to get the record
    if (id == null &&
        userProfileId != null &&
        key != null) {

      const userPreference = await
              this.getByUniqueKey(
                prisma,
                userProfileId,
                key)

      if (userPreference != null) {
        id = userPreference.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (userProfileId == null) {
        console.error(`${fnName}: id is null and userProfileId is null`)
        throw 'Prisma error'
      }

      if (category == null) {
        console.error(`${fnName}: id is null and category is null`)
        throw 'Prisma error'
      }

      if (key == null) {
        console.error(`${fnName}: id is null and key is null`)
        throw 'Prisma error'
      }

      if (value === undefined) {
        console.error(`${fnName}: id is null and value is undefined`)
        throw 'Prisma error'
      }

      if (values === undefined) {
        console.error(`${fnName}: id is null and values is undefined`)
        throw 'Prisma error'
      }

      // Create
      return await
               this.create(
                 prisma,
                 userProfileId,
                 category,
                 key,
                 value,
                 values)
    } else {

      // Update
      return await
               this.update(
                 prisma,
                 id,
                 userProfileId,
                 category,
                 key,
                 value,
                 values)
    }
  }
}
