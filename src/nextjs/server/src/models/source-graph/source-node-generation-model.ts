import { PrismaClient } from '@prisma/client'

export class SourceNodeGenerationModel {

  // Consts
  clName = 'SourceNodeGenerationModel'

  // Code
  async create(
          prisma: PrismaClient,
          sourceNodeId: string,
          techId: string,
          temperature: number | null,
          prompt: string,
          promptHash: string) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.sourceNodeGeneration.create({
        data: {
          sourceNodeId: sourceNodeId,
          techId: techId,
          temperature: temperature,
          prompt: prompt,
          promptHash: promptHash
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
      return await prisma.sourceNodeGeneration.delete({
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
          techId: string | undefined = undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Query
    try {
      return await prisma.sourceNodeGeneration.findMany({
        where: {
          techId: techId
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
    var sourceNodeGeneration: any = null

    try {
      sourceNodeGeneration = await prisma.sourceNodeGeneration.findUnique({
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
    return sourceNodeGeneration
  }

  async getByUniqueKey(
          prisma: PrismaClient,
          sourceNodeId: string) {

    // Debug
    const fnName = `${this.clName}.getByUniqueKey()`

    // Validate
    if (sourceNodeId == null) {
      console.error(`${fnName}: sourceNodeId == null`)
      throw 'Validation error'
    }

    // Query
    var sourceNodeGeneration: any = null

    try {
      sourceNodeGeneration = await prisma.sourceNodeGeneration.findFirst({
        where: {
          sourceNodeId: sourceNodeId
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return
    return sourceNodeGeneration
  }

  async update(
          prisma: PrismaClient,
          id: string,
          sourceNodeId: string | undefined,
          techId: string | undefined,
          temperature: number | null | undefined,
          prompt: string | undefined,
          promptHash: string | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Update record
    try {
      return await prisma.sourceNodeGeneration.update({
        data: {
          sourceNodeId: sourceNodeId,
          techId: techId,
          temperature: temperature,
          prompt: prompt,
          promptHash: promptHash
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
          sourceNodeId: string | undefined,
          techId: string | undefined,
          temperature: number | null | undefined,
          prompt: string | undefined,
          promptHash: string | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // console.log(`${fnName}: starting with id: ` + JSON.stringify(id))

    // If id isn't specified, but the unique keys are, try to get the record
    if (id == null &&
        sourceNodeId != null) {

      const sourceNodeGeneration = await
              this.getByUniqueKey(
                prisma,
                sourceNodeId)

      if (sourceNodeGeneration != null) {
        id = sourceNodeGeneration.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (sourceNodeId == null) {
        console.error(`${fnName}: id is null and sourceNodeId is null`)
        throw 'Prisma error'
      }

      if (techId == null) {
        console.error(`${fnName}: id is null and techId is null`)
        throw 'Prisma error'
      }

      if (temperature === undefined) {
        console.error(`${fnName}: id is null and temperature is undefined`)
        throw 'Prisma error'
      }

      if (prompt == null) {
        console.error(`${fnName}: id is null and prompt is null`)
        throw 'Prisma error'
      }

      if (promptHash == null) {
        console.error(`${fnName}: id is null and promptHash is null`)
        throw 'Prisma error'
      }

      // Create
      return await
               this.create(
                 prisma,
                 sourceNodeId,
                 techId,
                 temperature,
                 prompt,
                 promptHash)
    } else {

      // Update
      return await
               this.update(
                 prisma,
                 id,
                 sourceNodeId,
                 techId,
                 temperature,
                 prompt,
                 promptHash)
    }
  }
}
