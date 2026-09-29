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
    // it. __dirname is absent when the sources are loaded as ESM, and in the
    // CJS bundle it sits at <engine>/dist, one level below the root rather
    // than the three the old code climbed, so it is only ever a seed.
    const marker = path.join('bundled', 'extensions')

    const seeds: string[] = [process.cwd()]

    if (typeof __dirname !== 'undefined') {
      seeds.push(__dirname)
    }

    for (const seed of seeds) {

      var cur = path.resolve(seed)

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
}
