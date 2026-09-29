import fs from 'fs'
import path from 'path'
import { IntentError } from '@/core/errors.js'

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

    // The dirs part is a path relative to the project, so it has a leading
    // separator. Splitting it yields an empty first (and, for a file at the
    // project root, last) segment. Those are not directory names, and keeping
    // them stops the callers' dir walk from descending past the first real
    // segment, which flattens the whole tree into the project node.
    return dirsPath.split(path.sep).filter((dir) => dir.length > 0)
  }

  getFileExtension(filenamePath: string) {

    // Debug
    const fnName = `${this.clName}.getFileExtension()`

    // Validate
    if (filenamePath == null) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: 'filenamePath == null'
      })
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

    const stats = await fs.statSync(path)
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

  isPathWithin(
        fullPath: string,
        rootPath: string) {

    // Debug
    const fnName = `${this.clName}.isPathWithin()`

    // Validate
    if (rootPath == null ||
        rootPath.length === 0) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: 'rootPath == null'
      })
    }

    const root = path.resolve(rootPath)
    const full = path.resolve(fullPath)

    // path.relative() is '' for the root itself, a relative path when full is
    // inside the root, and starts with '..' when it escapes. A sibling that
    // merely shares a name prefix (e.g. /proj/intent-evil vs /proj/intent) is
    // reported as '..' here, which a raw startsWith() test would have missed.
    const rel = path.relative(root, full)

    // The root counts as within itself: looking up a project by its own root
    // path has to match.
    if (rel === '') {
      return true
    }

    if (rel === '..' ||
        rel.startsWith(`..${path.sep}`) ||
        path.isAbsolute(rel)) {

      return false
    }

    return true
  }

  resolvePathWithin(
        rootPath: string,
        relativePath: string) {

    // Debug
    const fnName = `${this.clName}.resolvePathWithin()`

    // Validate
    if (relativePath == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: 'relativePath == null'
      })
    }

    // path.join(), not path.resolve(relativePath): relativePath follows this
    // codebase's convention of carrying a leading separator, which
    // path.resolve() would read as an absolute path and discard the root.
    const fullPath = path.resolve(path.join(rootPath, relativePath))

    if (this.isPathWithin(fullPath, rootPath) === false) {

      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message:
          `path escapes root: ${relativePath} (root: ${rootPath})`
      })
    }

    // A delta must name something inside the root, not the root itself: a
    // relativePath that resolves back to the intent dir would otherwise be
    // written over as if it were a file.
    if (fullPath === path.resolve(rootPath)) {

      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message:
          `path is the root itself: ${relativePath} (root: ${rootPath})`
      })
    }

    return fullPath
  }

  async writeTextFile(
          fullPath: string,
          content: string,
          createMissingDirs: boolean = false) {

    if (createMissingDirs === true) {

      // Get dirs path
      const dirsPath = this.getDirectoriesPart(fullPath)

      // Create dirs path
      if (!await fs.existsSync(dirsPath)) {

        await fs.mkdirSync(dirsPath, { recursive: true })
      }
    }

    // Write file
    await fs.writeFileSync(fullPath, content, 'utf-8')
  }
}
