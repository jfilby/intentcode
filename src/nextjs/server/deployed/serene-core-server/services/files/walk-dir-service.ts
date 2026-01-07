const fs = require('fs')
const path = require('path')
import { WalkDirConfig } from './types'

export class WalkDirService {

  // Consts
  clName = 'WalkDirService'

  // Code
  private normalizePath(p: string) {
    return path.resolve(p)
  }

  private isPathIgnored(
            fullPath: string,
            root: string,
            config: WalkDirConfig): boolean {

    // Validate
    if (config.ignoreDirs == null) {
      return false
    }

    // Is path ignored?
    const normalizedPath = this.normalizePath(fullPath)
    const relative = path.relative(root, normalizedPath)
    const segments = relative.split(path.sep)

    return segments.some((s: string) => config.ignoreDirs?.has(s))
  }

  private isFileIgnored(
            fullPath: string,
            root: string,
            config: WalkDirConfig): boolean {

    // Validate
    if (config.ignoreFilePatterns == null) {
      return false
    }

    // Is path ignored?
    if (this.isPathIgnored(
          fullPath,
          root,
          config)) return true

    const filename = path.basename(fullPath)

    return config.ignoreFilePatterns.some((re) => re.test(filename))
  }

  async walkDir(
          dir: string,
          fileList: string[] = [],
          config: WalkDirConfig,
          root?: string): Promise<string[]> {

    // Debug
    const fnName = `${this.clName}.walkDir()`

    // Init root
    if (root == null) {
      root = dir
    }

    // Ignore this path?
    const normalizedDir = this.normalizePath(dir)

    if (config.ignoreDirs != null) {

      if (this.isPathIgnored(
            normalizedDir,
            root,
            config)) return []
    }

    // Read the dir
    const files = await
            fs.promises.readdir(
              dir,
              { withFileTypes: true })

    // Walk files
    for (const file of files) {

      // Get filePath
      const filePath = path.join(dir, file.name)

      // If a directory, call this function (if recursive)
      if (file.isDirectory()) {

        // Directories
        if (config.recursive === true) {

          await this.walkDir(
                  filePath,
                  fileList,
                  config,
                  root)

          continue
        }

      }

      if (config.ignoreFilePatterns != null &&
          this.isFileIgnored(
              filePath,
              root,
              config)) {

        continue
      }

      // Files
      // In fileExts list?
      if (config.fileExts != null &&
          !config.fileExts.includes(path.extname(filePath))) {

        continue
      }

      // Add file to list
      fileList.push(filePath)
    }

    // Debug
    // console.log(`${fnName}: fileList: ${fileList.length}`)

    // Return file list
    return fileList
  }
}
