import { Prisma } from '@prisma/client'

export class InstanceSettingModel {

  // Consts
  clName = 'InstanceSettingModel'

  // Code
  async create(
          prisma: Prisma.TransactionClient,
          instanceId: string,
          name: string,
          value: string) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.instanceSetting.create({
        data: {
          instanceId: instanceId,
          name: name,
          value: value
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async deleteByInstanceId(
          prisma: Prisma.TransactionClient,
          instanceId: string) {

    // Debug
    const fnName = `${this.clName}.deleteByInstanceId()`

    // Delete records
    try {
      return await prisma.instanceSetting.deleteMany({
        where: {
          instanceId: instanceId
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async filter(
          prisma: Prisma.TransactionClient,
          instanceId: string | undefined,
          name: string | undefined,
          value: string | undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    console.log(`${fnName}: starting..`)

    // Query
    try {
      return await prisma.instanceSetting.findMany({
        where: {
          instanceId: instanceId,
          name: name,
          value: value
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async getById(
          prisma: Prisma.TransactionClient,
          id: string) {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Query
    var instanceSetting: any = null

    try {
      instanceSetting = await prisma.instanceSetting.findUnique({
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
    return instanceSetting
  }

  async getByInstanceIdAndName(
          prisma: Prisma.TransactionClient,
          instanceId: string,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getByInstanceIdAndName()`

    // Validate
    if (instanceId == null) {
      console.error(`${fnName}: instanceId == null`)
      throw 'Validation error'
    }

    if (name == null) {
      console.error(`${fnName}: name == null`)
      throw 'Validation error'
    }

    // Query
    var instanceSetting: any

    try {
      instanceSetting = await prisma.instanceSetting.findFirst({
        where: {
          instanceId: instanceId,
          name: name
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }

    // Return
    return instanceSetting
  }

  async update(
          prisma: Prisma.TransactionClient,
          id: string,
          instanceId: string | undefined,
          name: string | undefined,
          value: string | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Update record
    try {
      return await prisma.instanceSetting.update({
        data: {
          instanceId: instanceId,
          name: name,
          value: value
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
               instanceId: string | undefined,
               name: string | undefined,
               value: string | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If id isn't specified, try to get by the unique key
    if (id == null &&
        instanceId != null &&
        name != null) {

      const instanceSetting = await
              this.getByInstanceIdAndName(
                prisma,
                instanceId,
                name)

      if (instanceSetting != null) {
        id = instanceSetting.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (instanceId == null) {
        console.error(`${fnName}: id is null and instanceId is null`)
        throw 'Prisma error'
      }

      if (name == null) {
        console.error(`${fnName}: id is null and name is null`)
        throw 'Prisma error'
      }

      if (value == null) {
        console.error(`${fnName}: id is null and value is null`)
        throw 'Prisma error'
      }

      // Create
      return await
               this.create(
                 prisma,
                 instanceId,
                 name,
                 value)
    } else {

      // Update
      return await
               this.update(
                 prisma,
                 id,
                 instanceId,
                 name,
                 value)
    }
  }
}
