import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
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

  NODE_BUILTINS = new Set([
    'fs', 'path', 'crypto', 'stream', 'http', 'https', 'url',
    'util', 'events', 'os', 'child_process', 'buffer'
  ])

  // Code
  isNodeBuiltin(specifier: string): boolean {

    return specifier.startsWith('node:') ||
           this.NODE_BUILTINS.has(specifier.split('/')[0])
  }

  isInternalImport(specifier: string): boolean {

    return (
      specifier.startsWith('./') ||
      specifier.startsWith('../') ||
      specifier.startsWith('/') ||
      specifier.startsWith('@/') ||   // tsconfig paths
      specifier.startsWith('~') ||
      specifier.startsWith('#'))
  }

  isPackageDependency(specifier: string): boolean {

    return !this.isNodeBuiltin(specifier) &&
           !this.isInternalImport(specifier)
  }

  async processSrcFile(
          importsData: ImportsData,
          srcFilePath: string) {

    // Debug
    const fnName = `${this.clName}.processSrcFile()`

    console.log(`${fnName}: starting with srcFilePath: ${srcFilePath}`)

    // Parse for imports
    const importsResults = await
            parseJsTsImportsService.parseImports(srcFilePath)

    // Debug
    console.log(`${fnName}: importsResults: ` + JSON.stringify(importsResults))

    // Process imports
    for (const importResult of importsResults) {

      // Skip non-package dependencies
      if (!this.isPackageDependency(importResult.specifier)) {
        continue
      }

      // Add to imports (with minVersionNo unknown)
      importsData.dependencies[importResult.specifier] = '?'
    }
  }

  async run(prisma: PrismaClient,
            intentCodeProjectNode: SourceNode,
            srcPath: string) {

    // ImportsData var
    const importsData: ImportsData = {
      internalDependencies: {},
      dependencies: {}
    }

    // Read the src of each file
    await this.walkDir(
            importsData,
            srcPath)

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
