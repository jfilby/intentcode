import { PrismaClient } from '@prisma/client'

export class AiTaskModel {

  // Consts
  clName = 'AiTaskModel'

  // Code
  async create(
    prisma: PrismaClient,
    status: string,
    namespace: string,
    name: string) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create AiTask record
    try {
      return await prisma.aiTask.create({
        data: {
          status: status,
          namespace: namespace,
          name: name
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
    }
  }

  async filter(
    prisma: PrismaClient,
    status: string | undefined,
    namespace: string | undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`
  
    // Get AiTask record
    try {
      return await prisma.aiTask.findMany({
        where: {
          status: status,
          namespace: namespace
        },
        orderBy: [
          {
            name: 'asc'
          }
        ]
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }
  }

  async getById(
    prisma: PrismaClient,
    id: string) {

    // Debug
    const fnName = `${this.clName}.getById()`
  
    // Get AiTask record
    try {
      return await prisma.aiTask.findUnique({
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

  async getByUniqueKey(
    prisma: PrismaClient,
    namespace: string,
    name: string) {

    // Debug
    const fnName = `${this.clName}.getByUniqueKey()`

    // Validate
    if (namespace == null) {
      console.error(`${fnName}: namespace must be specified`)
      throw 'Prisma error'
    }

    if (name == null) {
      console.error(`${fnName}: name must be specified`)
      throw 'Prisma error'
    }

    // Get AiTask record
    try {
      return await prisma.aiTask.findFirst({
        where: {
          namespace: namespace,
          name: name
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }
  }

  async update(
    prisma: PrismaClient,
    id: string,
    status: string | undefined,
    namespace: string | undefined,
    name: string | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    try {
      return await prisma.aiTask.update({
        data: {
          status: status,
          namespace: namespace,
          name: name
        },
        where: {
          id: id
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
    }
  }

  async upsert(
    prisma: PrismaClient,
    id: string | undefined,
    status: string | undefined,
    namespace: string | undefined,
    name: string | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // Try to get by name
    if (id == null &&
        namespace != null &&
        name != null) {

      const aiTask = await
        this.getByUniqueKey(
          prisma,
          namespace,
          name)

      if (aiTask != null) {
        id = aiTask.id
      }
    }

    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (status == null) {
        console.error(`${fnName}: id is null and status is null`)
        throw 'Prisma error'
      }

      if (namespace == null) {
        console.error(`${fnName}: id is null and namespace is null`)
        throw 'Prisma error'
      }

      if (name === undefined) {
        console.error(`${fnName}: id is null and name is undefined`)
        throw 'Prisma error'
      }

      return await this.create(
        prisma,
        status,
        namespace,
        name)
    } else {
      return await this.update(
        prisma,
        id,
        status,
        namespace,
        name)
    }
  }
}
