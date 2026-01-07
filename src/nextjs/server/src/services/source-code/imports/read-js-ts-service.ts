import fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { ImportsData, JsTsSrcTypes } from './types'
import { ParseJsTsImportsService } from './parse-js-ts-service'

// Services
const parseJsTsImportsService = new ParseJsTsImportsService()
const walkDirService = new WalkDirService()

// Class
export class ReadJsTsSourceImportsService {

  // Consts
  clName = 'ReadJsTsSourceImportsService'

  // Code
  async enrichWithDepsGraph(
          prisma: PrismaClient,
          importsData: ImportsData) {

    ;
  }

  async processSrcFile(
          importsData: ImportsData,
          srcFilePath: string) {

    // Debug
    const fnName = `${this.clName}.processSrcFile()`

    console.log(`${fnName}: starting with srcFilePath: ${srcFilePath}`)

    // Parse for imports
    const results = await
            parseJsTsImportsService.parseImports(srcFilePath)

    // Debug
    console.log(`${fnName}: results: ` + JSON.stringify(results))
  }

  async run(prisma: PrismaClient,
            srcPath: string) {

    // ImportsData var
    const importsData: ImportsData = {
      dependencies: {}
    }

    // Read the src of each file
    await this.walkDir(
            importsData,
            srcPath)

    // Get min versions and any potentially missing imports from deps graph
    await this.enrichWithDepsGraph(
            prisma,
            importsData)

    // Return
    return importsData
  }

  async walkDir(
          importsData: ImportsData,
          srcPath: string) {

    // Read source files
    var fileList: string[] = []

    await walkDirService.walkDir(
            srcPath,
            fileList,
            {
              recursive: true,
              fileExts: JsTsSrcTypes.includeFileExts,
              ignoreDirs: JsTsSrcTypes.ignoredDirs,
              ignoreFilePatterns: JsTsSrcTypes.ignoredFilePatterns
            })

    // Process relevant files
    for (const file of fileList) {

      // Process src file
      await this.processSrcFile(
              importsData,
              file)
    }
  }
}
