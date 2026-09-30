import fs from 'fs'
import path from 'path'

export class PathsService {

  // Consts
  clName = 'PathsService'

  // Code
  getEnginePath() {

    // The engine root is the one directory holding bundled/extensions next to
    // package.json. Rather than counting levels up from a module location,
    // walk up from each candidate seed and accept the first that really has
    // it. import.meta.dirname is the bundle's own directory, <engine>/dist,
    // one level below the root rather than the three the old code climbed,
    // so it is only ever a seed. process.cwd() is the other, for the case
    // where the bundle was moved away from its package.
    const marker = path.join('bundled', 'extensions')

    const seeds: string[] = [process.cwd()]

    if (import.meta.dirname != null) {
      seeds.push(import.meta.dirname)
    }

    for (const seed of seeds) {

      let cur = path.resolve(seed)

      while (true) {

        if (fs.existsSync(path.join(cur, marker))) {
          return cur
        }

        const parent = path.dirname(cur)

        if (parent === cur) {
          break
        }

        cur = parent
      }
    }

    // Not found (e.g. running against an unusual install layout). The cwd is
    // the engine root for `npm run cli`, so it is the best available guess.
    return process.cwd()
  }

  getBundledPath() {

    return path.join(this.getEnginePath(), 'bundled')
  }

  /** The directory the engine's own extensions are bundled in. */
  getBundledExtensionsPath() {

    return path.join(this.getBundledPath(), 'extensions')
  }

  /**
   * The example projects the `tests` command builds.
   *
   * They are development fixtures, not bundled content, so they sit beside the
   * engine in the repository rather than inside it, and are not published.
   */
  getExamplesPath() {

    return path.join(this.getEnginePath(), '..', 'examples')
  }
}
