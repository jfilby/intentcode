const fs = require('fs')
const path = require('path')

export class WalkDirService {

  // Consts
  clName = ''

  // Code
  async walkDir(
          dir: string,
          fileList: string[] = []): Promise<any> {

    // Debug
    const fnName = `${this.clName}.walkDir()`

    // Read the dir
    var files = await fs.promises.readdir(dir)

    // Walk files
    for (const file of files) {

      // Stat the file
      const filePath = path.join(dir, file)
      const stat = await fs.promises.stat(filePath)

      // If a directory, call this function
      if (stat.isDirectory()) {
        await this.walkDir(filePath, fileList)
      } else {
        fileList.push(filePath)
      }
    }

    // Debug
    // console.log(`${fnName}: fileList: ${fileList.length}`)

    // Return file list
    return fileList
  }
}
