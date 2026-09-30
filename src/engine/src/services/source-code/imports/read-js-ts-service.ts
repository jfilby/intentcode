import { walkDir } from '@/core/walk-dir.js'
import type { ProjectStore } from '@/core/store.js'
import type { SourceNodeRecord } from '@/core/records.js'
import { ImportsData, JsTsSrcTypes } from './types.js'
import { ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types.js'
import { ParseJsTsImportsService } from './parse-js-ts-service.js'

// Services
const parseJsTsImportsService = new ParseJsTsImportsService()

// Class
export class ReadJsTsSourceImportsService {

  // Consts
  clName = 'ReadJsTsSourceImportsService'

  invalidBuiltIns = new Set([
    'readline'
  ])

  nodeBuiltIns = new Set([
    'fs', 'path', 'crypto', 'stream', 'http', 'https', 'url',
    'util', 'events', 'os', 'child_process', 'buffer'
  ])

  // Code
  isNodeBuiltin(specifier: string): boolean {

    return specifier.startsWith('node:') ||
           this.invalidBuiltIns.has(specifier.split('/')[0]) ||
           this.nodeBuiltIns.has(specifier.split('/')[0])
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

    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {
      console.log(`${fnName}: starting with srcFilePath: ${srcFilePath}`)
    }

    // Parse for imports
    const importsResults = await
            parseJsTsImportsService.parseImports(srcFilePath)

    // Debug
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {
      console.log(`${fnName}: importsResults: ` + JSON.stringify(importsResults))
    }

    // Process imports
    for (const importResult of importsResults) {

      // Skip non-package dependencies
      if (!this.isPackageDependency(importResult.specifier)) {
        continue
      }

      // Add to imports (with latest version)
      importsData.dependencies[importResult.specifier] = 'latest'
    }
  }

  async run(store: ProjectStore,
            projectIntentCodeNode: SourceNodeRecord,
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
    const fileList: string[] = []

    await walkDir(
            srcPath,
            fileList,
            {
              recursive: true,
              fileExts: JsTsSrcTypes.includeFileExts,
              ignoreRegexs: [
                ...JsTsSrcTypes.ignoredDirRegexs,
                ...JsTsSrcTypes.ignoredFilePatterns
              ]
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
