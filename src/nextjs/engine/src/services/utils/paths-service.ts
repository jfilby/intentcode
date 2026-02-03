import path from 'path'

export class PathsService {

  // Consts
  clName = 'PathsService'

  // Code
  getEnginePath() {

    // Get the path of this file and go up to the engine root
    const enginePath = path.resolve(__dirname, '..', '..', '..')

    return enginePath
  }

  getBundledPath() {

    const enginePath = this.getEnginePath()
    const bundledPath = `${enginePath}/bundled`

    return bundledPath
  }
}
