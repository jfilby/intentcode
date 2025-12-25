import { PrismaClient } from '@prisma/client'

export class IntentCodeNodeModel {

  // Consts
  clName = 'IntentCodeNodeModel'

  // Code
  async create(
          prisma: PrismaClient,
          parentId: string | null,
          instanceId: string,
          type: string,
          path: string,
          name: string,
          content: string | null,
          contentHash: string | null,
          metadata: any,
          analysisStatus: string | null,
          lastAnalyzed: Date | null) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.intentCodeNode.create({
        data: {
          parentId: parentId,
          instanceId: instanceId,
          type: type,
          path: path,
          name: name,
          content: content,
          contentHash: contentHash,
          metadata: metadata,
          analysisStatus: analysisStatus,
          lastAnalyzed: lastAnalyzed
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw error
    }
  }

  async deleteById(
          prisma: PrismaClient,
          id: string) {

    // Debug
    const fnName = `${this.clName}.deleteById()`

    // Delete
    try {
      return await prisma.intentCodeNode.delete({
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
          parentId: string | null | undefined = undefined,
          instanceId: string | undefined = undefined,
          type: string | undefined = undefined,
          name: string | undefined = undefined,
          contentHash: string | null | undefined = undefined,
          analysisStatus: string | null | undefined = undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Query
    try {
      return await prisma.intentCodeNode.findMany({
        where: {
          parentId: parentId,
          instanceId: instanceId,
          type: type,
          name: name,
          contentHash: contentHash,
          analysisStatus: analysisStatus
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
    var intentCodeNode: any = null

    try {
      intentCodeNode = await prisma.intentCodeNode.findUnique({
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
    return intentCodeNode
  }

  async getByUniqueKey(
          prisma: PrismaClient,
          parentId: string | null,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getByUniqueKey()`

    // Validate
    if (parentId === undefined) {
      console.error(`${fnName}: parentId === undefined`)
      throw 'Validation error'
    }

    if (name == null) {
      console.error(`${fnName}: name == null`)
      throw 'Validation error'
    }

    // Query
    var intentCodeNode: any = null

    try {
      intentCodeNode = await prisma.intentCodeNode.findFirst({
        where: {
          parentId: parentId,
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
    return intentCodeNode
  }

  async update(
          prisma: PrismaClient,
          id: string,
          parentId: string | null | undefined,
          instanceId: string | undefined,
          type: string | undefined,
          path: string | undefined,
          name: string | undefined,
          content: string | null | undefined,
          contentHash: string | null | undefined,
          metadata: any,
          analysisStatus: string | null | undefined,
          lastAnalyzed: Date | null | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Update record
    try {
      return await prisma.intentCodeNode.update({
        data: {
          parentId: parentId,
          instanceId: instanceId,
          type: type,
          path: path,
          name: name,
          content: content,
          contentHash: contentHash,
          metadata: metadata,
          analysisStatus: analysisStatus,
          lastAnalyzed: lastAnalyzed
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

  async upsert(
          prisma: PrismaClient,
          id: string | undefined,
          parentId: string | null | undefined,
          instanceId: string | undefined,
          type: string | undefined,
          path: string | undefined,
          name: string | undefined,
          content: string | null | undefined,
          contentHash: string | null | undefined,
          metadata: any,
          analysisStatus: string | null | undefined,
          lastAnalyzed: Date | null | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // console.log(`${fnName}: starting with id: ` + JSON.stringify(id))

    // If id isn't specified, but the unique keys are, try to get the record
    if (id == null &&
        parentId != null &&
        name != null) {

      const intentCodeNode = await
              this.getByUniqueKey(
                prisma,
                parentId,
                name)

      if (intentCodeNode != null) {
        id = intentCodeNode.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (parentId == undefined) {
        console.error(`${fnName}: id is null and parentId is undefined`)
        throw 'Prisma error'
      }

      if (instanceId == null) {
        console.error(`${fnName}: id is null and instanceId is null`)
        throw 'Prisma error'
      }

      if (type == null) {
        console.error(`${fnName}: id is null and type is null`)
        throw 'Prisma error'
      }

      if (path == null) {
        console.error(`${fnName}: id is null and path is null`)
        throw 'Prisma error'
      }

      if (name == null) {
        console.error(`${fnName}: id is null and name is null`)
        throw 'Prisma error'
      }

      if (content == undefined) {
        console.error(`${fnName}: id is null and content is undefined`)
        throw 'Prisma error'
      }

      if (contentHash == undefined) {
        console.error(`${fnName}: id is null and contentHash is undefined`)
        throw 'Prisma error'
      }

      if (metadata == undefined) {
        console.error(`${fnName}: id is null and metadata is undefined`)
        throw 'Prisma error'
      }

      if (analysisStatus == undefined) {
        console.error(`${fnName}: id is null and analysisStatus is undefined`)
        throw 'Prisma error'
      }

      if (lastAnalyzed == undefined) {
        console.error(`${fnName}: id is null and lastAnalyzed is undefined`)
        throw 'Prisma error'
      }

      // Create
      return await
               this.create(
                 prisma,
                 parentId,
                 instanceId,
                 type,
                 path,
                 name,
                 content,
                 contentHash,
                 metadata,
                 analysisStatus,
                 lastAnalyzed)
    } else {

      // Update
      return await
               this.update(
                 prisma,
                 id,
                 parentId,
                 instanceId,
                 type,
                 path,
                 name,
                 content,
                 contentHash,
                 metadata,
                 analysisStatus,
                 lastAnalyzed)
    }
  }
}
