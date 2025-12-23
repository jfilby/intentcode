import { Prisma } from '@prisma/client'

export class FeatureFlagModel {

  // Consts
  clName = 'FeatureFlagModel'

  // Code
  async create(prisma: Prisma.TransactionClient,
               userProfileId: string | null,
               instanceId: string | null,
               name: string,
               enabled: boolean) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Create
    try {
      return await prisma.featureFlag.create({
        data: {
          userProfileId: userProfileId,
          instanceId: instanceId,
          name: name,
          enabled: enabled
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async deleteByUserProfileId(
          prisma: Prisma.TransactionClient,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.deleteByUserProfileId()`

    // Query
    try {
      return await prisma.featureFlag.deleteMany({
        where: {
          userProfileId: userProfileId
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw `Prisma error`
    }
  }

  async filter(prisma: Prisma.TransactionClient,
               userProfileId: string | null | undefined = undefined,
               instanceId: string | null | undefined = undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Query
    try {
      return await prisma.featureFlag.findMany({
        where: {
          userProfileId: userProfileId,
          instanceId: instanceId
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw `Prisma error`
    }
  }

  async getByUniqueKey(
          prisma: Prisma.TransactionClient,
          userProfileId: string | null,
          instanceId: string | null,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getByUniqueKey()`

    // Query
    try {
      return await prisma.featureFlag.findFirst({
        where: {
          userProfileId: userProfileId,
          instanceId: instanceId,
          name: name
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw `Prisma error`
    }
  }

  async update(prisma: Prisma.TransactionClient,
               id: string,
               userProfileId: string | null | undefined,
               instanceId: string | null | undefined,
               name: string | undefined,
               enabled: boolean | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Create
    try {
      return await prisma.featureFlag.update({
        data: {
          userProfileId: userProfileId,
          instanceId: instanceId,
          name: name,
          enabled: enabled
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

  async upsert(prisma: Prisma.TransactionClient,
               id: string | undefined,
               userProfileId: string | null | undefined,
               instanceId: string | null | undefined,
               name: string | undefined,
               enabled: boolean | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // Get by userProfileId and day if id is null
    if (id == null &&
        userProfileId !== undefined &&
        instanceId !== undefined &&
        name != null) {

      const featureFlag = await
              this.getByUniqueKey(
                prisma,
                userProfileId,
                instanceId,
                name)

      if (featureFlag != null) {
        id = featureFlag.id
      }
    }

    // Upsert
    if (id == null) {
      // Validate for create (mainly for type validation of the create call)
      if (userProfileId === undefined) {
        console.error(`${fnName}: id is null and userProfileId is null`)
        throw 'Prisma error'
      }

      if (instanceId === undefined) {
        console.error(`${fnName}: id is null and instanceId is null`)
        throw 'Prisma error'
      }

      if (name == null) {
        console.error(`${fnName}: id is null and name is null`)
        throw 'Prisma error'
      }

      if (enabled == null) {
        console.error(`${fnName}: id is null and enabled is null`)
        throw 'Prisma error'
      }

      // Create
      // console.log(`${fnName}: create..`)

      return await this.create(
                     prisma,
                     userProfileId,
                     instanceId,
                     name,
                     enabled)
    } else {
      return await this.update(
                     prisma,
                     id,
                     userProfileId,
                     instanceId,
                     name,
                     enabled)
    }
  }
}
