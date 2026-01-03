const fs = require('fs')
const path = require('path')

export class WalkDirService {

  // Consts
  clName = 'WalkDirService'

  // Code
  async walkDir(
          dir: string,
          fileList: string[] = [],
          recursive: boolean = true,
          fileExts: string[] | undefined = undefined): Promise<any> {

    // Debug
    const fnName = `${this.clName}.walkDir()`

    // Read the dir
    var files = await fs.promises.readdir(dir)

    // Walk files
    for (const file of files) {

      // Stat the file
      const filePath = path.join(dir, file)
      const stat = await fs.promises.stat(filePath)

      // If a directory, call this function (if recursive)
      if (stat.isDirectory()) {

        // Directories
        if (recursive === true) {
          await this.walkDir(filePath, fileList)
        }

      } else {

        // Files
        // In fileExts list?
        if (fileExts != null &&
            !fileExts.includes(path.extname(filePath))) {

          continue
        }

        // Add file to list
        fileList.push(filePath)
      }
    }

    // Debug
    // console.log(`${fnName}: fileList: ${fileList.length}`)

    // Return file list
    return fileList
  }
}
