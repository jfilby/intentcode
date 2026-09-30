import path from 'path'
import { ServerOnlyTypes } from '@/types/server-only-types.js'

export class IntentCodeFilenameService {

  // Consts
  clName = 'IntentCodeFilenameService'

  // Code
  getTargetFileExt(filename: string): string | undefined {

    // IntentCode files are named <target>.<ext>.md, so the target extension is
    // the second-to-last dot-separated segment of the BASENAME. This used to
    // split the whole path, so any dot in a parent directory leaked into the
    // result: '/home/u/my.app/intent/index.ts.md' produced '.app/intent/index'
    // and the compiler was instructed to emit that as the target language.
    const parts = path.basename(filename).split('.')

    // Need <name>.<ext>.md to be present
    if (parts.length < 3) {
      return undefined
    }

    const fileExt = parts[parts.length - 2]

    if (fileExt.length === 0) {
      return undefined
    }

    return '.' + fileExt
  }

  /**
   * The source path an Intent file names, relative to the project: its own
   * path with the `.md` taken off.
   *
   * This is the mapping every other part of the engine agrees on — it is what
   * `DriftService` looks a record up under and what the compiler records
   * against — so it is stated once here rather than sliced out of a path at
   * each of those sites.
   */
  getSourceRelativePath(intentRelativePath: string): string {

    return intentRelativePath.slice(
      0,
      intentRelativePath.length - ServerOnlyTypes.dotMdFileExt.length)
  }
}
