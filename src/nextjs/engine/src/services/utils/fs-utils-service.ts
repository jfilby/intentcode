import fs from 'fs/promises'
import path from 'path'
import { CustomError } from '@/serene-core-server/types/errors'

export class FsUtilsService {

  // Consts
  clName = 'FsUtilsService'

  // Code
  concatPaths(
    part1: string,
    part2: string) {

    if (part1[part1.length - 1] !== path.sep) {

      part1 += path.sep
    }

    return part1 + part2
  }

  getDirectoriesPart(fullPath: string) {

    return path.dirname(fullPath)
  }

  getDirectoriesArray(dirsPath: string) {

    return dirsPath.split(path.sep)
  }

  getFileExtension(filenamePath: string) {

    // Debug
    const fnName = `${this.clName}.getFileExtension()`

    // Validate
    if (filenamePath == null) {

      throw new CustomError(`${fnName}: filenamePath == null`)
    }

    // Get the file extension
    var fileExt = path.extname(filenamePath)

    if (fileExt.length > 0 &&
        fileExt[0] === '.') {

      fileExt = fileExt.substring(1)
    }

    // Return
    return fileExt
  }

  getFilenamePart(fullPath: string) {

    return path.basename(fullPath)
  }

  getLastPathPart(fullPath: string) {

    const lastPathPart = fullPath.split(path.sep).pop()

    return lastPathPart
  }

  async getLastUpdateTime(path: string) {

    const stats = await fs.stat(path)
    return stats.mtime
  }

  getNameAndFileExtensionParts(filenamePath: string) {

    const fileExtensionPart = this.getFileExtension(filenamePath)

    var extLength = fileExtensionPart.length

    if (fileExtensionPart !== '') {
      extLength += 1
    }

    const namePart = filenamePath.substring(0, filenamePath.length - extLength)

    return {
      fileExtensionPart: fileExtensionPart,
      namePart: namePart
    }
  }

  getPathRoot(p = process.cwd()) {
    return path.parse(path.resolve(p)).root
  }

  getRelativePath(
    fullPath: string,
    basePath: string) {

    // Remove the base path
    var relativePath =
          fullPath.replace(
          basePath, '')

    // Note: don't removing the leading path separator. The convention is that
    // all instance paths have a leading separator.

    // Return
    return relativePath
  }

  async writeTextFile(
          fullPath: string,
          content: string,
          createMissingDirs: boolean = false) {

    if (createMissingDirs === true) {

      // Get dirs path
      const dirsPath = this.getDirectoriesPart(fullPath)

      // Create dirs path
      await fs.mkdir(dirsPath, { recursive: true })
    }

    // Write file
    await fs.writeFile(fullPath, content, 'utf-8')
  }
}
